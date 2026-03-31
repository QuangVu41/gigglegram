import { IsNotEmpty, IsString } from 'class-validator';

export class FollowUserDto {
  @IsString()
  @IsNotEmpty()
  followingUserId: string;
}
