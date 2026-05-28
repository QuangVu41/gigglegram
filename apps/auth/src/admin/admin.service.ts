import {
  comments,
  DATABASE_CONNECTION,
  likes,
  contentReports,
  posts,
  savedPosts,
  schema,
  stories,
  users,
} from '@repo/database';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, desc, gte, lte, sql, type SQL } from 'drizzle-orm';
import { DateRangeQueryDto } from '@/src/admin/dto/date-range-query.dto';
import { KAFKA_SERVICE_NAME, LagLevel, TrendEnum } from '@repo/types';
import { SystemWideErrorCodes, KAFKA_LAG_CONFIG } from '@repo/types';
import { UploadService } from '@repo/common';
import { type ClientKafkaProxy } from '@nestjs/microservices';
import { Kafka } from 'kafkajs';

@Injectable()
export class AdminService {
  private static readonly DEFAULT_RANGE_DAYS = 30;
  private static readonly DAILY_WINDOW_MS = 24 * 60 * 60 * 1000;
  private static readonly HOURLY_WINDOW_MS = 60 * 60 * 1000;
  private static readonly LAST_30_DAYS_BUCKETS = 30;

  // ── Static Utilities ───────────────────────────────────

  private static round2(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private static safeRatio(numerator: number, denominator: number): number {
    return denominator === 0 ? 0 : numerator / denominator;
  }

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly uploadService: UploadService,
    @Inject(KAFKA_SERVICE_NAME)
    private readonly kafkaClient: ClientKafkaProxy,
  ) {}

  /** DAU/MAU stickiness ratio with period-over-period comparison. */
  async getActiveUsersStats(dateRangeQueryDto: DateRangeQueryDto) {
    const { from, to } = this.resolveDateRange(
      dateRangeQueryDto,
      (rangeTo) =>
        new Date(
          rangeTo.getTime() -
            AdminService.DEFAULT_RANGE_DAYS * AdminService.DAILY_WINDOW_MS,
        ),
    );

    const previousPeriod = from
      ? this.buildPreviousPeriod(from, to)
      : { previousFrom: undefined, previousTo: undefined };
    const { previousFrom, previousTo } = previousPeriod;

    const dailyFrom = new Date(
      from
        ? Math.max(from.getTime(), to.getTime() - AdminService.DAILY_WINDOW_MS)
        : to.getTime() - AdminService.DAILY_WINDOW_MS,
    );

    const previousDailyFrom =
      previousFrom && previousTo
        ? new Date(
            Math.max(
              previousFrom.getTime(),
              previousTo.getTime() - AdminService.DAILY_WINDOW_MS,
            ),
          )
        : undefined;

    const [
      dailyActiveUsers,
      monthlyActiveUsers,
      previousDailyActiveUsers,
      previousMonthlyActiveUsers,
    ] = await Promise.all([
      this.countUsersActiveBetween(dailyFrom, to),
      this.countUsersActiveBetween(from, to),
      previousDailyFrom && previousTo
        ? this.countUsersActiveBetween(previousDailyFrom, previousTo)
        : Promise.resolve(0),
      previousFrom && previousTo
        ? this.countUsersActiveBetween(previousFrom, previousTo)
        : Promise.resolve(0),
    ]);

    const stickinessRatio = AdminService.safeRatio(
      dailyActiveUsers,
      monthlyActiveUsers,
    );
    const previousStickinessRatio = AdminService.safeRatio(
      previousDailyActiveUsers,
      previousMonthlyActiveUsers,
    );
    const stickinessPercentage = AdminService.round2(stickinessRatio * 100);
    const previousStickinessPercentage = AdminService.round2(
      previousStickinessRatio * 100,
    );
    const { change: stickinessPercentageChange, trend } = this.computeChange(
      stickinessPercentage,
      previousStickinessPercentage,
    );

    return {
      from: from ?? null,
      to,
      dailyFrom,
      previousFrom: previousFrom ?? null,
      previousTo: previousTo ?? null,
      dailyActiveUsers,
      monthlyActiveUsers,
      stickinessRatio,
      stickinessPercentage,
      previousDailyActiveUsers,
      previousMonthlyActiveUsers,
      previousStickinessRatio,
      previousStickinessPercentage,
      stickinessPercentageChange,
      trend,
    };
  }

