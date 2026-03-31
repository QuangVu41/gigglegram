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
import { PostReportsService } from '@/src/post-reports/post-reports.service';
import { FindManyPostReportsDto } from '@/src/post-reports/dto/find-many-post-reports.dto';
import { CreatePostReportDto } from '@/src/post-reports/dto/create-post-report.dto';
import { CurrentUser, Perms } from '@repo/common';
import { users } from '@repo/database';
import { UpdatePostReportDto } from '@/src/post-reports/dto/update-post-report.dto';
import { AssignReviewerDto } from '@/src/post-reports/dto/assign-reviewer.dto';
import { FindManyReasonsDto } from '@/src/post-reports/report-reasons/dto/find-many-reasons.dto';
import { CreateReportReasonDto } from '@/src/post-reports/report-reasons/dto/create-report-reason.dto';
import { UpdateReportReasonDto } from '@/src/post-reports/report-reasons/dto/update-report-reason.dto';

@Controller('reports')
export class PostReportsController {
  constructor(private readonly postReportsService: PostReportsService) {}

  @Get('reasons')
  async findManyReportReasons(@Query() findManyReasonsDto: FindManyReasonsDto) {
    return this.postReportsService.findManyReportReasons(findManyReasonsDto);
  }

  @Post('reasons')
  async createReason(@Body() createReportReasonDto: CreateReportReasonDto) {
    return this.postReportsService.createReason(createReportReasonDto);
  }

  @Get('reasons/{:reasonId}')
  async findReasonById(@Param('reasonId') reasonId: string) {
    return this.postReportsService.findReasonById(reasonId);
  }

  @Patch('reasons/{:reasonId}')
  async updateReason(
    @Param('reasonId') reasonId: string,
    @Body() updateReportReasonDto: UpdateReportReasonDto,
  ) {
    return this.postReportsService.updateReason(
      reasonId,
      updateReportReasonDto,
    );
  }

  @Delete('reasons/{:reasonId}')
  async deleteReason(@Param('reasonId') reasonId: string) {
    return this.postReportsService.deleteReason(reasonId);
  }

  @Get()
  async findManyPostReports(
    @Query() findManyPostReportsDto: FindManyPostReportsDto,
  ) {
    return this.postReportsService.findManyPostReports(findManyPostReportsDto);
  }

  @Get('{:reportId}')
  async findPostReportById(@Param() reportId: string) {
    return this.postReportsService.findPostReportById(reportId);
  }

  @Post()
  async createReport(
    @Body() createPostReportDto: CreatePostReportDto,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return this.postReportsService.createReport(createPostReportDto, user);
  }

  @Perms({ report: ['assign-reviewer'] })
  @Patch('{:reportId}/assign-reviewer')
  async assignReviewer(
    @Param() reportId: string,
    @Body() assignReviewerDto: AssignReviewerDto,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return this.postReportsService.assignReviewer(
      reportId,
      assignReviewerDto,
      user,
    );
  }

  @Patch('{:reportId}')
  async updateReport(
    @Param() reportId: string,
    @Body() updatePostReportDto: UpdatePostReportDto,
  ) {
    return this.postReportsService.updateReport(reportId, updatePostReportDto);
  }

  @Delete('{:reportId}')
  async deleteReport(@Param() reportId: string) {
    return this.postReportsService.deleteReport(reportId);
  }
}
