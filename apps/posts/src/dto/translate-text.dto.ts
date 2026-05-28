import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class TranslateTextDto {
  @IsNotEmpty()
  @IsString()
  text: string;

  @IsNotEmpty()
  @IsString()
  targetLang: string;

  @IsOptional()
  @IsString()
  sourceLang?: string;
}
