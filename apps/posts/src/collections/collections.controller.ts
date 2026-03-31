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
import { CollectionsService } from '@/src/collections/collections.service';
import { CurrentUser } from '@repo/common';
import { users } from '@repo/database';
import { UpdateCollectionDto } from '@/src/collections/dto/update-collection.dto';
import { CreateCollectionDto } from '@/src/collections/dto/create-collection.dto';
import { AddPostsToCollectionDto } from '@/src/collections/dto/add-posts-to-collection.dto';
import { DeletePostsFromCollectionDto } from '@/src/collections/dto/delete-posts-from-collection.dto';
import { FindManySavedCollectionsDto } from '@/src/collections/dto/find-many-saved-collections.dto';

@Controller('collections')
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Get()
  async findSavedCollections(
    @Query() findManySavedCollectionsDto: FindManySavedCollectionsDto,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return await this.collectionsService.findSavedCollections(
      findManySavedCollectionsDto,
      user,
    );
  }

  @Post()
  async createCollection(
    @Body() createCollectionDto: CreateCollectionDto,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return await this.collectionsService.createCollection(
      createCollectionDto,
      user,
    );
  }

  @Get('{:collectionId}')
  async findSavedCollectionById(
    @Param('collectionId') collectionId: string,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return await this.collectionsService.findSavedCollectionById(
      collectionId,
      user,
    );
  }

  @Delete('{:collectionId}')
  async deleteCollection(
    @Param('collectionId') collectionId: string,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return await this.collectionsService.deleteCollection(collectionId, user);
  }

  @Patch('{:collectionId}')
  async updateCollection(
    @Param('collectionId') collectionId: string,
    @Body() updateCollectionDto: UpdateCollectionDto,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return await this.collectionsService.updateCollection(
      collectionId,
      updateCollectionDto,
      user,
    );
  }

  @Patch('{:collectionId}/add-posts')
  async addPostsToCollection(
    @Param('collectionId') collectionId: string,
    @Body() addPostsToCollectionDto: AddPostsToCollectionDto,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return await this.collectionsService.addPostsToCollection(
      collectionId,
      addPostsToCollectionDto,
      user,
    );
  }

  @Delete('{:collectionId}/delete-posts')
  async deletePostsFromCollection(
    @Param('collectionId') collectionId: string,
    @Body() deletePostsFromCollectionDto: DeletePostsFromCollectionDto,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return await this.collectionsService.deletePostsFromCollection(
      collectionId,
      deletePostsFromCollectionDto,
      user,
    );
  }
}
