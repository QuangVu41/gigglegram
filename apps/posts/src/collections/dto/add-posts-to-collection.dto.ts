import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class AddPostsToCollectionDto {
  @IsString({ each: true })
  @IsArray()
  @IsNotEmpty()
  postIds: string[];
}
