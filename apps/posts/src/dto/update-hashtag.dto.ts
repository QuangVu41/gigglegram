import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class UpdateHashtagDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9_#]+$/, {
    message: 'Hashtag name can only contain letters, numbers, underscores, and an optional leading hash symbol',
  })
  name: string;
}