  /** Aggregate user counts by verification/ban status. */
  async getTotalUsersStats(dateRangeQueryDto: DateRangeQueryDto) {
    const { from, to } = this.resolveDateRange(
      dateRangeQueryDto,
      (rangeTo) =>
        new Date(
          rangeTo.getTime() -
            AdminService.DEFAULT_RANGE_DAYS * AdminService.DAILY_WINDOW_MS,
        ),
    );

    const previousPeriod = from
      ? this.buildPreviousPeriod(from, to)
      : { previousFrom: undefined, previousTo: undefined };
    const { previousFrom, previousTo } = previousPeriod;

    // Current totals (global snapshot)
    const [result] = await this.db
      .select({
        totalUsers: sql<number>`count(*)::int`,
        activeUsers: sql<number>`coalesce(sum(case when ${users.emailVerified} = true and coalesce(${users.banned}, false) = false then 1 else 0 end), 0)::int`,
        pendingOrBannedUsers: sql<number>`coalesce(sum(case when ${users.emailVerified} = false or coalesce(${users.banned}, false) = true then 1 else 0 end), 0)::int`,
        pendingUsers: sql<number>`coalesce(sum(case when ${users.emailVerified} = false and coalesce(${users.banned}, false) = false then 1 else 0 end), 0)::int`,
        bannedUsers: sql<number>`coalesce(sum(case when coalesce(${users.banned}, false) = true then 1 else 0 end), 0)::int`,
      })
      .from(users);

    // New users in current period vs previous period to calculate growth trend
    const currentPeriodNewUsers = await this.countUsersCreatedBetween(from, to);
    const previousPeriodNewUsers =
      previousFrom && previousTo
        ? await this.countUsersCreatedBetween(previousFrom, previousTo)
        : 0;

    const { change: userChange, trend: userTrend } = this.computeChange(
      currentPeriodNewUsers,
      previousPeriodNewUsers,
    );

    return {
      totalUsers: result?.totalUsers ?? 0,
      activeUsers: result?.activeUsers ?? 0,
      pendingOrBannedUsers: result?.pendingOrBannedUsers ?? 0,
      pendingUsers: result?.pendingUsers ?? 0,
      bannedUsers: result?.bannedUsers ?? 0,
      userChange,
      userTrend,
    };
  }

  /** New user signups with bucketed time series and period-over-period change. */
  async getNewSignupsStats(dateRangeQueryDto: DateRangeQueryDto) {
    const { from, to } = this.resolveDateRange(
      dateRangeQueryDto,
      (rangeTo) =>
        new Date(
          rangeTo.getTime() -
            AdminService.LAST_30_DAYS_BUCKETS * AdminService.DAILY_WINDOW_MS,
        ),
    );

    let resolvedFrom = from;
    if (!resolvedFrom) {
      const [earliestUser] = await this.db
        .select({ createdAt: users.createdAt })
        .from(users)
        .orderBy(users.createdAt)
        .limit(1);
      resolvedFrom =
        earliestUser?.createdAt ??
        new Date(
          to.getTime() -
            AdminService.LAST_30_DAYS_BUCKETS * AdminService.DAILY_WINDOW_MS,
        );
    }

    const rangeMs = to.getTime() - resolvedFrom.getTime();
    const earliestDate = new Date(resolvedFrom.getTime() - rangeMs);

    const signupRows = await this.db
      .select({ createdAt: users.createdAt })
      .from(users)
      .where(
        sql`${users.createdAt} >= ${earliestDate} and ${users.createdAt} <= ${to}`,
      );

    const signupDates = signupRows.map((row) => row.createdAt);

    return this.buildSignupSeries(signupDates, {
      rangeFrom: resolvedFrom,
      rangeTo: to,
    });
  }

