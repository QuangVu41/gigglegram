import { IsNotEmpty, IsString } from 'class-validator';

export class LikeAPostDto {
  @IsString()
  @IsNotEmpty()
  postId: string;

  @IsString()
  @IsNotEmpty()
  userId: string;
}
