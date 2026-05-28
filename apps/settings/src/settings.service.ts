import {
  DATABASE_CONNECTION,
  schema,
  systemSettings,
  systemSettingsTypeEnum,
} from '@repo/database';
import { Metadata } from '@grpc/grpc-js';
import { Inject, Injectable } from '@nestjs/common';
import {
  SettingPrefix,
  SettingKey,
  SettingValue,
  SystemSettingsResponse,
} from '@repo/types';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, eq, or, like, count, inArray } from 'drizzle-orm';
import { SettingsRepository } from '@/src/settings.repository';
import { CreateSettingDto } from '@/src/dto/create-setting.dto';
import { UpdateSettingDto } from '@/src/dto/update-setting.dto';
import { FindManySettingsDto } from '@/src/dto/find-many-settings.dto';
import { SQL } from 'drizzle-orm';

@Injectable()
export class SettingsService {
  private readonly cache = new Map<
    string,
    SettingValue | SystemSettingsResponse
  >();

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly settingsRepository: SettingsRepository,
  ) {}

  async findSettingByKey(settingKey: SettingKey, metadata: Metadata) {
    const defaultValue: SettingValue = { stringValue: undefined };
    if (this.cache.has(settingKey.key))
      return (this.cache.get(settingKey.key) as SettingValue) || defaultValue;

    const setting = await this.db.query.systemSettings.findFirst({
      where: eq(systemSettings.key, settingKey.key),
      columns: {
        key: true,
        value: true,
        type: true,
      },
    });

    if (!setting) return defaultValue;

    const value = this.castValue(setting.value, setting.type);

    this.cache.set(settingKey.key, value);

    return value;
  }

  async findSettingsByPrefix(settingPrefix: SettingPrefix, metadata: Metadata) {
    if (this.cache.has(settingPrefix.prefixes.join(':')))
      return this.cache.get(
        settingPrefix.prefixes.join(':'),
      ) as SystemSettingsResponse;

    const conditions = settingPrefix.prefixes.map((prefix) =>
      like(systemSettings.key, `${prefix}%`),
    );
    const settings = await this.db.query.systemSettings.findMany({
      where: or(...conditions),
    });

    const response: SystemSettingsResponse = { settings: {} };

    settings.forEach((setting) => {
      response.settings[setting.key] = this.castValue(
        setting.value,
        setting.type,
      );
    });

    this.cache.set(settingPrefix.prefixes.join(':'), response);

    return response;
  }

  async createSetting(createSettingDto: CreateSettingDto) {
    return await this.settingsRepository.create(createSettingDto);
  }

  async findSettingById(settingId: string) {
    return await this.settingsRepository.findFirst({
      where: eq(systemSettings.id, settingId),
    });
  }

  async findManySettings(findManySettingDto: FindManySettingsDto) {
    const whereConditions: any[] = [];

    if (findManySettingDto.prefixes && findManySettingDto.prefixes.length > 0) {
      whereConditions.push(
        or(
          ...findManySettingDto.prefixes.map((prefix) =>
            like(systemSettings.key, `${prefix}%`),
          ),
        ),
      );
    }

    if (findManySettingDto.key) {
      whereConditions.push(eq(systemSettings.key, findManySettingDto.key));
    }

    if (findManySettingDto.keyword) {
      whereConditions.push(
        or(
          like(systemSettings.key, `%${findManySettingDto.keyword}%`),
          like(systemSettings.description, `%${findManySettingDto.keyword}%`),
        ),
      );
    }

    if (findManySettingDto.type && findManySettingDto.type !== 'all') {
      whereConditions.push(
        eq(
          systemSettings.type,
          findManySettingDto.type as (typeof systemSettingsTypeEnum.enumValues)[number],
        ),
      );
    }

    if (
      findManySettingDto.isPublic !== undefined &&
      findManySettingDto.isPublic !== 'all'
    ) {
      const isPublicBool =
        findManySettingDto.isPublic === 'true' ||
        findManySettingDto.isPublic === true;
      whereConditions.push(eq(systemSettings.isPublic, isPublicBool));
    }

    const where =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;

    return await this.settingsRepository.findMany(
      {
        where,
      },
      findManySettingDto,
    );
  }

  async getSettingsStats() {
    const [totalRes, publicRes, privateRes, typesRes] = await Promise.all([
      this.db
        .select({ count: count() })
        .from(systemSettings)
        .then((res) => res[0]?.count ?? 0),
      this.db
        .select({ count: count() })
        .from(systemSettings)
        .where(eq(systemSettings.isPublic, true))
        .then((res) => res[0]?.count ?? 0),
      this.db
        .select({ count: count() })
        .from(systemSettings)
        .where(eq(systemSettings.isPublic, false))
        .then((res) => res[0]?.count ?? 0),
      this.db
        .select({
          type: systemSettings.type,
          count: count(),
        })
        .from(systemSettings)
        .groupBy(systemSettings.type),
    ]);

    const typesMix = {
      string: 0,
      int: 0,
      float: 0,
      bool: 0,
      json: 0,
    };

    typesRes.forEach((item) => {
      if (item.type in typesMix) {
        typesMix[item.type as keyof typeof typesMix] = Number(item.count);
      }
    });

    return {
      totalSettings: Number(totalRes),
      publicSettings: Number(publicRes),
      privateSettings: Number(privateRes),
      typesMix,
    };
  }

  async deleteManySettings(ids: string[]) {
    if (!ids || ids.length === 0) return [];

    const deletedSettings = await this.db
      .delete(systemSettings)
      .where(inArray(systemSettings.id, ids))
      .returning();

    deletedSettings.forEach((setting) => {
      this.cache.forEach((_, key) => {
        if (
          key.includes(setting.key) ||
          key.includes(setting.key.split('.')[0]!)
        )
          this.cache.delete(key);
      });
    });

    return deletedSettings;
  }

  async updateSetting(settingId: string, updateSettingDto: UpdateSettingDto) {
    const updatedRow = await this.settingsRepository.update(
      settingId,
      updateSettingDto,
    );

    if (updatedRow) {
      this.cache.forEach((_, key) => {
        if (
          key.includes(updatedRow.key) ||
          key.includes(updatedRow.key.split('.')[0]!)
        )
          this.cache.delete(key);
      });
    }

    return updatedRow;
  }

  async deleteSetting(settingId: string) {
    const deletedRow = await this.settingsRepository.delete(settingId);

    if (deletedRow) {
      this.cache.forEach((_, key) => {
        if (
          key.includes(deletedRow.key) ||
          key.includes(deletedRow.key.split('.')[0]!)
        )
          this.cache.delete(key);
      });

      return deletedRow;
    }
  }

  private castValue(
    value: string,
    type: (typeof systemSettingsTypeEnum.enumValues)[number],
  ): SettingValue {
    switch (type) {
      case systemSettingsTypeEnum.enumValues[0]:
        return {
          stringValue: value,
        };
      case systemSettingsTypeEnum.enumValues[1]:
        return {
          intValue: parseInt(value, 10),
        };
      case systemSettingsTypeEnum.enumValues[2]:
        return {
          floatValue: parseFloat(value),
        };
      case systemSettingsTypeEnum.enumValues[3]:
        return {
          boolValue: value === 'true',
        };
      case systemSettingsTypeEnum.enumValues[4]:
        return {
          jsonValue: value,
        };
      default:
        return {
          stringValue: value,
        };
    }
  }
}
