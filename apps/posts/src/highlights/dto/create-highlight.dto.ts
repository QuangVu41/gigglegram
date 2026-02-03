import { IsNotEmpty, IsString } from 'class-validator';

export class CreateHighlightDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  coverStoryId: string;

  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  storyIds: string[];
}
