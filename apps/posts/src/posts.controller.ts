import {
  Body,
  Controller,
  ParseFilePipeBuilder,
  Post,
  UnprocessableEntityException,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { PostsService } from '@/src/posts.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CreatePostDto } from '@/src/dto/create-post.dto';
import { SystemWideErrorCodes } from '@repo/types';
import {
  CurrentUser,
  FileTypeBasedOnMimetypeValidator,
  MaxSizeBasedOnMimetypeValidator,
} from '@repo/common';
import { users } from '@repo/database';

@Controller()
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('media'))
  async createPost(
    @UploadedFiles(
      new ParseFilePipeBuilder()
        .addValidator(
          new FileTypeBasedOnMimetypeValidator({
            fileTypeRegexAsString: process.env.DEFAULT_FILE_TYPE_REGEX!,
          }),
        )
        .addValidator(
          new MaxSizeBasedOnMimetypeValidator({
            maxImageSizeInBytes: parseInt(
              process.env.DEFAULT_IMAGE_SIZE_IN_BYTES!,
            ),
            maxVideoSizeInBytes: parseInt(
              process.env.DEFAULT_VIDEO_SIZE_IN_BYTES!,
            ),
          }),
        )
        .build({
          exceptionFactory: (error) => {
            return new UnprocessableEntityException({
              code: SystemWideErrorCodes.UPLOAD_PROCESSING_FILE_FAILED,
              message: error,
            });
          },
        }),
    )
    media: Array<Express.Multer.File>,
    @Body() createPostDto: CreatePostDto,
    @CurrentUser() user: typeof users.$inferInsert,
  ) {
    return await this.postsService.createPost(media, createPostDto, user);
  }
}
