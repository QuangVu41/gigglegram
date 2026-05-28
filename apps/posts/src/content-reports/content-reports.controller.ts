import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ContentReportsService } from '@/src/content-reports/content-reports.service';
import { FindManyContentReportsDto } from '@/src/content-reports/dto/find-many-content-reports.dto';
import { CreateContentReportDto } from '@/src/content-reports/dto/create-content-report.dto';
import { CurrentUser, Perms } from '@repo/common';
import { users } from '@repo/database';
import { UpdateContentReportDto } from '@/src/content-reports/dto/update-content-report.dto';
import { AssignReviewerDto } from '@/src/content-reports/dto/assign-reviewer.dto';
import { FindManyReasonsDto } from '@/src/content-reports/report-reasons/dto/find-many-reasons.dto';
import { CreateReportReasonDto } from '@/src/content-reports/report-reasons/dto/create-report-reason.dto';
import { UpdateReportReasonDto } from '@/src/content-reports/report-reasons/dto/update-report-reason.dto';

@Controller('reports')
export class ContentReportsController {
  constructor(private readonly contentReportsService: ContentReportsService) {}

  @Get('reasons')
  async findManyReportReasons(@Query() findManyReasonsDto: FindManyReasonsDto) {
    return this.contentReportsService.findManyReportReasons(findManyReasonsDto);
  }

  @Post('reasons')
  async createReason(@Body() createReportReasonDto: CreateReportReasonDto) {
    return this.contentReportsService.createReason(createReportReasonDto);
  }

  @Get('reasons/{:reasonId}')
  async findReasonById(@Param('reasonId') reasonId: string) {
    return this.contentReportsService.findReasonById(reasonId);
  }

  @Patch('reasons/{:reasonId}')
  async updateReason(
    @Param('reasonId') reasonId: string,
    @Body() updateReportReasonDto: UpdateReportReasonDto,
  ) {
    return this.contentReportsService.updateReason(
      reasonId,
      updateReportReasonDto,
    );
  }

  @Delete('reasons/{:reasonId}')
  async deleteReason(@Param('reasonId') reasonId: string) {
    return this.contentReportsService.deleteReason(reasonId);
  }

  @Get()
  async findManycontentReports(
    @Query() findManyContentReportsDto: FindManyContentReportsDto,
  ) {
    return this.contentReportsService.findManycontentReports(
      findManyContentReportsDto,
    );
  }

  @Get('{:reportId}')
  async findPostReportById(@Param('reportId') reportId: string) {
    return this.contentReportsService.findPostReportById(reportId);
  }

  @Post()
  async createReport(
    @Body() createContentReportDto: CreateContentReportDto,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return this.contentReportsService.createReport(
      createContentReportDto,
      user,
    );
  }

  @Perms({ report: ['assign-reviewer'] })
  @Patch('{:reportId}/assign-reviewer')
  async assignReviewer(
    @Param('reportId') reportId: string,
    @Body() assignReviewerDto: AssignReviewerDto,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return this.contentReportsService.assignReviewer(
      reportId,
      assignReviewerDto,
      user,
    );
  }

  @Patch('{:reportId}')
  async updateReport(
    @Param('reportId') reportId: string,
    @Body() updateContentReportDto: UpdateContentReportDto,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return this.contentReportsService.updateReport(
      reportId,
      updateContentReportDto,
      user,
    );
  }

  @Delete('{:reportId}')
  async deleteReport(@Param('reportId') reportId: string) {
    return this.contentReportsService.deleteReport(reportId);
  }
}
