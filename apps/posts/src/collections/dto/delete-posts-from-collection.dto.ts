import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class DeletePostsFromCollectionDto {
  @IsString({ each: true })
  @IsArray()
  @IsNotEmpty()
  postIds: string[];
}
