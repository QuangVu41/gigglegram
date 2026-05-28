import { postUserTagsStatusEnum } from '@repo/database';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class UpdatePostUserTagStatusDto {
  @IsEnum(postUserTagsStatusEnum.enumValues)
  @IsNotEmpty()
  status: (typeof postUserTagsStatusEnum.enumValues)[number];

  @IsString()
  @IsNotEmpty()
  postId: string;
}
