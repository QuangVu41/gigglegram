import {
  DATABASE_CONNECTION,
  followers,
  followersStatusEnum,
  schema,
  users,
} from '@repo/database';
import {
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { UsersRepository } from '@/src/users.repository';
import { UserNotificationSettingsRepository } from '@/src/user-notification-settings.repository';
import { UserPrivacySettingsRepository } from '@/src/user-privacy-settings.repository';
import { FindManyUsersDto } from '@/src/dto/find-many-users.dto';
import { createTSQuery, UploadService } from '@repo/common';
import {
  AUTH_SERVICE_NAME,
  AuthServiceClient,
  FindManyQueryDto,
  KAFKA_SERVICE_NAME,
  SYSTEM_SETTINGS_SERVICE_NAME,
  SystemSettingsServiceClient,
  SystemWideErrorCodes,
  UserFollowAcceptedEvent,
  UserFollowedEvent,
  USERS_TOPIC_USER_FOLLOW_ACCEPTED,
  USERS_TOPIC_USER_FOLLOWED,
  USERS_TOPIC_USER_UNFOLLOWED,
  UserUnfollowedEvent,
  UserUnfollowedEvent as UserUnfollowedEventPayload,
} from '@repo/types';
import { type ClientKafkaProxy, type ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { Metadata } from '@grpc/grpc-js';
import { Request } from 'express';
import { eq, and, gte, desc, or, notInArray, sql } from 'drizzle-orm';
import { FollowUserDto } from '@/src/dto/follow-user.dto';
import { UpdateUserFollowStatusDto } from '@/src/dto/update-user-follow-status.dto';
import { UpdateUserNotificationSettingsDto } from '@/src/dto/update-user-notification-settings.dto';
import { UpdateUserPrivacySettingsDto } from '@/src/dto/update-user-privacy-settings.dto';
import 'multer';

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);
  private systemSettingsService!: SystemSettingsServiceClient;
  private authService!: AuthServiceClient;

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly userNotificationSettingsRepository: UserNotificationSettingsRepository,
    private readonly userPrivacySettingsRepository: UserPrivacySettingsRepository,
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    @Inject(SYSTEM_SETTINGS_SERVICE_NAME)
    private readonly systemSettingsClient: ClientGrpc,
    @Inject(AUTH_SERVICE_NAME) private readonly authClient: ClientGrpc,
    private readonly uploadService: UploadService,
    @Inject(KAFKA_SERVICE_NAME)
    private readonly kafkaClient: ClientKafkaProxy,
  ) {}

  onModuleInit() {
    this.systemSettingsService =
      this.systemSettingsClient.getService<SystemSettingsServiceClient>(
        SYSTEM_SETTINGS_SERVICE_NAME,
      );
    this.authService =
      this.authClient.getService<AuthServiceClient>(AUTH_SERVICE_NAME);
  }

  async findManyUsers(findManyUsersDto: FindManyUsersDto) {
    return this.usersRepository.findMany(
      {
        where: findManyUsersDto.keyword
          ? sql`${createTSQuery<typeof users>(['name', 'username'], findManyUsersDto.keyword)}`
          : undefined,
      },
      findManyUsersDto,
    );
  }

  async findUserById(id: string) {
    const user = await this.usersRepository.findFirst({
      where: eq(users.id, id),
      with: {
        posts: {
          with: {
            postMedia: true,
          },
          limit: 3,
        },
        userPrivacySetting: true,
        followers: true,
        following: true,
      },
    });

    if (!user)
      throw new NotFoundException({
        code: SystemWideErrorCodes.NOT_FOUND,
        description: 'User not found.',
      });

    if (user.userPrivacySetting?.accountPrivate) {
      user.posts = [];
      return user;
    }

    return user;
  }

  async findUserByUsername(username: string) {
    const user = await this.usersRepository.findFirst({
      where: eq(users.username, username),
      with: {
        posts: {
          with: {
            postMedia: true,
          },
          limit: 3,
        },
        userPrivacySetting: true,
        followers: true,
        following: true,
      },
    });

    if (!user)
      throw new NotFoundException({
        code: SystemWideErrorCodes.NOT_FOUND,
        description: 'User not found.',
      });

    if (user.userPrivacySetting?.accountPrivate) {
      user.posts = [];
      return user;
    }

    return user;
  }

  async findUserByUsernameOnly(username: string) {
    const user = await this.usersRepository.findFirst({
      where: eq(users.username, username),
    });

    if (!user)
      throw new NotFoundException({
        code: SystemWideErrorCodes.NOT_FOUND,
        description: 'User not found.',
      });

    return user;
  }

  async findUserByEmail(email: string) {
    const user = await this.usersRepository.findFirst({
      where: eq(users.email, email),
    });

    if (!user)
      throw new NotFoundException({
        code: SystemWideErrorCodes.NOT_FOUND,
        description: 'User not found.',
      });

    return user;
  }

  async findUserFollowRequests(
    findManyQueryDto: FindManyQueryDto,
    user: typeof users.$inferSelect,
  ) {
    return this.db.query.followers.findMany({
      where: and(
        eq(followers.followingId, user.id),
        or(
          eq(followers.status, followersStatusEnum.enumValues[0]),
          eq(followers.status, followersStatusEnum.enumValues[2]),
        ), // pending or rejected
      ),
      with: {
        follower: true,
        following: true,
      },
      orderBy: desc(followers.createdAt),
      limit: findManyQueryDto.limit,
      offset: (findManyQueryDto.page - 1) * findManyQueryDto.limit,
    });
  }

  async updateUserFollowStatus(
    updateUserFollowStatusDto: UpdateUserFollowStatusDto,
    user: typeof users.$inferSelect,
  ) {
    if (updateUserFollowStatusDto.status === followersStatusEnum.enumValues[0])
      // pending
      throw new BadRequestException({
        code: SystemWideErrorCodes.UPDATE_FAILED,
        description: 'Cannot update follow request to "pending".',
      });

    const [result] = await this.db
      .update(schema.followers)
      .set({
        status: updateUserFollowStatusDto.status,
      })
      .where(
        and(
          eq(followers.followerId, updateUserFollowStatusDto.followerId),
          eq(followers.followingId, user.id),
        ),
      )
      .returning();

    if (updateUserFollowStatusDto.status === followersStatusEnum.enumValues[1])
      // accepted
      this.kafkaClient.emit(
        USERS_TOPIC_USER_FOLLOW_ACCEPTED,
        new UserFollowAcceptedEvent(
          updateUserFollowStatusDto.followerId,
          user.id,
        ),
      );

    return result;
  }

  async findSuggestedFollowingForUser(
    findManyQueryDto: FindManyQueryDto,
    user: typeof users.$inferSelect,
  ) {
    // Collect IDs the current user already follows (all statuses)
    const currentFollowing = await this.db.query.followers.findMany({
      where: eq(followers.followerId, user.id),
      columns: { followingId: true },
    });
    const excludedIds = [
      user.id,
      ...currentFollowing.map((f) => f.followingId),
    ];

    // Traverse one hop: friends-of-friends
    const friendsOfFriends = await this.db.query.followers.findMany({
      where: eq(followers.followerId, user.id),
      with: {
        following: {
          with: {
            followers: {
              with: {
                following: true,
              },
              limit: 10,
            },
          },
        },
      },
    });

    const candidates = friendsOfFriends
      .flatMap((f) => f.following)
      .flatMap((f) => f.followers)
      .map((f) => f.following)
      .filter((u) => !excludedIds.includes(u.id));

    // Deduplicate by user ID
    const seen = new Set<string>();
    const uniqueCandidates = candidates.filter((u) => {
      if (seen.has(u.id)) return false;
      seen.add(u.id);
      return true;
    });

    if (uniqueCandidates.length > 0) {
      return uniqueCandidates.slice(
        (findManyQueryDto.page - 1) * findManyQueryDto.limit,
        findManyQueryDto.page * findManyQueryDto.limit,
      );
    }

    // Fallback: popular users the current user doesn't already follow
    return await this.usersRepository.findMany(
      {
        where: notInArray(users.id, excludedIds),
        orderBy: desc(users.followersCount),
      },
      findManyQueryDto,
    );
  }

  async followUser(
    followUserDto: FollowUserDto,
    user: typeof users.$inferSelect,
  ) {
    if (followUserDto.followingUserId === user.id) {
      throw new BadRequestException({
        code: SystemWideErrorCodes.FOLLOW_SELF,
      });
    }

    try {
      const followingUser = await this.usersRepository.findFirst({
        where: eq(users.id, followUserDto.followingUserId),
        with: {
          userPrivacySetting: true,
        },
      });

      if (!followingUser)
        throw new NotFoundException({
          code: SystemWideErrorCodes.NOT_FOUND,
          description: 'The user you are trying to follow does not exist.',
        });

      const isPrivateAccount = followingUser.userPrivacySetting?.accountPrivate;

      const [result] = await this.db
        .insert(schema.followers)
        .values({
          followerId: user.id,
          followingId: followUserDto.followingUserId,
          status: isPrivateAccount
            ? followersStatusEnum.enumValues[0]
            : followersStatusEnum.enumValues[1], // 'pending' if private, otherwise 'approved'
        })
        .returning();

      this.kafkaClient.emit(
        USERS_TOPIC_USER_FOLLOWED,
        new UserFollowedEvent(user.id, followUserDto.followingUserId),
      );

      return result;
    } catch (error) {
      this.logger.error('Error creating follow relationship.', error);
      throw new InternalServerErrorException({
        code: SystemWideErrorCodes.CREATION_FAILED,
      });
    }
  }

  async unfollowUser(
    unfollowUserDto: FollowUserDto,
    user: typeof users.$inferSelect,
  ) {
    if (unfollowUserDto.followingUserId === user.id) {
      throw new BadRequestException({
        code: SystemWideErrorCodes.UNFOLLOW_SELF,
      });
    }

    try {
      const [result] = await this.db
        .delete(schema.followers)
        .where(
          and(
            eq(schema.followers.followerId, user.id),
            eq(schema.followers.followingId, unfollowUserDto.followingUserId),
          ),
        )
        .returning();

      this.kafkaClient.emit(
        USERS_TOPIC_USER_UNFOLLOWED,
        new UserUnfollowedEvent(user.id, unfollowUserDto.followingUserId),
      );

      return result;
    } catch (error) {
      this.logger.error('Error deleting follow relationship.', error);
      throw new InternalServerErrorException({
        code: SystemWideErrorCodes.DELETION_FAILED,
      });
    }
  }

  async uploadPhoto(
    media: Express.Multer.File,
    user: typeof users.$inferSelect,
    req: Request,
  ) {
    if (!media.mimetype.startsWith('image/'))
      throw new BadRequestException({
        code: SystemWideErrorCodes.UPLOAD_UNSUPPORTED_FILE_TYPE,
      });

    try {
      const { settings } = await firstValueFrom(
        this.systemSettingsService.findSettingsByPrefix(
          {
            prefixes: ['image'],
          },
          {} as Metadata,
        ),
      );

      const width = settings['image.avatar_width']?.intValue || 200;
      const height = settings['image.avatar_height']?.intValue || 200;

      media.buffer = await this.uploadService.preprocessImageFile(
        media.buffer,
        width,
        height,
      );
      media.originalname =
        media.originalname.split('.').slice(0, -1).join('.') + '.webp';
      media.mimetype = 'image/webp';

      if (user.image)
        await this.uploadService.deleteFile(user.image, media.mimetype);

      const resultUrlObj = await this.uploadService.uploadFile(
        media,
        'avatars',
      );

      const metadata = new Metadata();
      metadata.set('headers', JSON.stringify(req.headers));

      return await firstValueFrom(
        this.authService.updateUser(
          {
            image: resultUrlObj.mediaUrl,
          },
          metadata,
        ),
      );
    } catch (error) {
      this.logger.error('Error updating user image.', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException({
        code: SystemWideErrorCodes.UPLOAD_FILE_FAILED,
      });
    }
  }

  async adminUploadPhoto(media: Express.Multer.File) {
    if (!media.mimetype.startsWith('image/'))
      throw new BadRequestException({
        code: SystemWideErrorCodes.UPLOAD_UNSUPPORTED_FILE_TYPE,
      });

    try {
      const { settings } = await firstValueFrom(
        this.systemSettingsService.findSettingsByPrefix(
          {
            prefixes: ['image'],
          },
          {} as Metadata,
        ),
      );

      const width = settings['image.avatar_width']?.intValue || 200;
      const height = settings['image.avatar_height']?.intValue || 200;

      media.buffer = await this.uploadService.preprocessImageFile(
        media.buffer,
        width,
        height,
      );
      media.originalname =
        media.originalname.split('.').slice(0, -1).join('.') + '.webp';
      media.mimetype = 'image/webp';

      const resultUrlObj = await this.uploadService.uploadFile(
        media,
        'avatars',
      );

      return {
        url: resultUrlObj.mediaUrl,
      };
    } catch (error) {
      this.logger.error('Error uploading user image as admin.', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException({
        code: SystemWideErrorCodes.UPLOAD_FILE_FAILED,
      });
    }
  }

  async findUserNotificationSettings(userId: string) {
    const [settings] = await this.db
      .select()
      .from(schema.userNotificationSettings)
      .where(eq(schema.userNotificationSettings.userId, userId))
      .limit(1);

    return (
      settings || {
        likesNotifications: true,
        commentsNotifications: true,
        newFollowersNotifications: true,
        mentionsNotifications: true,
        messagesNotifications: true,
        videoCallsNotifications: true,
      }
    );
  }

  async updateUserNotificationSettings(
    userId: string,
    dto: UpdateUserNotificationSettingsDto,
  ) {
    const [existing] = await this.db
      .select()
      .from(schema.userNotificationSettings)
      .where(eq(schema.userNotificationSettings.userId, userId))
      .limit(1);

    if (existing) {
      return await this.userNotificationSettingsRepository.update(
        existing.id,
        dto,
      );
    } else {
      return await this.userNotificationSettingsRepository.create({
        userId,
        ...dto,
      });
    }
  }

  async updateUserPrivacySettings(
    userId: string,
    dto: UpdateUserPrivacySettingsDto,
  ) {
    const [existing] = await this.db
      .select()
      .from(schema.userPrivacySettings)
      .where(eq(schema.userPrivacySettings.userId, userId))
      .limit(1);
    console.log(dto);
    if (existing) {
      return await this.userPrivacySettingsRepository.update(existing.id, dto);
    } else {
      return await this.userPrivacySettingsRepository.create({
        userId,
        ...dto,
      });
    }
  }
}
