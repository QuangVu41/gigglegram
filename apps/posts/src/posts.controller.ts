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
import { FilesValidatorInterceptor } from '@/src/interceptors/files-validator.interceptor';
import { FilterPostsDto } from '@/src/dto/filter-posts.dto';

@Controller()
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get('{:postId}')
  async findPostById(@Param('postId') postId: string) {
    return await this.postsService.findPostById(postId);
  }

  @Get()
  async findManyPosts(@Query() filterPostsDto: FilterPostsDto) {
    return await this.postsService.findManyPosts(filterPostsDto);
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

  @Perms(
    { post: ['update'] },
    {
      resourceKey: 'posts',
      resourceParamIdKey: 'postId',
    },
  )
  @Patch('{:postId}')
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
  @Delete('{:postId}')
  async deletePost(@Param('postId') postId: string) {
    return await this.postsService.deletePost(postId);
  }
}
