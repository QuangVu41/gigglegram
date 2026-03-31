import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { UsersService } from '@/src/users.service';
import { FindManyUsersDto } from '@/src/dto/find-many-users.dto';
import { CurrentUser, FilesValidatorInterceptor } from '@repo/common';
import { users } from '@repo/database';
import { type Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { FindManyQueryDto } from '@repo/types';
import { UpdateUserFollowStatusDto } from '@/src/dto/update-user-follow-status.dto';
import { FollowUserDto } from '@/src/dto/follow-user.dto';

@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findManyUsers(@Query() findManyUsersDto: FindManyUsersDto) {
    return await this.usersService.findManyUsers(findManyUsersDto);
  }

  @Get('username/{:username}')
  async findUserByUsername(@Param('username') username: string) {
    return await this.usersService.findUserByUsername(username);
  }

  @Get('follow-requests')
  async findUserFollowRequests(
    @Query() findManyQueryDto: FindManyQueryDto,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return await this.usersService.findUserFollowRequests(
      findManyQueryDto,
      user,
    );
  }

  @Post('follow')
  async followUser(
    @Body() followUserDto: FollowUserDto,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return await this.usersService.followUser(followUserDto, user);
  }

  @Post('unfollow')
  async unfollowUser(
    @Body() followUserDto: FollowUserDto,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return await this.usersService.unfollowUser(followUserDto, user);
  }

  @Post('upload-photo')
  @UseInterceptors(FilesValidatorInterceptor)
  @UseInterceptors(FileInterceptor('media'))
  async uploadPhoto(
    @UploadedFile('media') media: Express.Multer.File,
    @CurrentUser() user: typeof users.$inferSelect,
    @Req() req: Request,
  ) {
    return await this.usersService.uploadPhoto(media, user, req);
  }

  @Get('suggested-following')
  async findSuggestedFollowingForUser(
    @Query() findManyQueryDto: FindManyQueryDto,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return this.usersService.findSuggestedFollowingForUser(
      findManyQueryDto,
      user,
    );
  }

  @Patch('follow-requests')
  async updateUserFollowStatus(
    @Query() updateUserFollowStatusDto: UpdateUserFollowStatusDto,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return await this.usersService.updateUserFollowStatus(
      updateUserFollowStatusDto,
      user,
    );
  }

  @Get('{:userId}')
  async findUserById(@Param('userId') userId: string) {
    return await this.usersService.findUserById(userId);
  }
}
