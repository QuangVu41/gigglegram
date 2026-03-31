import { Body, Controller, Delete, Post } from '@nestjs/common';
import { LikesService } from '@/src/likes/likes.service';
import { LikeAPostDto } from '@/src/likes/dto/like-a-post.dto';

@Controller('likes')
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @Post()
  async likePost(@Body() likeAPostDto: LikeAPostDto) {
    return this.likesService.likePost(likeAPostDto);
  }

  @Delete()
  async unlikePost(@Body() likeAPostDto: LikeAPostDto) {
    return this.likesService.unlikePost(likeAPostDto);
  }
}