  /** Cohort-based retention rate with period-over-period comparison. */
  async getUserRetentionRateStats(dateRangeQueryDto: DateRangeQueryDto) {
    const now = new Date();
    const currentMonthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    const { from, to } = this.resolveDateRange(
      dateRangeQueryDto,
      () => currentMonthStart,
    );

    let resolvedFrom = from;
    if (!resolvedFrom) {
      const [earliestUser] = await this.db
        .select({ createdAt: users.createdAt })
        .from(users)
        .orderBy(users.createdAt)
        .limit(1);
      resolvedFrom =
        earliestUser?.createdAt ??
        new Date(
          to.getTime() -
            AdminService.DEFAULT_RANGE_DAYS * AdminService.DAILY_WINDOW_MS,
        );
    }

    const rangeMs = to.getTime() - resolvedFrom.getTime();
    const signupCohortFrom = new Date(resolvedFrom.getTime() - rangeMs);
    const previousActivePeriodFrom = new Date(resolvedFrom.getTime() - rangeMs);
    const previousSignupCohortFrom = new Date(
      resolvedFrom.getTime() - rangeMs * 2,
    );

    const [
      currentCohortSize,
      currentRetainedUsers,
      previousCohortSize,
      previousRetainedUsers,
    ] = await Promise.all([
      this.countUsersCreatedBetween(signupCohortFrom, resolvedFrom),
      this.countRetainedUsers(signupCohortFrom, resolvedFrom, resolvedFrom, to),
      this.countUsersCreatedBetween(
        previousSignupCohortFrom,
        previousActivePeriodFrom,
      ),
      this.countRetainedUsers(
        previousSignupCohortFrom,
        previousActivePeriodFrom,
        previousActivePeriodFrom,
        resolvedFrom,
      ),
    ]);

    const retentionRatePercentage = AdminService.round2(
      AdminService.safeRatio(currentRetainedUsers, currentCohortSize) * 100,
    );
    const previousRetentionRatePercentage = AdminService.round2(
      AdminService.safeRatio(previousRetainedUsers, previousCohortSize) * 100,
    );
    const { change: retentionRateChange, trend } = this.computeChange(
      retentionRatePercentage,
      previousRetentionRatePercentage,
    );

    return {
      signupCohortFrom,
      signupCohortTo: resolvedFrom,
      activePeriodFrom: resolvedFrom,
      activePeriodTo: to,
      currentCohortSize,
      currentRetainedUsers,
      retentionRatePercentage,
      previousSignupCohortFrom,
      previousSignupCohortTo: previousActivePeriodFrom,
      previousActivePeriodFrom,
      previousActivePeriodTo: resolvedFrom,
      previousCohortSize,
      previousRetainedUsers,
      previousRetentionRatePercentage,
      retentionRateChange,
      trend,
    };
  }

  /** Daily media volume breakdown (posts, stories, reels) over the date range. */
  async getMediaVolumeStats(dateRangeQueryDto: DateRangeQueryDto) {
    const { from, to } = this.resolveDateRange(
      dateRangeQueryDto,
      (rangeTo) =>
        new Date(
          rangeTo.getTime() -
            AdminService.DEFAULT_RANGE_DAYS * AdminService.DAILY_WINDOW_MS,
        ),
    );

    let resolvedFrom = from;
    if (!resolvedFrom) {
      const [earliestUser] = await this.db
        .select({ createdAt: users.createdAt })
        .from(users)
        .orderBy(users.createdAt)
        .limit(1);
      resolvedFrom =
        earliestUser?.createdAt ??
        new Date(
          to.getTime() -
            AdminService.DEFAULT_RANGE_DAYS * AdminService.DAILY_WINDOW_MS,
        );
    }

    const [postRows, storyRows] = await Promise.all([
      this.db
        .select({ createdAt: posts.createdAt, isReel: posts.isReel })
        .from(posts)
        .where(
          sql`${posts.createdAt} >= ${resolvedFrom} and ${posts.createdAt} <= ${to}`,
        ),
      this.db
        .select({ createdAt: stories.createdAt })
        .from(stories)
        .where(
          sql`${stories.createdAt} >= ${resolvedFrom} and ${stories.createdAt} <= ${to}`,
        ),
    ]);

    const series = this.buildDailyTimeBuckets(resolvedFrom, to).map((day) => ({
      day,
      posts: 0,
      stories: 0,
      reels: 0,
      totalUploads: 0,
    }));
    const bucketMap = new Map(series.map((b) => [b.day, b]));

    postRows.forEach((row) => {
      const bucket = bucketMap.get(this.toUtcDateKey(row.createdAt));
      if (bucket) {
        if (row.isReel) bucket.reels++;
        else bucket.posts++;
        bucket.totalUploads++;
      }
    });

    storyRows.forEach((row) => {
      const bucket = bucketMap.get(this.toUtcDateKey(row.createdAt));
      if (bucket) {
        bucket.stories++;
        bucket.totalUploads++;
      }
    });

    return {
      from: from ?? null,
      to,
      data: series,
      totals: series.reduce(
        (acc, b) => ({
          posts: acc.posts + b.posts,
          stories: acc.stories + b.stories,
          reels: acc.reels + b.reels,
          totalUploads: acc.totalUploads + b.totalUploads,
        }),
        { posts: 0, stories: 0, reels: 0, totalUploads: 0 },
      ),
    };
  }

