import {
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CollectionsRepository } from '@/src/collections/collections.repository';
import {
  DATABASE_CONNECTION,
  savedCollections,
  schema,
  users,
} from '@repo/database';
import { eq, and, inArray } from 'drizzle-orm';
import { SystemWideErrorCodes } from '@repo/types';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { CreateCollectionDto } from '@/src/collections/dto/create-collection.dto';
import { UpdateCollectionDto } from '@/src/collections/dto/update-collection.dto';
import { AddPostsToCollectionDto } from '@/src/collections/dto/add-posts-to-collection.dto';
import { DeletePostsFromCollectionDto } from '@/src/collections/dto/delete-posts-from-collection.dto';
import { FindManySavedCollectionsDto } from '@/src/collections/dto/find-many-saved-collections.dto';
import { like } from 'drizzle-orm';

@Injectable()
export class CollectionsService {
  private readonly logger = new Logger(CollectionsService.name);

  constructor(
    private readonly collectionsRepository: CollectionsRepository,
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findSavedCollectionById(
    collectionId: string,
    user: typeof users.$inferSelect,
  ) {
    try {
      const collection = await this.collectionsRepository.findFirst({
        where: and(
          eq(savedCollections.id, collectionId),
          eq(savedCollections.userId, user.id),
        ),
        with: {
          savedPosts: {
            with: {
              post: {
                with: {
                  postMedia: true,
                },
              },
            },
          },
        },
      });

      return collection;
    } catch (error) {
      this.logger.error('Error fetching saved collection by ID.', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException({
        code: SystemWideErrorCodes.FETCHING_FAILED,
      });
    }
  }

  async findSavedCollections(
    findManySavedCollectionsDto: FindManySavedCollectionsDto,
    user: typeof users.$inferSelect,
  ) {
    try {
      const conditions: any[] = [];
      if (findManySavedCollectionsDto.all !== 'true') {
        conditions.push(eq(schema.savedCollections.userId, user.id));
      }
      if (findManySavedCollectionsDto.keyword) {
        conditions.push(
          like(
            schema.savedCollections.name,
            `%${findManySavedCollectionsDto.keyword}%`,
          ),
        );
      }

      const savedCollections = await this.collectionsRepository.findMany(
        {
          where: conditions.length > 0 ? and(...conditions) : undefined,
          with: {
            user: true,
            savedPosts: {
              with: {
                post: {
                  with: {
                    postMedia: true,
                  },
                },
              },
            },
          },
        },
        findManySavedCollectionsDto,
      );

      return savedCollections;
    } catch (error) {
      this.logger.error('Error fetching saved collections.', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException({
        code: SystemWideErrorCodes.FETCHING_FAILED,
      });
    }
  }

  async createCollection(
    createCollectionDto: CreateCollectionDto,
    user: typeof users.$inferSelect,
  ) {
    try {
      const createdCollection = await this.collectionsRepository.create({
        name: createCollectionDto.name,
        userId: user.id,
        postsCount: createCollectionDto.savedPostIds
          ? createCollectionDto.savedPostIds.length
          : 0,
      });

      if (createdCollection && createCollectionDto.savedPostIds) {
        await this.db
          .update(schema.savedPosts)
          .set({ collectionId: createdCollection.id })
          .where(
            and(
              eq(schema.savedPosts.userId, user.id),
              inArray(
                schema.savedPosts.postId,
                createCollectionDto.savedPostIds,
              ),
            ),
          );
        return createdCollection;
      }
    } catch (error) {
      this.logger.error('Error creating saved posts collection.', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException({
        code: SystemWideErrorCodes.CREATION_FAILED,
      });
    }
  }

  async deleteCollection(
    collectionId: string,
    user: typeof users.$inferSelect,
  ) {
    try {
      const existingCollection = await this.collectionsRepository.findFirst({
        where: and(
          eq(savedCollections.id, collectionId),
          eq(savedCollections.userId, user.id),
        ),
      });
      if (!existingCollection)
        throw new BadRequestException({ code: SystemWideErrorCodes.NOT_FOUND });

      const deletedCollection =
        await this.collectionsRepository.delete(collectionId);

      return deletedCollection;
    } catch (error) {
      this.logger.error('Error deleting saved posts collection.', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException({
        code: SystemWideErrorCodes.DELETION_FAILED,
      });
    }
  }

  async deleteManyCollections(ids: string[], user: typeof users.$inferSelect) {
    try {
      if (ids.length === 0) return [];

      const deletedCollections = await this.db
        .delete(schema.savedCollections)
        .where(
          and(
            inArray(schema.savedCollections.id, ids),
            eq(schema.savedCollections.userId, user.id),
          ),
        )
        .returning();

      return deletedCollections;
    } catch (error) {
      this.logger.error(
        'Error deleting saved posts collections in bulk.',
        error,
      );
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException({
        code: SystemWideErrorCodes.DELETION_FAILED,
      });
    }
  }

  async updateCollection(
    collectionId: string,
    updateCollectionDto: UpdateCollectionDto,
    user: typeof users.$inferSelect,
  ) {
    try {
      const existingCollection = await this.collectionsRepository.findFirst({
        where: and(
          eq(savedCollections.id, collectionId),
          eq(savedCollections.userId, user.id),
        ),
      });
      if (!existingCollection)
        throw new NotFoundException({ code: SystemWideErrorCodes.NOT_FOUND });

      return await this.collectionsRepository.update(collectionId, {
        name: updateCollectionDto.name,
      });
    } catch (error) {
      this.logger.error('Error updating saved posts collection.', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException({
        code: SystemWideErrorCodes.UPDATE_FAILED,
      });
    }
  }

  async addPostsToCollection(
    collectionId: string,
    addPostsToCollectionDto: AddPostsToCollectionDto,
    user: typeof users.$inferSelect,
  ) {
    try {
      const existingCollection = await this.collectionsRepository.findFirst({
        where: and(
          eq(savedCollections.id, collectionId),
          eq(savedCollections.userId, user.id),
        ),
        with: {
          savedPosts: {
            columns: { postId: true },
          },
        },
      });
      if (!existingCollection)
        throw new NotFoundException({ code: SystemWideErrorCodes.NOT_FOUND });

      const newSavingPostIds = addPostsToCollectionDto.postIds.filter(
        (postId) =>
          !existingCollection.savedPosts.some(
            (savedPost) => savedPost.postId === postId,
          ),
      );

      if (newSavingPostIds.length === 0) {
        return [];
      }

      const [[addedSavedPosts]] = await Promise.all([
        this.db
          .insert(schema.savedPosts)
          .values(
            newSavingPostIds.map<typeof schema.savedPosts.$inferInsert>(
              (postId) => ({
                postId,
                userId: existingCollection.userId,
                collectionId: existingCollection.id,
              }),
            ),
          )
          .onConflictDoUpdate({
            target: [schema.savedPosts.userId, schema.savedPosts.postId],
            set: { collectionId: existingCollection.id },
          })
          .returning(),
        this.db
          .update(savedCollections)
          .set({
            postsCount: existingCollection.postsCount + newSavingPostIds.length,
          })
          .where(eq(savedCollections.id, existingCollection.id)),
      ]);

      return addedSavedPosts as typeof schema.savedPosts.$inferSelect;
    } catch (error) {
      this.logger.error('Error adding posts to collection.', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException({
        code: SystemWideErrorCodes.UPDATE_FAILED,
      });
    }
  }

  async deletePostsFromCollection(
    collectionId: string,
    deletePostsFromCollectionDto: DeletePostsFromCollectionDto,
    user: typeof users.$inferSelect,
  ) {
    try {
      const existingCollection = await this.collectionsRepository.findFirst({
        where: and(
          eq(savedCollections.id, collectionId),
          eq(savedCollections.userId, user.id),
        ),
        with: {
          savedPosts: {
            columns: { postId: true },
          },
        },
      });
      if (!existingCollection)
        throw new BadRequestException({ code: SystemWideErrorCodes.NOT_FOUND });

      const substractingPostsCount = existingCollection.savedPosts.filter(
        (savedPost) =>
          deletePostsFromCollectionDto.postIds.includes(savedPost.postId),
      ).length;

      const [[deletedSavedPosts]] = await Promise.all([
        this.db
          .delete(schema.savedPosts)
          .where(
            and(
              eq(schema.savedPosts.collectionId, existingCollection.id),
              inArray(
                schema.savedPosts.postId,
                deletePostsFromCollectionDto.postIds,
              ),
            ),
          )
          .returning(),
        this.db
          .update(savedCollections)
          .set({
            postsCount: existingCollection.postsCount - substractingPostsCount,
          })
          .where(eq(savedCollections.id, existingCollection.id)),
      ]);

      return deletedSavedPosts as typeof schema.savedPosts.$inferSelect;
    } catch (error) {
      this.logger.error('Error deleting posts from collection.', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException({
        code: SystemWideErrorCodes.UPDATE_FAILED,
      });
    }
  }
}
