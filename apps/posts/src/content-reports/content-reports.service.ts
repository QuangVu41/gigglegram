import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ContentReportsRepository } from '@/src/content-reports/content-reports.repository';
import { ReportReasonsRepository } from '@/src/content-reports/report-reasons/report-reasons.repository';
import { CreateContentReportDto } from '@/src/content-reports/dto/create-content-report.dto';
import {
  DATABASE_CONNECTION,
  contentReports,
  contentReportsStatusEnum,
  posts,
  reportReasons,
  schema,
  stories,
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
import { UpdateContentReportDto } from '@/src/content-reports/dto/update-content-report.dto';
import { FindManyContentReportsDto } from '@/src/content-reports/dto/find-many-content-reports.dto';
import { and } from 'drizzle-orm';
import { gte } from 'drizzle-orm';
import { lte } from 'drizzle-orm';
import { AssignReviewerDto } from '@/src/content-reports/dto/assign-reviewer.dto';
import { CreateReportReasonDto } from '@/src/content-reports/report-reasons/dto/create-report-reason.dto';
import { desc } from 'drizzle-orm';
import { UpdateReportReasonDto } from '@/src/content-reports/report-reasons/dto/update-report-reason.dto';
import { FindManyReasonsDto } from '@/src/content-reports/report-reasons/dto/find-many-reasons.dto';
import { type ClientKafkaProxy } from '@nestjs/microservices';

@Injectable()
export class ContentReportsService {
  constructor(
    private readonly contentReportsRepository: ContentReportsRepository,
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

  async findManycontentReports(
    findManyContentReportsDto: FindManyContentReportsDto,
  ) {
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
    } = findManyContentReportsDto;

    return (
      await this.contentReportsRepository.findMany(
        {
          where: and(
            actionTaken && eq(contentReports.actionTaken, actionTaken),
            status && eq(contentReports.status, status),
            reportedFrom && gte(contentReports.reportedAt, reportedFrom),
            reportedTo && lte(contentReports.reportedAt, reportedTo),
            reviewedFrom && gte(contentReports.reviewedAt, reviewedFrom),
            reviewedTo && lte(contentReports.reviewedAt, reviewedTo),
            resolvedFrom && gte(contentReports.resolvedAt, resolvedFrom),
            resolvedTo && lte(contentReports.resolvedAt, resolvedTo),
            reasonId ? eq(reportReasons.id, reasonId) : undefined,
            reviewerId ? eq(contentReports.reviewedBy, reviewerId) : undefined,
          ),
          with: {
            reason: true,
            post: {
              with: {
                postMedia: true,
              },
            },
            story: true,
            reporter: true,
            reportedUser: true,
            reviewer: true,
          },
        },
        findManyContentReportsDto,
      )
    ).filter((report) =>
      categories ? categories.includes(report.reason.category) : true,
    );
  }

  async findPostReportById(reportId: string) {
    const postReport = await this.contentReportsRepository.findFirst({
      where: eq(contentReports.id, reportId),
      with: {
        reason: true,
        post: {
          with: {
            postMedia: true,
          },
        },
        story: true,
        reporter: true,
        reportedUser: true,
        reviewer: true,
      },
    });

    return postReport;
  }

  async createReport(
    createContentReportDto: CreateContentReportDto,
    user: typeof users.$inferSelect,
  ) {
    const { targetId, reasonId, type, additionalInfo, reportedUserId } =
      createContentReportDto;

    const existingReportReason = await this.reportReasonsRepository.findFirst({
      where: eq(reportReasons.id, reasonId),
    });

    if (!existingReportReason)
      throw new BadRequestException({
        code: SystemWideErrorCodes.NOT_FOUND,
        description: 'Report reason not found.',
      });

    let contentOwnerId: string;
    let postId: string | undefined;
    let storyId: string | undefined;

    if (type === 'post') {
      const existingPost = await this.db.query.posts.findFirst({
        where: eq(posts.id, targetId),
        columns: {
          userId: true,
        },
      });

      if (!existingPost)
        throw new BadRequestException({
          code: SystemWideErrorCodes.NOT_FOUND,
          description: 'Reported post not found.',
        });

      contentOwnerId = existingPost.userId;
      postId = targetId;
    } else if (type === 'story') {
      const existingStory = await this.db.query.stories.findFirst({
        where: eq(stories.id, targetId),
        columns: {
          userId: true,
        },
      });

      if (!existingStory)
        throw new BadRequestException({
          code: SystemWideErrorCodes.NOT_FOUND,
          description: 'Reported story not found.',
        });

      contentOwnerId = existingStory.userId;
      storyId = targetId;
    } else {
      throw new BadRequestException('Invalid report type');
    }

    if (contentOwnerId === user.id)
      throw new BadRequestException({
        code:
          type === 'post'
            ? SystemWideErrorCodes.CANNOT_REPORT_OWN_POST
            : SystemWideErrorCodes.CANNOT_REPORT_OWN_STORY,
      });

    return this.contentReportsRepository.create({
      reporterId: user.id,
      reportedUserId: reportedUserId || contentOwnerId,
      postId,
      storyId,
      reasonId,
      additionalInfo,
      type,
    });
  }

  async updateReport(
    reportId: string,
    UpdateContentReportDto: UpdateContentReportDto,
    user: typeof users.$inferSelect,
  ) {
    const existingReport = await this.contentReportsRepository.findFirst({
      where: eq(contentReports.id, reportId),
    });

    if (!existingReport)
      throw new BadRequestException({
        code: SystemWideErrorCodes.NOT_FOUND,
        description: 'Post report not found.',
      });

    const result = await this.contentReportsRepository.update(reportId, {
      actionTaken: UpdateContentReportDto.actionTaken,
      reviewerNotes: UpdateContentReportDto.reviewerNotes,
      reviewedAt: new Date(),
      resolvedAt:
        UpdateContentReportDto.status &&
        UpdateContentReportDto.status === contentReportsStatusEnum.enumValues[2]
          ? new Date()
          : undefined,
      status: UpdateContentReportDto.status,
    });

    if (UpdateContentReportDto.actionTaken) {
      this.kafkaClient.emit(
        POST_REPORTS_TOPIC_REPORT_UPDATED,
        new ReportUpdatedEvent(existingReport.id, user.id),
      );
    }

    return result;
  }

  async assignReviewer(
    reportId: string,
    assignReviewerDto: AssignReviewerDto,
    user: typeof users.$inferSelect,
  ) {
    const existingReport = await this.contentReportsRepository.findFirst({
      where: eq(contentReports.id, reportId),
    });

    if (!existingReport)
      throw new BadRequestException({
        code: SystemWideErrorCodes.NOT_FOUND,
        description: 'Post report not found.',
      });

    const result = await this.contentReportsRepository.update(reportId, {
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
    return this.contentReportsRepository.delete(reportId);
  }
}
