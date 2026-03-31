import { IsNotEmpty, IsString } from 'class-validator';

export class SavePostDto {
  @IsString()
  @IsNotEmpty()
  postId: string;
}
