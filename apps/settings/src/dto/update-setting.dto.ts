import { PartialType } from '@nestjs/swagger';
import { CreateSettingDto } from '@/src/dto/create-setting.dto';

export class UpdateSettingDto extends PartialType(CreateSettingDto) {}