  /** Likes, comments, and saves breakdown with period-over-period comparison. */
  /** Likes, comments, and saves breakdown with period-over-period comparison. */
  async getEngagementBreakdownStats(dateRangeQueryDto: DateRangeQueryDto) {
    const { from, to } = this.resolveDateRange(
      dateRangeQueryDto,
      (rangeTo) =>
        new Date(
          rangeTo.getTime() -
            AdminService.DEFAULT_RANGE_DAYS * AdminService.DAILY_WINDOW_MS,
        ),
    );

    const previousPeriod = from
      ? this.buildPreviousPeriod(from, to)
      : { previousFrom: undefined, previousTo: undefined };
    const { previousFrom, previousTo } = previousPeriod;

    const [
      likesCount,
      commentsCount,
      savesCount,
      previousLikesCount,
      previousCommentsCount,
      previousSavesCount,
    ] = await Promise.all([
      this.countRowsBetween(likes, likes.createdAt, from, to),
      this.countRowsBetween(comments, comments.createdAt, from, to),
      this.countRowsBetween(savedPosts, savedPosts.createdAt, from, to),
      previousFrom && previousTo
        ? this.countRowsBetween(
            likes,
            likes.createdAt,
            previousFrom,
            previousTo,
          )
        : Promise.resolve(0),
      previousFrom && previousTo
        ? this.countRowsBetween(
            comments,
            comments.createdAt,
            previousFrom,
            previousTo,
          )
        : Promise.resolve(0),
      previousFrom && previousTo
        ? this.countRowsBetween(
            savedPosts,
            savedPosts.createdAt,
            previousFrom,
            previousTo,
          )
        : Promise.resolve(0),
    ]);

    return {
      from: from ?? null,
      to,
      previousFrom: previousFrom ?? null,
      previousTo: previousTo ?? null,
      likes: this.buildEngagementMetric(likesCount, previousLikesCount),
      comments: this.buildEngagementMetric(
        commentsCount,
        previousCommentsCount,
      ),
      saves: this.buildEngagementMetric(savesCount, previousSavesCount),
    };
  }

