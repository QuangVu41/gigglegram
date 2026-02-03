import { Metadata } from '@grpc/grpc-js';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  SettingPrefix,
  SettingKey,
  SystemSettingsServiceController,
  SystemSettingsServiceControllerMethods,
} from '@repo/types';
import { SettingsService } from '@/src/settings.service';
import { CreateSettingDto } from '@/src/dto/create-setting.dto';
import { UpdateSettingDto } from '@/src/dto/update-setting.dto';
import { FilterSettingsDto } from '@/src/dto/filter-settings.dto';
import { PermGuard, Perms } from '@repo/common';

@UseGuards(PermGuard)
@Controller()
@SystemSettingsServiceControllerMethods()
export class SettingsController implements SystemSettingsServiceController {
  constructor(private readonly settingsService: SettingsService) {}

  async findSettingByKey(settingKey: SettingKey, metadata: Metadata) {
    return await this.settingsService.findSettingByKey(settingKey, metadata);
  }

  async findSettingsByPrefix(settingPrefix: SettingPrefix, metadata: Metadata) {
    return this.settingsService.findSettingsByPrefix(settingPrefix, metadata);
  }

  @Perms({ setting: ['create'] })
  @Post()
  async createSetting(@Body() createSettingDto: CreateSettingDto) {
    return await this.settingsService.createSetting(createSettingDto);
  }

  @Get('{:settingId}')
  async findSettingById(@Param('settingId') settingId: string) {
    return await this.settingsService.findSettingById(settingId);
  }

  @Get()
  async findManySettings(@Query() filtersSettingDto: FilterSettingsDto) {
    return await this.settingsService.findManySettings(filtersSettingDto);
  }

  @Perms({ setting: ['update'] })
  @Patch('{:settingId}')
  async updateSetting(
    @Param('settingId') settingId: string,
    @Body() updateSettingDto: UpdateSettingDto,
  ) {
    return await this.settingsService.updateSetting(
      settingId,
      updateSettingDto,
    );
  }

  @Perms({ setting: ['delete'] })
  @Delete('{:settingId}')
  async deleteSetting(@Param('settingId') settingId: string) {
    return await this.settingsService.deleteSetting(settingId);
  }
}
