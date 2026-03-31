import { followersStatusEnum } from '@repo/database';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class UpdateUserFollowStatusDto {
  @IsEnum(followersStatusEnum.enumValues)
  @IsNotEmpty()
  status: (typeof followersStatusEnum.enumValues)[number];

  @IsString()
  @IsNotEmpty()
  followerId: string;
}
