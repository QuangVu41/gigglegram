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
import { FindManyUsersDto } from '@/src/dto/find-many-users.dto';
import { sql } from 'drizzle-orm';
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
} from '@repo/types';
import { type ClientKafkaProxy, type ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { Metadata } from '@grpc/grpc-js';
import { Request } from 'express';
import { eq } from 'drizzle-orm';
import { FollowUserDto } from '@/src/dto/follow-user.dto';
import { and } from 'drizzle-orm';
import { gte } from 'drizzle-orm';
import { desc } from 'drizzle-orm';
import { UpdateUserFollowStatusDto } from '@/src/dto/update-user-follow-status.dto';
import { or } from 'drizzle-orm';
import 'multer';

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);
  private systemSettingsService!: SystemSettingsServiceClient;
  private authService!: AuthServiceClient;

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    @Inject(SYSTEM_SETTINGS_SERVICE_NAME)
    private readonly systemSettingsClient: ClientGrpc,
    @Inject(AUTH_SERVICE_NAME) private readonly authClient: ClientGrpc,
    private readonly usersRepository: UsersRepository,
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
    const following = await this.db.query.followers.findMany({
      where: eq(followers.followerId, user.id),
      with: {
        following: {
          with: {
            followers: {
              with: {
                following: {
                  with: {
                    followers: {
                      with: {
                        following: true,
                      },
                      limit: 5,
                    },
                  },
                },
              },
              limit: 5,
            },
          },
        },
      },
      limit: findManyQueryDto.limit,
      offset: (findManyQueryDto.page - 1) * findManyQueryDto.limit,
    });

    const suggestedFollowing = following
      .flatMap((f) => f.following)
      .flatMap((f) => f.followers)
      .flatMap((f) => f.following)
      .flatMap((f) => f.followers)
      .flatMap((f) => f.following)
      .filter((u) => u.id !== user.id);

    if (suggestedFollowing.length === 0)
      return await this.usersRepository.findMany(
        {
          where: gte(users.followersCount, 0),
          orderBy: desc(users.followersCount),
        },
        findManyQueryDto,
      );

    const uniqueSuggestedFollowing = Array.from(
      new Set(suggestedFollowing.map((u) => u.id)),
    ).map((id) => suggestedFollowing.find((u) => u.id === id));

    return uniqueSuggestedFollowing;
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
    if (media.mimetype.startsWith('image/'))
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
}
