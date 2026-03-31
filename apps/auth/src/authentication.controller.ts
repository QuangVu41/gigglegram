import {
  AuthenticatedSessionResponse,
  AuthServiceController,
  AuthServiceControllerMethods,
  PermissionSet,
  UpdateUserRequest,
  type Empty,
} from '@repo/types';
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Metadata } from '@grpc/grpc-js';
import { AuthenticationService } from '@/src/authentication.service';
import { AddMembersDto } from '@/src/dto/add-members.dto';
import { PermGuard } from '@/src/guards/perm.guard';
import { Perms } from '@repo/common';

@UseGuards(PermGuard)
@Controller()
@AuthServiceControllerMethods()
export class AuthenticationController implements AuthServiceController {
  constructor(private readonly authenticationService: AuthenticationService) {}

  async authenticate(
    request: Empty,
    metadata: Metadata,
  ): Promise<AuthenticatedSessionResponse> {
    return await this.authenticationService.authenticate(request, metadata);
  }

  async hasPermission(request: PermissionSet, metadata: Metadata) {
    return await this.authenticationService.hasPermission(request, metadata);
  }

  async updateUser(request: UpdateUserRequest, metadata: Metadata) {
    return await this.authenticationService.updateUser(request, metadata);
  }

  @Perms({ member: ['create'] })
  @Post('add-members')
  async addMembers(@Body() addMembersDto: AddMembersDto) {
    return await this.authenticationService.addMembers(addMembersDto);
  }
}
