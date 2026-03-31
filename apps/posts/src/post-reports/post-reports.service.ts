import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PostReportsRepository } from '@/src/post-reports/post-reports.repository';
import { ReportReasonsRepository } from '@/src/post-reports/report-reasons/report-reasons.repository';
import { CreatePostReportDto } from './dto/create-post-report.dto';
import {
  DATABASE_CONNECTION,
  postReports,
  postReportsStatusEnum,
  posts,
  reportReasons,
  schema,
  users,
} from '@repo/database';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import {
  KAFKA_SERVICE_NAME,
  POST_REPORTS_TOPIC_REPORT_UPDATED,
  POST_REPORTS_TOPIC_REVIEWER_ASSIGNED,
  ReportUpdatedEvent,
  ReviewerAssignedEvent,
  SystemWideErrorCodes,
} from '@repo/types';
import { UpdatePostReportDto } from '@/src/post-reports/dto/update-post-report.dto';
import { FindManyPostReportsDto } from '@/src/post-reports/dto/find-many-post-reports.dto';
import { and } from 'drizzle-orm';
import { gte } from 'drizzle-orm';
import { lte } from 'drizzle-orm';
import { AssignReviewerDto } from '@/src/post-reports/dto/assign-reviewer.dto';
import { CreateReportReasonDto } from '@/src/post-reports/report-reasons/dto/create-report-reason.dto';
import { desc } from 'drizzle-orm';
import { UpdateReportReasonDto } from '@/src/post-reports/report-reasons/dto/update-report-reason.dto';
import { FindManyReasonsDto } from '@/src/post-reports/report-reasons/dto/find-many-reasons.dto';
import { type ClientKafkaProxy } from '@nestjs/microservices';

@Injectable()
export class PostReportsService {
  constructor(
    private readonly postReportsRepository: PostReportsRepository,
    private readonly reportReasonsRepository: ReportReasonsRepository,
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    @Inject(KAFKA_SERVICE_NAME)
    private readonly kafkaClient: ClientKafkaProxy,
  ) {}

  async findManyReportReasons(findManyReasonsDto: FindManyReasonsDto) {
    const { category, reasonCode } = findManyReasonsDto;

    return this.reportReasonsRepository.findMany(
      {
        where: and(
          category ? eq(reportReasons.category, category) : undefined,
          reasonCode ? eq(reportReasons.reasonCode, reasonCode) : undefined,
        ),
      },
      findManyReasonsDto,
    );
  }

  async findReasonById(reasonId: string) {
    const reason = await this.reportReasonsRepository.findFirst({
      where: eq(reportReasons.id, reasonId),
    });

    return reason;
  }

  async createReason(createReportReasonDto: CreateReportReasonDto) {
    const [latestReasonCategory, latestReason] = await Promise.all([
      this.reportReasonsRepository.findFirst({
        where: eq(reportReasons.category, createReportReasonDto.category),
        orderBy: desc(reportReasons.displayOrder),
        columns: {
          displayOrder: true,
          category: true,
        },
      }),
      this.reportReasonsRepository.findFirst({
        orderBy: desc(reportReasons.displayOrder),
        columns: {
          displayOrder: true,
        },
      }),
    ]);

    if (
      latestReasonCategory &&
      latestReasonCategory.category === createReportReasonDto.category
    ) {
      return this.reportReasonsRepository.create({
        category: createReportReasonDto.category,
        description: createReportReasonDto.description,
        reasonCode: createReportReasonDto.reasonCode,
        isActive: createReportReasonDto.isActive,
        displayOrder: (
          Number(latestReasonCategory.displayOrder) + 0.1
        ).toString(),
      });
    } else {
      return this.reportReasonsRepository.create({
        category: createReportReasonDto.category,
        description: createReportReasonDto.description,
        reasonCode: createReportReasonDto.reasonCode,
        isActive: createReportReasonDto.isActive,
        displayOrder: latestReason
          ? (Math.floor(Number(latestReason.displayOrder)) + 1.1).toString()
          : '1.1',
      });
    }
  }

  async updateReason(
    reasonId: string,
    updateReportReasonDto: UpdateReportReasonDto,
  ) {
    const existingReason = await this.reportReasonsRepository.findFirst({
      where: eq(reportReasons.id, reasonId),
    });

    if (!existingReason)
      throw new BadRequestException({
        code: SystemWideErrorCodes.NOT_FOUND,
        description: 'Report reason not found.',
      });

    return this.reportReasonsRepository.update(reasonId, {
      category: updateReportReasonDto.category,
      description: updateReportReasonDto.description,
      reasonCode: updateReportReasonDto.reasonCode,
      isActive: updateReportReasonDto.isActive,
    });
  }

  async deleteReason(reasonId: string) {
    return this.reportReasonsRepository.delete(reasonId);
  }

