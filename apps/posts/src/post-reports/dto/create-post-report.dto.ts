import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePostReportDto {
  @IsString()
  @IsOptional()
  reportedUserId?: string;

  @IsString()
  @IsNotEmpty()
  postId: string;

  @IsString()
  @IsNotEmpty()
  reasonId: string;

  @IsOptional()
  @IsString()
  additionalInfo?: string;
}
