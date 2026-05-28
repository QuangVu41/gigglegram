import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateManyPostMediaModerationDto {
  @IsString({ each: true })
  ids!: string[];

  @IsEnum(['pending', 'approved', 'flagged'])
  moderationStatus!: 'pending' | 'approved' | 'flagged';

  @IsString()
  @IsOptional()
  moderationReason?: string;
}
