import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { PostsService } from '@/src/posts.service';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { CreatePostDto } from '@/src/dto/create-post.dto';
import { CurrentUser, Perms } from '@repo/common';
import { users } from '@repo/database';
import { UpdatePostDto } from '@/src/dto/update-post.dto';
import { UpdatePostCollaborationDto } from '@/src/dto/update-post-collaboration.dto';
import { UpdatePostUserTagStatusDto } from '@/src/dto/update-post-user-tag-status.dto';
import { FilesValidatorInterceptor } from '@repo/common';
import { FindManyPostsDto } from '@/src/dto/find-many-posts.dto';
import { SavePostDto } from '@/src/dto/save-post.dto';
import { FindManySavedPostsDto } from '@/src/dto/find-many-saved-posts.dto';
import { FindManyPostsByHashtagDto } from '@/src/dto/find-many-posts-by-hashtag.dto';
import { TranslateTextDto } from '@/src/dto/translate-text.dto';
import { FindManyQueryDto } from '@repo/types';
import { DeleteManyPostsDto } from '@/src/dto/delete-many-posts.dto';
import { DeleteManyHashtagsDto } from '@/src/dto/delete-many-hashtags.dto';
import { FindManyHashtagsDto } from '@/src/dto/find-many-hashtags.dto';
import { CreateHashtagDto } from '@/src/dto/create-hashtag.dto';
import { UpdateHashtagDto } from '@/src/dto/update-hashtag.dto';
import { FindManyAudioDto } from '@/src/dto/find-many-audio.dto';
import { SaveAudioTrackDto } from '@/src/dto/save-audio-track.dto';
import { DeleteManyAudioDto } from '@/src/dto/delete-many-audio.dto';
import { UpdateAudioDto } from '@/src/dto/update-audio.dto';
import { FindManyPostMediaDto } from '@/src/dto/find-many-post-media.dto';
import { UpdatePostMediaModerationDto } from '@/src/dto/update-post-media-moderation.dto';
import { UpdateManyPostMediaModerationDto } from '@/src/dto/update-many-post-media-moderation.dto';
import 'multer';