  /** Average interactions per post with period-over-period comparison. */
  async getAverageEngagementPerPostStats(dateRangeQueryDto: DateRangeQueryDto) {
    const { from, to } = this.resolveDateRange(
      dateRangeQueryDto,
      (rangeTo) =>
        new Date(
          rangeTo.getTime() -
            AdminService.DEFAULT_RANGE_DAYS * AdminService.DAILY_WINDOW_MS,
        ),
    );

    const previousPeriod = from
      ? this.buildPreviousPeriod(from, to)
      : { previousFrom: undefined, previousTo: undefined };
    const { previousFrom, previousTo } = previousPeriod;

    const [
      currentPostsCount,
      currentLikesCount,
      currentCommentsCount,
      currentSavesCount,
      previousPostsCount,
      previousLikesCount,
      previousCommentsCount,
      previousSavesCount,
    ] = await Promise.all([
      this.countRowsBetween(posts, posts.createdAt, from, to),
      this.countRowsBetween(likes, likes.createdAt, from, to),
      this.countRowsBetween(comments, comments.createdAt, from, to),
      this.countRowsBetween(savedPosts, savedPosts.createdAt, from, to),
      previousFrom && previousTo
        ? this.countRowsBetween(
            posts,
            posts.createdAt,
            previousFrom,
            previousTo,
          )
        : Promise.resolve(0),
      previousFrom && previousTo
        ? this.countRowsBetween(
            likes,
            likes.createdAt,
            previousFrom,
            previousTo,
          )
        : Promise.resolve(0),
      previousFrom && previousTo
        ? this.countRowsBetween(
            comments,
            comments.createdAt,
            previousFrom,
            previousTo,
          )
        : Promise.resolve(0),
      previousFrom && previousTo
        ? this.countRowsBetween(
            savedPosts,
            savedPosts.createdAt,
            previousFrom,
            previousTo,
          )
        : Promise.resolve(0),
    ]);

    const currentInteractions =
      currentLikesCount + currentCommentsCount + currentSavesCount;
    const previousInteractions =
      previousLikesCount + previousCommentsCount + previousSavesCount;
    const averageEngagementPerPost = AdminService.round2(
      AdminService.safeRatio(currentInteractions, currentPostsCount),
    );
    const previousAverageEngagementPerPost = AdminService.round2(
      AdminService.safeRatio(previousInteractions, previousPostsCount),
    );
    const { change, trend } = this.computeChange(
      averageEngagementPerPost,
      previousAverageEngagementPerPost,
    );

    // Calculate percentage of posts that have at least one interaction
    const conditions: SQL[] = [];
    if (from) {
      conditions.push(gte(posts.createdAt, from));
    }
    if (to) {
      conditions.push(lte(posts.createdAt, to));
    }
    conditions.push(
      sql`${posts.likesCount} + ${posts.commentsCount} + ${posts.savesCount} > 0`,
    );

    const [highInteractionCountResult] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(posts)
      .where(and(...conditions));

    const highInteractionRate = AdminService.round2(
      AdminService.safeRatio(
        highInteractionCountResult?.count || 0,
        currentPostsCount,
      ) * 100,
    );

    return {
      from: from ?? null,
      to,
      previousFrom: previousFrom ?? null,
      previousTo: previousTo ?? null,
      totalInteractions: currentInteractions,
      totalPosts: currentPostsCount,
      averageEngagementPerPost,
      highInteractionRate,
      previousTotalInteractions: previousInteractions,
      previousTotalPosts: previousPostsCount,
      previousAverageEngagementPerPost,
      change,
      trend,
    };
  }

