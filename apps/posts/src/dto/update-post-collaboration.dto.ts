import { postCollaboratorsStatusEnum } from '@repo/database';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class UpdatePostCollaborationDto {
  @IsEnum(postCollaboratorsStatusEnum.enumValues)
  @IsNotEmpty()
  status: (typeof postCollaboratorsStatusEnum.enumValues)[number];

  @IsString()
  @IsNotEmpty()
  postId: string;
}