@Controller('')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  async findManyPosts(@Query() findManyPostsDto: FindManyPostsDto) {
    return await this.postsService.findManyPosts(findManyPostsDto);
  }

  @Get('stats')
  async getPostsStats(@Query() findManyPostsDto: FindManyPostsDto) {
    return await this.postsService.getPostsStats(findManyPostsDto);
  }

  @Get('post-hashtags')
  async findManyPostsByHashtag(
    @Query() findManyPostsByHashtagDto: FindManyPostsByHashtagDto,
  ) {
    return await this.postsService.findManyPostsByHashtag(
      findManyPostsByHashtagDto,
    );
  }

  @Get('hashtags/stats')
  async getHashtagsStats(@Query() findManyHashtagsDto: FindManyHashtagsDto) {
    return await this.postsService.getHashtagsStats(findManyHashtagsDto);
  }

  @Get('hashtags')
  async findManyHashtags(@Query() findManyHashtagsDto: FindManyHashtagsDto) {
    return await this.postsService.findManyHashtags(findManyHashtagsDto);
  }

  @Perms({ post: ['delete'] })
  @Delete('hashtags/bulk')
  async deleteManyHashtags(
    @Body() deleteManyHashtagsDto: DeleteManyHashtagsDto,
  ) {
    return await this.postsService.deleteManyHashtags(
      deleteManyHashtagsDto.ids,
    );
  }

  @Perms({ post: ['delete'] })
  @Delete('hashtags/by/{:hashtagId}')
  async deleteHashtag(@Param('hashtagId') hashtagId: string) {
    return await this.postsService.deleteHashtag(hashtagId);
  }

  @Perms({ post: ['create'] })
  @Post('hashtags')
  async createHashtag(@Body() createHashtagDto: CreateHashtagDto) {
    return await this.postsService.createHashtag(createHashtagDto);
  }

  @Perms({ post: ['update'] })
  @Patch('hashtags/by/{:hashtagId}')
  async updateHashtag(
    @Param('hashtagId') hashtagId: string,
    @Body() updateHashtagDto: UpdateHashtagDto,
  ) {
    return await this.postsService.updateHashtag(hashtagId, updateHashtagDto);
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

  @Get('user-likes')
  async findManyUserLikedPosts(
    @Query() findManyPostsDto: FindManyPostsDto,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return await this.postsService.findManyUserLikedPosts(
      findManyPostsDto,
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
  @Perms({ post: ['delete'] })
  @Delete('bulk')
  async deleteManyPosts(@Body() deleteManyPostsDto: DeleteManyPostsDto) {
    return await this.postsService.deleteManyPosts(deleteManyPostsDto.ids);
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

  @Patch('collab-invites')
  async updatePostCollaboration(
    @Query() updatePostCollaborationDto: UpdatePostCollaborationDto,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return await this.postsService.updatePostCollaboration(
      updatePostCollaborationDto,
      user,
    );
  }

  @Patch('tags')
  async updatePostUserTag(
    @Query() updatePostUserTagStatusDto: UpdatePostUserTagStatusDto,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return await this.postsService.updatePostUserTagStatus(
      updatePostUserTagStatusDto,
      user,
    );
  }

  @Post('generate-caption')
  @UseInterceptors(
    FilesValidatorInterceptor.setOptions({ fileIsRequired: true }),
  )
  @UseInterceptors(FilesInterceptor('media'))
  async generateCaption(
    @UploadedFiles()
    media: Array<Express.Multer.File>,
    @Query('lang') lang: string = 'vi',
  ) {
    return await this.postsService.generateCaptionFromLocalMedia(media, lang);
  }

  @Post('generate-hashtags')
  @UseInterceptors(
    FilesValidatorInterceptor.setOptions({ fileIsRequired: true }),
  )
  @UseInterceptors(FilesInterceptor('media'))
  async generateHashtags(
    @UploadedFiles()
    media: Array<Express.Multer.File>,
  ) {
    return await this.postsService.generateHashtagsFromLocalMedia(media);
  }

  @Post('translate-text')
  async translateText(@Body() translateTextDto: TranslateTextDto) {
    return await this.postsService.translateText(
      translateTextDto.text,
      translateTextDto.targetLang,
      translateTextDto.sourceLang,
    );
  }

  @Get('audio')
  async findManyAudio(@Query() findManyAudioDto: FindManyAudioDto) {
    return await this.postsService.findManyAudio(findManyAudioDto);
  }

  @Get('audio/stats')
  async getAudioStats(@Query() findManyAudioDto: FindManyAudioDto) {
    return await this.postsService.getAudioStats(findManyAudioDto);
  }

  @Perms({ post: ['delete'] })
  @Delete('audio/bulk')
  async deleteManyAudio(@Body() deleteManyAudioDto: DeleteManyAudioDto) {
    return await this.postsService.deleteManyAudio(deleteManyAudioDto.ids);
  }

  @Perms({ post: ['delete'] })
  @Delete('audio/by/{:id}')
  async deleteAudio(@Param('id') id: string) {
    return await this.postsService.deleteAudio(id);
  }

  @Perms({ post: ['update'] })
  @Patch('audio/by/{:id}')
  async updateAudio(
    @Param('id') id: string,
    @Body() updateAudioDto: UpdateAudioDto,
  ) {
    return await this.postsService.updateAudio(id, updateAudioDto);
  }

  @Get('audio/my-saved')
  async findManyMySavedAudio(
    @Query() findManyAudioDto: FindManyAudioDto,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return await this.postsService.findManyMySavedAudio(findManyAudioDto, user);
  }

  @Get('audio/{:id}')
  async findAudioById(@Param('id') id: string) {
    return await this.postsService.findAudioById(id);
  }

  @Post('audio/save')
  async saveAudioTrack(
    @Body() saveAudioTrackDto: SaveAudioTrackDto,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return await this.postsService.saveAudioTrack(saveAudioTrackDto, user);
  }

  @Delete('audio/unsave/{:audioTrackId}')
  async unsaveAudioTrack(
    @Param('audioTrackId') audioTrackId: string,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return await this.postsService.unsaveAudioTrack(audioTrackId, user);
  }

  @Perms({ report: ['update'] })
  @Get('media')
  async findManyPostMedia(@Query() findManyPostMediaDto: FindManyPostMediaDto) {
    return await this.postsService.findManyPostMedia(findManyPostMediaDto);
  }

  @Perms({ report: ['update'] })
  @Get('media/stats')
  async getPostMediaStats(@Query() findManyPostMediaDto: FindManyPostMediaDto) {
    return await this.postsService.getPostMediaStats(findManyPostMediaDto);
  }

  @Perms({ report: ['update'] })
  @Patch('media/bulk/moderation')
  async updateManyPostMediaModeration(
    @Body() updateManyDto: UpdateManyPostMediaModerationDto,
  ) {
    return await this.postsService.updateManyPostMediaModeration(updateManyDto);
  }

  @Perms({ report: ['update'] })
  @Patch('media/by/{:mediaId}/moderation')
  async updatePostMediaModeration(
    @Param('mediaId') mediaId: string,
    @Body() updateDto: UpdatePostMediaModerationDto,
  ) {
    return await this.postsService.updatePostMediaModeration(
      mediaId,
      updateDto,
    );
  }
}