  async getPopularContentStats(dateRangeQueryDto: DateRangeQueryDto) {
    const { from, to } = this.resolveDateRange(dateRangeQueryDto, (rangeTo) => {
      return new Date(rangeTo.getTime() - AdminService.DAILY_WINDOW_MS);
    });

    const conditions: SQL[] = [];
    if (from) {
      conditions.push(gte(posts.createdAt, from));
    }
    if (to) {
      conditions.push(lte(posts.createdAt, to));
    }

    const top = await this.db.query.posts.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        postMedia: true,
        user: {
          columns: {
            username: true,
            image: true,
            name: true,
          },
        },
      },
      orderBy: desc(sql`${posts.likesCount} + ${posts.sharesCount}`),
      limit: 10,
      extras: {
        engagementScore:
          sql<number>`${posts.likesCount} + ${posts.sharesCount}`.as(
            'engagement_score',
          ),
      },
    });

    return { from: from ?? null, to, top };
  }

  /** Current GCS storage usage percentage. */
  async getStorageUsageStats() {
    return this.uploadService.getStorageUsagePercent();
  }

  /** Average moderation response time with period-over-period comparison. */
  async getAverageResponseTimeStats(dateRangeQueryDto: DateRangeQueryDto) {
    const { from, to } = this.resolveDateRange(
      dateRangeQueryDto,
      (rangeTo) =>
        new Date(
          rangeTo.getTime() -
            AdminService.DEFAULT_RANGE_DAYS * AdminService.DAILY_WINDOW_MS,
        ),
    );

    const previousPeriod = from
      ? this.buildPreviousPeriod(from, to)
      : { previousFrom: undefined, previousTo: undefined };
    const { previousFrom, previousTo } = previousPeriod;

    const [averageResponseTimeMs, previousAverageResponseTimeMs] =
      await Promise.all([
        this.getAverageResponseTimeMsBetween(from, to),
        previousFrom && previousTo
          ? this.getAverageResponseTimeMsBetween(previousFrom, previousTo)
          : Promise.resolve(0),
      ]);

    const changeMs = AdminService.round2(
      averageResponseTimeMs - previousAverageResponseTimeMs,
    );
    const changePercentage = AdminService.round2(
      AdminService.safeRatio(changeMs, previousAverageResponseTimeMs) * 100,
    );

    return {
      from: from ?? null,
      to,
      previousFrom: previousFrom ?? null,
      previousTo: previousTo ?? null,
      averageResponseTimeMs,
      averageResponseTimeMinutes: AdminService.round2(
        averageResponseTimeMs / 60000,
      ),
      previousAverageResponseTimeMs,
      previousAverageResponseTimeMinutes: AdminService.round2(
        previousAverageResponseTimeMs / 60000,
      ),
      changeMs,
      changePercentage,
      trend: this.getTrend(changeMs),
    };
  }

  /** Per-topic and per-partition Kafka consumer lag snapshot. */
  async getKafkaLagStats() {
    await this.kafkaClient.connect();
    const kafka = this.kafkaClient.unwrap<Kafka>();

    const admin = kafka.admin();

    try {
      await admin.connect();

      const partitionRows = await this.fetchAllPartitionLags(admin);

      const totalLag = partitionRows.reduce((sum, r) => sum + r.lag, 0);
      const criticalTopics = partitionRows.filter(
        (r) =>
          this.classifyLag(r.lag) === 'critical' ||
          this.classifyLag(r.lag) === 'alert',
      ).length;
      const healthyTopics = partitionRows.filter((r) => r.lag === 0).length;

      // Roll up per-topic totals for the summary table
      const byTopic = new Map<
        string,
        {
          topic: string;
          groupId: string;
          totalLag: number;
          partitions: number;
          level: LagLevel;
        }
      >();
      for (const row of partitionRows) {
        const key = `${row.groupId}::${row.topic}`;
        const existing = byTopic.get(key);
        if (existing) {
          existing.totalLag += row.lag;
          existing.partitions += 1;
        } else {
          byTopic.set(key, {
            topic: row.topic,
            groupId: row.groupId,
            totalLag: row.lag,
            partitions: 1,
            level: this.classifyLag(row.lag),
          });
        }
      }

      // Re-classify after totalLag is summed per topic
      const topicSummaries = [...byTopic.values()].map((t) => ({
        ...t,
        level: this.classifyLag(t.totalLag),
      }));

      return {
        collectedAt: new Date(),
        summary: {
          totalLag,
          criticalTopics,
          healthyTopics,
          monitoredGroups: KAFKA_LAG_CONFIG.consumerGroups.length,
        },
        topics: topicSummaries,
        partitions: partitionRows,
      };
    } finally {
      await admin.disconnect();
    }
  }

  // ── Kafka Helpers ──────────────────────────────────────

  private async fetchAllPartitionLags(
    admin: Awaited<ReturnType<Kafka['admin']>>,
  ) {
    const rows: Array<{
      groupId: string;
      topic: string;
      partition: number;
      committedOffset: string;
      logEndOffset: string;
      lag: number;
      level: LagLevel;
    }> = [];

    for (const { groupId, topics } of KAFKA_LAG_CONFIG.consumerGroups) {
      for (const topic of topics) {
        const [topicOffsets, committed] = await Promise.all([
          admin.fetchTopicOffsets(topic),
          admin.fetchOffsets({ groupId, topics: [topic] }),
        ]);

        const partitions = committed[0]?.partitions ?? [];

        for (const { partition, offset: endOffset } of topicOffsets) {
          const found = partitions.find((p) => p.partition === partition);
          const committedOffset = BigInt(found?.offset ?? '0');
          const logEndOffset = BigInt(endOffset);
          const lag = Number(logEndOffset - committedOffset);

          rows.push({
            groupId,
            topic,
            partition,
            committedOffset: committedOffset.toString(),
            logEndOffset: logEndOffset.toString(),
            lag: Math.max(0, lag),
            level: this.classifyLag(Math.max(0, lag)),
          });
        }
      }
    }

    return rows;
  }

  private classifyLag(lag: number): LagLevel {
    if (lag === 0) return 'healthy';
    if (lag < KAFKA_LAG_CONFIG.thresholds.warning) return 'warning';
    if (lag < KAFKA_LAG_CONFIG.thresholds.critical) return 'critical';
    return 'alert';
  }

  // ── Trend & Comparison Helpers ─────────────────────────

  private getTrend(change: number): TrendEnum {
    if (change > 0) return TrendEnum.INCREASE;
    if (change < 0) return TrendEnum.DECREASE;
    return TrendEnum.UNCHANGED;
  }

  private buildPreviousPeriod(from: Date, to: Date) {
    const rangeMs = to.getTime() - from.getTime();
    return {
      previousFrom: new Date(from.getTime() - rangeMs),
      previousTo: new Date(from.getTime()),
    };
  }

  private computeChange(current: number, previous: number) {
    const change = AdminService.round2(current - previous);
    return { change, trend: this.getTrend(change) };
  }

  private buildEngagementMetric(count: number, previousCount: number) {
    const { change, trend } = this.computeChange(count, previousCount);
    return { count, previousCount, change, trend };
  }

  private resolveDateRange(
    dateRangeQueryDto: DateRangeQueryDto,
    defaultFromFactory: (to: Date) => Date,
  ) {
    if (!dateRangeQueryDto.from && !dateRangeQueryDto.to) {
      return { from: undefined, to: new Date() };
    }

    const to = dateRangeQueryDto.to ?? new Date();
    const from = dateRangeQueryDto.from ?? defaultFromFactory(to);

    if (
      (dateRangeQueryDto.from && !dateRangeQueryDto.to) ||
      (!dateRangeQueryDto.from && dateRangeQueryDto.to)
    ) {
      throw new BadRequestException({
        code: SystemWideErrorCodes.BAD_REQUEST,
        description: 'Both from and to must be provided together.',
      });
    }

    if (from >= to) {
      throw new BadRequestException({
        code: SystemWideErrorCodes.BAD_REQUEST,
        description: 'The from date must be earlier than the to date.',
      });
    }

    return { from, to };
  }

  // ── Database Query Helpers ───────────────────────────

  private async countUsersActiveBetween(from?: Date, to?: Date) {
    const conditions: SQL[] = [];
    if (from) {
      conditions.push(sql`${users.lastActiveAt} >= ${from}`);
    }
    if (to) {
      conditions.push(sql`${users.lastActiveAt} <= ${to}`);
    }
    const [result] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return result?.count ?? 0;
  }

  private async countUsersCreatedBetween(from?: Date, to?: Date) {
    const conditions: SQL[] = [];
    if (from) {
      conditions.push(sql`${users.createdAt} >= ${from}`);
    }
    if (to) {
      conditions.push(sql`${users.createdAt} < ${to}`);
    }
    const [result] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return result?.count ?? 0;
  }

  private async countRowsBetween(
    table: typeof likes | typeof comments | typeof savedPosts | typeof posts,
    createdAtColumn:
      | typeof likes.createdAt
      | typeof comments.createdAt
      | typeof savedPosts.createdAt
      | typeof posts.createdAt,
    from?: Date,
    to?: Date,
  ) {
    const conditions: SQL[] = [];
    if (from) {
      conditions.push(sql`${createdAtColumn} >= ${from}`);
    }
    if (to) {
      conditions.push(sql`${createdAtColumn} < ${to}`);
    }
    const [result] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(table)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return result?.count ?? 0;
  }

  private async countRetainedUsers(
    signupFrom: Date,
    signupTo: Date,
    activeFrom: Date,
    activeTo: Date,
  ) {
    const [result] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(
        sql`${users.createdAt} >= ${signupFrom} and ${users.createdAt} < ${signupTo} and ${users.lastActiveAt} >= ${activeFrom} and ${users.lastActiveAt} < ${activeTo}`,
      );

    return result?.count ?? 0;
  }

  private async getAverageResponseTimeMsBetween(from?: Date, to?: Date) {
    const conditions: SQL[] = [];
    if (from) {
      conditions.push(sql`${contentReports.reportedAt} >= ${from}`);
    }
    if (to) {
      conditions.push(sql`${contentReports.reportedAt} < ${to}`);
    }
    conditions.push(
      sql`${contentReports.resolvedAt} is not null and ${contentReports.reviewedBy} is not null`,
    );
    const [result] = await this.db
      .select({
        averageMs: sql<number>`coalesce(avg(extract(epoch from (${contentReports.resolvedAt} - ${contentReports.reportedAt})) * 1000), 0)::float8`,
      })
      .from(contentReports)
      .where(and(...conditions));

    return AdminService.round2(result?.averageMs ?? 0);
  }

  // ── Aggregation Builders ────────────────────────────

  private buildSignupSeries(
    signupDates: Date[],
    options: {
      rangeFrom: Date;
      rangeTo: Date;
    },
  ) {
    const bucketMs = this.resolveSignupBucketMs(
      options.rangeFrom,
      options.rangeTo,
    );
    const { previousFrom } = this.buildPreviousPeriod(
      options.rangeFrom,
      options.rangeTo,
    );
    const currentTotal = this.countDatesBetween(
      signupDates,
      options.rangeFrom,
      options.rangeTo,
    );
    const previousTotal = this.countDatesBetween(
      signupDates,
      previousFrom,
      options.rangeFrom,
    );
    const { change: signupChange, trend } = this.computeChange(
      currentTotal,
      previousTotal,
    );

    return {
      from: options.rangeFrom,
      to: options.rangeTo,
      bucketInterval:
        bucketMs === AdminService.HOURLY_WINDOW_MS ? 'hour' : 'day',
      totalSignups: currentTotal,
      previousPeriodTotalSignups: previousTotal,
      signupChange,
      trend,
      data: this.buildBuckets(
        signupDates,
        options.rangeFrom,
        Math.max(
          1,
          Math.ceil(
            (options.rangeTo.getTime() - options.rangeFrom.getTime()) /
              bucketMs,
          ),
        ),
        bucketMs,
      ),
    };
  }

  // ── Date & Bucket Utilities ────────────────────────────

  private resolveSignupBucketMs(from: Date, to: Date): number {
    const rangeMs = to.getTime() - from.getTime();
    return rangeMs <= AdminService.DAILY_WINDOW_MS
      ? AdminService.HOURLY_WINDOW_MS
      : AdminService.DAILY_WINDOW_MS;
  }

  private toUtcDateKey(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private toUtcMidnight(date: Date): Date {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
  }

  private buildDailyTimeBuckets(from: Date, to: Date): string[] {
    const buckets: string[] = [];
    const cursor = this.toUtcMidnight(from);
    const end = this.toUtcMidnight(to);

    for (; cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
      buckets.push(this.toUtcDateKey(cursor));
    }

    return buckets;
  }

  private buildBuckets(
    dates: Date[],
    from: Date,
    bucketCount: number,
    bucketMs: number,
  ) {
    const buckets = Array.from({ length: bucketCount }, (_, index) => ({
      bucketStart: new Date(from.getTime() + index * bucketMs),
      signups: 0,
    }));

    for (const date of dates) {
      const bucketIndex = Math.floor(
        (date.getTime() - from.getTime()) / bucketMs,
      );
      if (bucketIndex >= 0 && bucketIndex < bucketCount) {
        const bucket = buckets[bucketIndex];
        if (bucket) {
          bucket.signups += 1;
        }
      }
    }

    return buckets.map((bucket) => ({
      bucketStart: bucket.bucketStart,
      bucketEnd: new Date(bucket.bucketStart.getTime() + bucketMs),
      signups: bucket.signups,
    }));
  }

  private countDatesBetween(dates: Date[], from: Date, to: Date): number {
    const fromMs = from.getTime();
    const toMs = to.getTime();
    return dates.filter((d) => d.getTime() >= fromMs && d.getTime() < toMs)
      .length;
  }
}