  async findManyPostReports(findManyPostReportsDto: FindManyPostReportsDto) {
    const {
      categories,
      actionTaken,
      status,
      reasonId,
      reportedFrom,
      reportedTo,
      reviewedFrom,
      reviewedTo,
      resolvedFrom,
      resolvedTo,
      reviewerId,
    } = findManyPostReportsDto;

    return (
      await this.postReportsRepository.findMany(
        {
          where: and(
            actionTaken && eq(postReports.actionTaken, actionTaken),
            status && eq(postReports.status, status),
            reportedFrom && gte(postReports.reportedAt, reportedFrom),
            reportedTo && lte(postReports.reportedAt, reportedTo),
            reviewedFrom && gte(postReports.reviewedAt, reviewedFrom),
            reviewedTo && lte(postReports.reviewedAt, reviewedTo),
            resolvedFrom && gte(postReports.resolvedAt, resolvedFrom),
            resolvedTo && lte(postReports.resolvedAt, resolvedTo),
            reasonId ? eq(reportReasons.id, reasonId) : undefined,
            reviewerId ? eq(postReports.reviewedBy, reviewerId) : undefined,
          ),
          with: {
            reason: true,
            post: {
              with: {
                postMedia: true,
              },
            },
            reporter: true,
            reportedUser: true,
            reviewer: true,
          },
        },
        findManyPostReportsDto,
      )
    ).filter((report) =>
      categories ? categories.includes(report.reason.category) : true,
    );
  }

  async findPostReportById(reportId: string) {
    const postReport = await this.postReportsRepository.findFirst({
      where: eq(postReports.id, reportId),
      with: {
        reason: true,
        post: {
          with: {
            postMedia: true,
          },
        },
        reporter: true,
        reportedUser: true,
        reviewer: true,
      },
    });

    return postReport;
  }

  async createReport(
    createPostReportDto: CreatePostReportDto,
    user: typeof users.$inferSelect,
  ) {
    const [existingPost, existingReportReason] = await Promise.all([
      this.db.query.posts.findFirst({
        where: eq(posts.id, createPostReportDto.postId),
        with: {
          user: {
            columns: {
              id: true,
            },
          },
        },
      }),
      this.reportReasonsRepository.findFirst({
        where: eq(reportReasons.id, createPostReportDto.reasonId),
      }),
    ]);

    if (!existingPost)
      throw new BadRequestException({
        code: SystemWideErrorCodes.NOT_FOUND,
        description: 'Reported post not found.',
      });

    if (!existingReportReason)
      throw new BadRequestException({
        code: SystemWideErrorCodes.NOT_FOUND,
        description: 'Report reason not found.',
      });

    if (existingPost.user.id === user.id)
      throw new BadRequestException({
        code: SystemWideErrorCodes.CANNOT_REPORT_OWN_POST,
      });

    return this.postReportsRepository.create({
      reporterId: user.id,
      reportedUserId:
        createPostReportDto.reportedUserId || existingPost.user.id,
      postId: createPostReportDto.postId,
      reasonId: createPostReportDto.reasonId,
      additionalInfo: createPostReportDto.additionalInfo,
    });
  }

  async updateReport(
    reportId: string,
    updatePostReportDto: UpdatePostReportDto,
  ) {
    const existingReport = await this.postReportsRepository.findFirst({
      where: eq(postReports.id, reportId),
    });

    if (!existingReport)
      throw new BadRequestException({
        code: SystemWideErrorCodes.NOT_FOUND,
        description: 'Post report not found.',
      });

    const result = await this.postReportsRepository.update(reportId, {
      actionTaken: updatePostReportDto.actionTaken,
      reviewerNotes: updatePostReportDto.reviewerNotes,
      reviewedAt: new Date(),
      resolvedAt:
        updatePostReportDto.status &&
        updatePostReportDto.status === postReportsStatusEnum.enumName[2]
          ? new Date()
          : undefined,
      status: updatePostReportDto.status,
    });

    if (updatePostReportDto.actionTaken) {
      this.kafkaClient.emit(
        POST_REPORTS_TOPIC_REPORT_UPDATED,
        new ReportUpdatedEvent(existingReport.id),
      );
    }

    return result;
  }

  async assignReviewer(
    reportId: string,
    assignReviewerDto: AssignReviewerDto,
    user: typeof users.$inferSelect,
  ) {
    const existingReport = await this.postReportsRepository.findFirst({
      where: eq(postReports.id, reportId),
    });

    if (!existingReport)
      throw new BadRequestException({
        code: SystemWideErrorCodes.NOT_FOUND,
        description: 'Post report not found.',
      });

    const result = await this.postReportsRepository.update(reportId, {
      reviewedBy: assignReviewerDto.reviewerId,
    });

    this.kafkaClient.emit(
      POST_REPORTS_TOPIC_REVIEWER_ASSIGNED,
      new ReviewerAssignedEvent(
        existingReport.id,
        user.id,
        assignReviewerDto.reviewerId,
      ),
    );

    return result;
  }

  async deleteReport(reportId: string) {
    return this.postReportsRepository.delete(reportId);
  }
}
