import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { PostsService } from '@/src/posts.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CreatePostDto } from '@/src/dto/create-post.dto';
import { CurrentUser, Perms } from '@repo/common';
import { users } from '@repo/database';
import { UpdatePostDto } from '@/src/dto/update-post.dto';
import { FilesValidatorInterceptor } from '@repo/common';
import { FindManyPostsDto } from '@/src/dto/find-many-posts.dto';
import { SavePostDto } from '@/src/dto/save-post.dto';
import { FindManySavedPostsDto } from '@/src/dto/find-many-saved-posts.dto';
import { FindManyPostsByHashtagDto } from '@/src/dto/find-many-posts-by-hashtag.dto';
import { FindManyQueryDto } from '@repo/types';
import 'multer';

@Controller('')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  async findManyPosts(@Query() findManyPostsDto: FindManyPostsDto) {
    return await this.postsService.findManyPosts(findManyPostsDto);
  }

  @Get('post-hashtags')
  async findManyPostsByHashtag(
    @Query() findManyPostsByHashtagDto: FindManyPostsByHashtagDto,
  ) {
    return await this.postsService.findManyPostsByHashtag(
      findManyPostsByHashtagDto,
    );
  }

  @Get('hashtags')
  async findManyHashtags(@Query() findManyHashtagsDto: FindManyQueryDto) {
    return await this.postsService.findManyHashtags(findManyHashtagsDto);
  }

  @Post()
  @UseInterceptors(FilesValidatorInterceptor)
  @UseInterceptors(FilesInterceptor('media'))
  async createPost(
    @UploadedFiles()
    media: Array<Express.Multer.File>,
    @Body() createPostDto: CreatePostDto,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return await this.postsService.createPost(media, createPostDto, user);
  }

  @Get('tagged')
  async findManyTaggedPosts(
    @Query() findManyPostsDto: FindManyPostsDto,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return await this.postsService.findManyTaggedPosts(findManyPostsDto, user);
  }

  @Get('user-posts')
  async findManyUserPosts(
    @Query() findManyPostsDto: FindManyPostsDto,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return await this.postsService.findManyUserPosts(findManyPostsDto, user);
  }

  @Get('user-archive')
  async findManyUserArchivedPosts(
    @Query() findManyPostsDto: FindManyPostsDto,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return await this.postsService.findManyUserArchivedPosts(
      findManyPostsDto,
      user,
    );
  }

  @Get('user-save')
  async findManyUserSavedPosts(
    @Query() findManySavedPostsDto: FindManySavedPostsDto,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return await this.postsService.findManyUserSavedPosts(
      findManySavedPostsDto,
      user,
    );
  }

  @Post('save')
  async savePost(
    @Body() savePostDto: SavePostDto,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return await this.postsService.savePost(savePostDto, user);
  }

  @Get('by/{:postId}')
  async findPostById(@Param('postId') postId: string) {
    return await this.postsService.findPostById(postId);
  }

  @Perms(
    { post: ['update'] },
    {
      resourceKey: 'posts',
      resourceParamIdKey: 'postId',
    },
  )
  @Patch('by/{:postId}')
  async updatePost(
    @Param('postId') postId: string,
    @Body() updatePostDto: UpdatePostDto,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return await this.postsService.updatePost(postId, updatePostDto, user);
  }

  @Perms(
    { post: ['delete'] },
    {
      resourceKey: 'posts',
      resourceParamIdKey: 'postId',
    },
  )
  @Delete('by/{:postId}')
  async deletePost(@Param('postId') postId: string) {
    return await this.postsService.deletePost(postId);
  }

  @Delete('unsave/{:postId}')
  async unsavePost(
    @Param('postId') postId: string,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return await this.postsService.unsavePost(postId, user);
  }
}
