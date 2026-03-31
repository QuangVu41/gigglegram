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
import { eq } from 'drizzle-orm';
import { like } from 'drizzle-orm';
import { or } from 'drizzle-orm';
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
    const conditions: SQL[] = [];

    if (findManySettingDto.key) {
      conditions.push(eq(systemSettings.key, findManySettingDto.key));
    }
    if (findManySettingDto.prefixes && findManySettingDto.prefixes.length > 0) {
      conditions.push(
        ...findManySettingDto.prefixes.map((prefix) =>
          like(systemSettings.key, `${prefix}%`),
        ),
      );
    }

    return await this.settingsRepository.findMany(
      {
        where: conditions.length > 0 ? or(...conditions) : undefined,
      },
      findManySettingDto,
    );
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
