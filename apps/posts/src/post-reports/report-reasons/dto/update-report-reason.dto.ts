import { PartialType } from '@nestjs/swagger';
import { CreateReportReasonDto } from '@/src/post-reports/report-reasons/dto/create-report-reason.dto';

export class UpdateReportReasonDto extends PartialType(CreateReportReasonDto) {}
