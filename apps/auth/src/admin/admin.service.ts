import {
  comments,
  DATABASE_CONNECTION,
  likes,
  postReports,
  posts,
  savedPosts,
  schema,
  stories,
  users,
} from '@repo/database';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, desc, gte, lte, sql } from 'drizzle-orm';
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

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly uploadService: UploadService,
    @Inject(KAFKA_SERVICE_NAME)
    private readonly kafkaClient: ClientKafkaProxy,
  ) {}

  async getActiveUsersStats(dateRangeQueryDto: DateRangeQueryDto) {
    const { from, to } = this.resolveDateRange(
      dateRangeQueryDto,
      (rangeTo) =>
        new Date(
          rangeTo.getTime() -
            AdminService.DEFAULT_RANGE_DAYS * AdminService.DAILY_WINDOW_MS,
        ),
    );

    const currentRangeMs = to.getTime() - from.getTime();
    const previousTo = new Date(from.getTime());
    const previousFrom = new Date(from.getTime() - currentRangeMs);
    const dailyFrom = new Date(
      Math.max(from.getTime(), to.getTime() - AdminService.DAILY_WINDOW_MS),
    );
    const previousDailyTo = previousTo;
    const previousDailyFrom = new Date(
      Math.max(
        previousFrom.getTime(),
        previousTo.getTime() - AdminService.DAILY_WINDOW_MS,
      ),
    );

    const [
      dailyActiveUsers,
      monthlyActiveUsers,
      previousDailyActiveUsers,
      previousMonthlyActiveUsers,
    ] = await Promise.all([
      this.countUsersActiveBetween(dailyFrom, to),
      this.countUsersActiveBetween(from, to),
      this.countUsersActiveBetween(previousDailyFrom, previousDailyTo),
      this.countUsersActiveBetween(previousFrom, previousTo),
    ]);

    const stickinessRatio =
      monthlyActiveUsers === 0 ? 0 : dailyActiveUsers / monthlyActiveUsers;
    const previousStickinessRatio =
      previousMonthlyActiveUsers === 0
        ? 0
        : previousDailyActiveUsers / previousMonthlyActiveUsers;
    const stickinessPercentage = Number((stickinessRatio * 100).toFixed(2));
    const previousStickinessPercentage = Number(
      (previousStickinessRatio * 100).toFixed(2),
    );
    const stickinessPercentageChange = Number(
      (stickinessPercentage - previousStickinessPercentage).toFixed(2),
    );
    const trend = this.getTrend(stickinessPercentageChange);

    return {
      from,
      to,
      dailyFrom,
      previousFrom,
      previousTo,
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

  async getTotalUsersStats() {
    const [result] = await this.db
      .select({
        totalUsers: sql<number>`count(*)::int`,
        activeUsers: sql<number>`coalesce(sum(case when ${users.emailVerified} = true and coalesce(${users.banned}, false) = false then 1 else 0 end), 0)::int`,
        pendingOrBannedUsers: sql<number>`coalesce(sum(case when ${users.emailVerified} = false or coalesce(${users.banned}, false) = true then 1 else 0 end), 0)::int`,
        pendingUsers: sql<number>`coalesce(sum(case when ${users.emailVerified} = false and coalesce(${users.banned}, false) = false then 1 else 0 end), 0)::int`,
        bannedUsers: sql<number>`coalesce(sum(case when coalesce(${users.banned}, false) = true then 1 else 0 end), 0)::int`,
      })
      .from(users);

    return {
      totalUsers: result?.totalUsers ?? 0,
      activeUsers: result?.activeUsers ?? 0,
      pendingOrBannedUsers: result?.pendingOrBannedUsers ?? 0,
      pendingUsers: result?.pendingUsers ?? 0,
      bannedUsers: result?.bannedUsers ?? 0,
    };
  }

  async getNewSignupsStats(dateRangeQueryDto: DateRangeQueryDto) {
    const { from, to } = this.resolveDateRange(
      dateRangeQueryDto,
      (rangeTo) =>
        new Date(
          rangeTo.getTime() -
            AdminService.LAST_30_DAYS_BUCKETS * AdminService.DAILY_WINDOW_MS,
        ),
    );
    const rangeMs = to.getTime() - from.getTime();
    const earliestDate = new Date(from.getTime() - rangeMs);

    const signupRows = await this.db
      .select({ createdAt: users.createdAt })
      .from(users)
      .where(
        sql`${users.createdAt} >= ${earliestDate} and ${users.createdAt} <= ${to}`,
      );

    const signupDates = signupRows.map((row) => row.createdAt);

    return this.buildSignupSeries(signupDates, {
      rangeFrom: from,
      rangeTo: to,
    });
  }

  async getUserRetentionRateStats(dateRangeQueryDto: DateRangeQueryDto) {
    const now = new Date();
    const currentMonthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    const { from, to } = this.resolveDateRange(
      dateRangeQueryDto,
      () => currentMonthStart,
    );
    const rangeMs = to.getTime() - from.getTime();
    const signupCohortFrom = new Date(from.getTime() - rangeMs);
    const previousActivePeriodFrom = new Date(from.getTime() - rangeMs);
    const previousSignupCohortFrom = new Date(from.getTime() - rangeMs * 2);

    const [
      currentCohortSize,
      currentRetainedUsers,
      previousCohortSize,
      previousRetainedUsers,
    ] = await Promise.all([
      this.countUsersCreatedBetween(signupCohortFrom, from),
      this.countRetainedUsers(signupCohortFrom, from, from, to),
      this.countUsersCreatedBetween(
        previousSignupCohortFrom,
        previousActivePeriodFrom,
      ),
      this.countRetainedUsers(
        previousSignupCohortFrom,
        previousActivePeriodFrom,
        previousActivePeriodFrom,
        from,
      ),
    ]);

    const retentionRate =
      currentCohortSize === 0
        ? 0
        : (currentRetainedUsers / currentCohortSize) * 100;
    const previousRetentionRate =
      previousCohortSize === 0
        ? 0
        : (previousRetainedUsers / previousCohortSize) * 100;
    const retentionRatePercentage = Number(retentionRate.toFixed(2));
    const previousRetentionRatePercentage = Number(
      previousRetentionRate.toFixed(2),
    );
    const retentionRateChange = Number(
      (retentionRatePercentage - previousRetentionRatePercentage).toFixed(2),
    );
    const trend = this.getTrend(retentionRateChange);

    return {
      signupCohortFrom,
      signupCohortTo: from,
      activePeriodFrom: from,
      activePeriodTo: to,
      currentCohortSize,
      currentRetainedUsers,
      retentionRatePercentage,
      previousSignupCohortFrom,
      previousSignupCohortTo: previousActivePeriodFrom,
      previousActivePeriodFrom,
      previousActivePeriodTo: from,
      previousCohortSize,
      previousRetainedUsers,
      previousRetentionRatePercentage,
      retentionRateChange,
      trend,
    };
  }

  async getMediaVolumeStats(dateRangeQueryDto: DateRangeQueryDto) {
    const { from, to } = this.resolveDateRange(
      dateRangeQueryDto,
      (rangeTo) =>
        new Date(
          rangeTo.getTime() -
            AdminService.DEFAULT_RANGE_DAYS * AdminService.DAILY_WINDOW_MS,
        ),
    );

    const [postRows, storyRows] = await Promise.all([
      this.db
        .select({ createdAt: posts.createdAt, isReel: posts.isReel })
        .from(posts)
        .where(
          sql`${posts.createdAt} >= ${from} and ${posts.createdAt} <= ${to}`,
        ),
      this.db
        .select({ createdAt: stories.createdAt })
        .from(stories)
        .where(
          sql`${stories.createdAt} >= ${from} and ${stories.createdAt} <= ${to}`,
        ),
    ]);

    const days = this.buildDailyTimeBuckets(from, to);
    const series = days.map((day) => ({
      day,
      posts: 0,
      stories: 0,
      reels: 0,
      totalUploads: 0,
    }));
    const bucketIndexByDay = new Map(
      series.map((bucket, index) => [bucket.day, index]),
    );

    for (const row of postRows) {
      const day = this.toUtcDateKey(row.createdAt);
      const bucketIndex = bucketIndexByDay.get(day);
      if (bucketIndex === undefined) continue;

      const bucket = series[bucketIndex];
      if (!bucket) continue;

      if (row.isReel) {
        bucket.reels += 1;
      } else {
        bucket.posts += 1;
      }
      bucket.totalUploads += 1;
    }

    for (const row of storyRows) {
      const day = this.toUtcDateKey(row.createdAt);
      const bucketIndex = bucketIndexByDay.get(day);
      if (bucketIndex === undefined) continue;

      const bucket = series[bucketIndex];
      if (!bucket) continue;

      bucket.stories += 1;
      bucket.totalUploads += 1;
    }

    return {
      from,
      to,
      totals: {
        posts: series.reduce((acc, item) => acc + item.posts, 0),
        stories: series.reduce((acc, item) => acc + item.stories, 0),
        reels: series.reduce((acc, item) => acc + item.reels, 0),
        totalUploads: series.reduce((acc, item) => acc + item.totalUploads, 0),
      },
      data: series,
    };
  }

  async getEngagementBreakdownStats(dateRangeQueryDto: DateRangeQueryDto) {
    const { from, to } = this.resolveDateRange(
      dateRangeQueryDto,
      (rangeTo) =>
        new Date(
          rangeTo.getTime() -
            AdminService.DEFAULT_RANGE_DAYS * AdminService.DAILY_WINDOW_MS,
        ),
    );

    const currentRangeMs = to.getTime() - from.getTime();
    const previousFrom = new Date(from.getTime() - currentRangeMs);
    const previousTo = new Date(from.getTime());

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
      this.countRowsBetween(likes, likes.createdAt, previousFrom, previousTo),
      this.countRowsBetween(
        comments,
        comments.createdAt,
        previousFrom,
        previousTo,
      ),
      this.countRowsBetween(
        savedPosts,
        savedPosts.createdAt,
        previousFrom,
        previousTo,
      ),
    ]);

    const likesChange = likesCount - previousLikesCount;
    const commentsChange = commentsCount - previousCommentsCount;
    const savesChange = savesCount - previousSavesCount;

    return {
      from,
      to,
      previousFrom,
      previousTo,
      likes: {
        count: likesCount,
        previousCount: previousLikesCount,
        change: likesChange,
        trend: this.getTrend(likesChange),
      },
      comments: {
        count: commentsCount,
        previousCount: previousCommentsCount,
        change: commentsChange,
        trend: this.getTrend(commentsChange),
      },
      saves: {
        count: savesCount,
        previousCount: previousSavesCount,
        change: savesChange,
        trend: this.getTrend(savesChange),
      },
    };
  }

  async getAverageEngagementPerPostStats(dateRangeQueryDto: DateRangeQueryDto) {
    const { from, to } = this.resolveDateRange(
      dateRangeQueryDto,
      (rangeTo) =>
        new Date(
          rangeTo.getTime() -
            AdminService.DEFAULT_RANGE_DAYS * AdminService.DAILY_WINDOW_MS,
        ),
    );

    const currentRangeMs = to.getTime() - from.getTime();
    const previousFrom = new Date(from.getTime() - currentRangeMs);
    const previousTo = new Date(from.getTime());

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
      this.countRowsBetween(posts, posts.createdAt, previousFrom, previousTo),
      this.countRowsBetween(likes, likes.createdAt, previousFrom, previousTo),
      this.countRowsBetween(
        comments,
        comments.createdAt,
        previousFrom,
        previousTo,
      ),
      this.countRowsBetween(
        savedPosts,
        savedPosts.createdAt,
        previousFrom,
        previousTo,
      ),
    ]);

    const currentInteractions =
      currentLikesCount + currentCommentsCount + currentSavesCount;
    const previousInteractions =
      previousLikesCount + previousCommentsCount + previousSavesCount;
    const averageEngagementPerPost =
      currentPostsCount === 0
        ? 0
        : Number((currentInteractions / currentPostsCount).toFixed(2));
    const previousAverageEngagementPerPost =
      previousPostsCount === 0
        ? 0
        : Number((previousInteractions / previousPostsCount).toFixed(2));
    const change = Number(
      (averageEngagementPerPost - previousAverageEngagementPerPost).toFixed(2),
    );

    return {
      from,
      to,
      previousFrom,
      previousTo,
      totalInteractions: currentInteractions,
      totalPosts: currentPostsCount,
      averageEngagementPerPost,
      previousTotalInteractions: previousInteractions,
      previousTotalPosts: previousPostsCount,
      previousAverageEngagementPerPost,
      change,
      trend: this.getTrend(change),
    };
  }

  async getPopularContentStats() {
    const to = new Date();
    const from = new Date(to.getTime() - AdminService.DAILY_WINDOW_MS);

    const top = await this.db.query.posts.findMany({
      where: and(gte(posts.createdAt, from), lte(posts.createdAt, to)),
      with: {
        postMedia: true,
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

    return {
      from,
      to,
      top,
    };
  }

  async getStorageUsageStats() {
    return this.uploadService.getStorageUsagePercent();
  }

  async getAverageResponseTimeStats(dateRangeQueryDto: DateRangeQueryDto) {
    const { from, to } = this.resolveDateRange(
      dateRangeQueryDto,
      (rangeTo) =>
        new Date(
          rangeTo.getTime() -
            AdminService.DEFAULT_RANGE_DAYS * AdminService.DAILY_WINDOW_MS,
        ),
    );

    const currentRangeMs = to.getTime() - from.getTime();
    const previousFrom = new Date(from.getTime() - currentRangeMs);
    const previousTo = new Date(from.getTime());

    const [averageResponseTimeMs, previousAverageResponseTimeMs] =
      await Promise.all([
        this.getAverageResponseTimeMsBetween(from, to),
        this.getAverageResponseTimeMsBetween(previousFrom, previousTo),
      ]);

    const changeMs = Number(
      (averageResponseTimeMs - previousAverageResponseTimeMs).toFixed(2),
    );
    const changePercentage =
      previousAverageResponseTimeMs === 0
        ? 0
        : Number(((changeMs / previousAverageResponseTimeMs) * 100).toFixed(2));

    return {
      from,
      to,
      previousFrom,
      previousTo,
      averageResponseTimeMs,
      averageResponseTimeMinutes: Number(
        (averageResponseTimeMs / 60000).toFixed(2),
      ),
      previousAverageResponseTimeMs,
      previousAverageResponseTimeMinutes: Number(
        (previousAverageResponseTimeMs / 60000).toFixed(2),
      ),
      changeMs,
      changePercentage,
      trend: this.getTrend(changeMs),
    };
  }

  async getKafkaLagStats() {
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

  private getTrend(change: number): TrendEnum {
    if (change > 0) return TrendEnum.INCREASE;
    if (change < 0) return TrendEnum.DECREASE;

    return TrendEnum.UNCHANGED;
  }

  private resolveDateRange(
    dateRangeQueryDto: DateRangeQueryDto,
    defaultFromFactory: (to: Date) => Date,
  ) {
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

  private async countUsersActiveBetween(from: Date, to: Date) {
    const [result] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(
        sql`${users.lastActiveAt} >= ${from} and ${users.lastActiveAt} <= ${to}`,
      );

    return result?.count ?? 0;
  }

  private async countUsersCreatedBetween(from: Date, to: Date) {
    const [result] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(sql`${users.createdAt} >= ${from} and ${users.createdAt} < ${to}`);

    return result?.count ?? 0;
  }

  private async countRowsBetween(
    table: typeof likes | typeof comments | typeof savedPosts | typeof posts,
    createdAtColumn:
      | typeof likes.createdAt
      | typeof comments.createdAt
      | typeof savedPosts.createdAt
      | typeof posts.createdAt,
    from: Date,
    to: Date,
  ) {
    const [result] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(table)
      .where(sql`${createdAtColumn} >= ${from} and ${createdAtColumn} < ${to}`);

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

  private async getAverageResponseTimeMsBetween(from: Date, to: Date) {
    const [result] = await this.db
      .select({
        averageMs: sql<number>`coalesce(avg(extract(epoch from (${postReports.resolvedAt} - ${postReports.reportedAt})) * 1000), 0)::float8`,
      })
      .from(postReports)
      .where(
        sql`${postReports.reportedAt} >= ${from} and ${postReports.reportedAt} < ${to} and ${postReports.resolvedAt} is not null and ${postReports.reviewedBy} is not null`,
      );

    return Number((result?.averageMs ?? 0).toFixed(2));
  }

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
    const currentFrom = new Date(options.rangeFrom.getTime());
    const currentRangeMs = options.rangeTo.getTime() - currentFrom.getTime();
    const previousFrom = new Date(currentFrom.getTime() - currentRangeMs);
    const currentTotal = this.countDatesBetween(
      signupDates,
      currentFrom,
      options.rangeTo,
    );
    const previousTotal = this.countDatesBetween(
      signupDates,
      previousFrom,
      currentFrom,
    );
    const signupChange = currentTotal - previousTotal;
    const trend = this.getTrend(signupChange);

    return {
      from: currentFrom,
      to: options.rangeTo,
      bucketInterval:
        bucketMs === AdminService.HOURLY_WINDOW_MS ? 'hour' : 'day',
      totalSignups: currentTotal,
      previousPeriodTotalSignups: previousTotal,
      signupChange,
      trend,
      data: this.buildBuckets(
        signupDates,
        currentFrom,
        Math.max(1, Math.ceil(currentRangeMs / bucketMs)),
        bucketMs,
      ),
    };
  }

  private resolveSignupBucketMs(from: Date, to: Date) {
    const rangeMs = to.getTime() - from.getTime();

    return rangeMs <= AdminService.DAILY_WINDOW_MS
      ? AdminService.HOURLY_WINDOW_MS
      : AdminService.DAILY_WINDOW_MS;
  }

  private buildDailyTimeBuckets(from: Date, to: Date) {
    const buckets: string[] = [];
    const cursor = new Date(
      Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()),
    );
    const end = new Date(
      Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()),
    );

    while (cursor.getTime() <= end.getTime()) {
      buckets.push(this.toUtcDateKey(cursor));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return buckets;
  }

  private toUtcDateKey(date: Date) {
    const year = date.getUTCFullYear();
    const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
    const day = `${date.getUTCDate()}`.padStart(2, '0');

    return `${year}-${month}-${day}`;
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

  private countDatesBetween(dates: Date[], from: Date, to: Date) {
    return dates.filter(
      (date) =>
        date.getTime() >= from.getTime() && date.getTime() < to.getTime(),
    ).length;
  }
}
