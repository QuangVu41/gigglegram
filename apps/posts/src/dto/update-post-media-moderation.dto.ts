import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdatePostMediaModerationDto {
  @IsEnum(['pending', 'approved', 'flagged'])
  moderationStatus!: 'pending' | 'approved' | 'flagged';

  @IsString()
  @IsOptional()
  moderationReason?: string;
}
