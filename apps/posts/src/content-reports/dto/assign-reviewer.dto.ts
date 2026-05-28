import { IsNotEmpty, IsString } from 'class-validator';

export class AssignReviewerDto {
  @IsString()
  @IsNotEmpty()
  reviewerId: string;
}
