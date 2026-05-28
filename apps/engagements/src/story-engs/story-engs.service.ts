import { Inject, Injectable, Logger } from '@nestjs/common';
import { DATABASE_CONNECTION, schema, stories } from '@repo/database';
import {
  KAFKA_SERVICE_NAME,
  MediaViolationEvent,
  NOTIFICATIONS_TOPIC_MEDIA_VIOLATION,
  POSTS_TOPIC_STORY_CREATED,
  StoryCreatedEvent,
  StoryViewedEvent,
} from '@repo/types';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, sql } from 'drizzle-orm';
import { ModerationService } from '@repo/common';
import { ClientKafka } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StoryEngsService {
  private readonly logger = new Logger(StoryEngsService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    @Inject(KAFKA_SERVICE_NAME)
    private readonly kafkaClient: ClientKafka,
    private readonly moderationService: ModerationService,
    private readonly configService: ConfigService,
  ) {}

  async handleStoryCreated(data: StoryCreatedEvent) {
    const { storyId } = data;

    const createdStory = await this.db.query.stories.findFirst({
      where: eq(stories.id, storyId),
    });

    if (
      !createdStory ||
      !createdStory.mediaType ||
      !createdStory.originalRawFileUrl
    )
      return;

    let res: { isSafe: boolean; reason?: string };

    if (createdStory.mediaType.startsWith('image/')) {
      const safetyRes = await this.moderationService.checkImageSafety(
        createdStory.originalRawFileUrl,
        this.configService.getOrThrow('GOOGLE_IMAGES_BUCKET_NAME'),
      );
      res = {
        isSafe: safetyRes.isSafe,
        reason: safetyRes.isSafe
          ? undefined
          : 'Potential unsafe image content detected',
      };
    } else {
      res = await this.moderationService.checkVideoSafety(
        createdStory.originalRawFileUrl!,
        this.configService.getOrThrow('GOOGLE_INPUT_VIDEO_BUCKET_NAME'),
      );
    }

    this.logger.log(
      `Moderation result for story ${storyId}: ${JSON.stringify(res)}`,
    );

    if (!res.isSafe) {
      await this.db
        .update(stories)
        .set({
          moderationStatus: 'flagged',
          moderationReason: res.reason || 'Safety violation detected',
        })
        .where(eq(stories.id, storyId));

      this.kafkaClient.emit(NOTIFICATIONS_TOPIC_MEDIA_VIOLATION, {
        storyId: storyId,
        mediaId: storyId,
        userId: createdStory.userId,
        reason: res.reason || 'Safety violation detected',
      } as MediaViolationEvent);
    }
  }

  async handleStoryViewed(data: StoryViewedEvent) {
    const story = await this.db.query.stories.findFirst({
      where: eq(stories.id, data.storyId),
      columns: {
        userId: true,
      },
    });

    if (!story) {
      this.logger.warn(`Story with ID ${data.storyId} not found.`);
      return;
    }

    if (story.userId === data.userId) {
      return;
    }

    await this.db
      .update(stories)
      .set({
        viewsCount: sql`${stories.viewsCount} + 1`,
      })
      .where(eq(stories.id, data.storyId));
  }
}
