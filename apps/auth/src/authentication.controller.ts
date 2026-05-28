import {
  AuthenticatedSessionResponse,
  AuthServiceController,
  AuthServiceControllerMethods,
  PermissionSet,
  UpdateUserRequest,
  FindManyQueryDto,
  type Empty,
} from '@repo/types';
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  Patch,
  Delete,
} from '@nestjs/common';
import { Metadata } from '@grpc/grpc-js';
import { AuthenticationService } from '@/src/authentication.service';
import { AddMembersDto } from '@/src/dto/add-members.dto';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  DeleteManyOrganizationsDto,
  SaveOrganizationRoleDto,
} from '@/src/dto/organization-ops.dto';
import { PermGuard } from '@/src/guards/perm.guard';
import { Perms, CurrentUser } from '@repo/common';
import { users } from '@repo/database';

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

  @Perms({ member: ['delete'] })
  @Post('remove-members')
  async removeMembers(@Body() removeMembersDto: AddMembersDto) {
    return await this.authenticationService.removeMembers(removeMembersDto);
  }

  @Get('list-members/{:slug}')
  async listOrganizationMembers(@Param('slug') slug: string) {
    return await this.authenticationService.listOrganizationMembers(slug);
  }

  @Get('organizations/stats')
  async getOrganizationsStats() {
    return await this.authenticationService.getOrganizationsStats();
  }

  @Get('organizations')
  async listOrganizations(@Query() findManyQueryDto: FindManyQueryDto) {
    return await this.authenticationService.listOrganizations(findManyQueryDto);
  }

  @Get('user-organizations')
  async listUserOrganizations(@Query() findManyQueryDto: FindManyQueryDto) {
    return await this.authenticationService.listUserOrganizations(findManyQueryDto);
  }

  @Perms({ organization: ['update', 'delete'] })
  @Post('organizations')
  async createOrganization(
    @Body() createOrgDto: CreateOrganizationDto,
    @CurrentUser() currentUser: typeof users.$inferSelect,
  ) {
    return await this.authenticationService.createOrganizationAdmin(
      createOrgDto,
      currentUser?.id,
    );
  }

  @Perms({ organization: ['update', 'delete'] })
  @Patch('organizations/{:id}')
  async updateOrganization(
    @Param('id') id: string,
    @Body() updateOrgDto: UpdateOrganizationDto,
  ) {
    return await this.authenticationService.updateOrganizationAdmin(
      id,
      updateOrgDto,
    );
  }

  @Perms({ organization: ['update', 'delete'] })
  @Delete('organizations/{:id}')
  async deleteOrganization(@Param('id') id: string) {
    return await this.authenticationService.deleteOrganizationAdmin(id);
  }

  @Perms({ organization: ['update', 'delete'] })
  @Post('organizations/delete-many')
  async deleteManyOrganizations(
    @Body() deleteManyDto: DeleteManyOrganizationsDto,
  ) {
    return await this.authenticationService.deleteManyOrganizationsAdmin(
      deleteManyDto,
    );
  }

  @Perms({ organization: ['update', 'delete'] })
  @Get('organizations/{:id}/roles')
  async listOrganizationRoles(@Param('id') id: string) {
    return await this.authenticationService.listOrganizationRolesAdmin(id);
  }

  @Perms({ organization: ['update', 'delete'] })
  @Post('organizations/{:id}/roles')
  async saveOrganizationRole(
    @Param('id') id: string,
    @Body() saveRoleDto: SaveOrganizationRoleDto,
  ) {
    return await this.authenticationService.saveOrganizationRoleAdmin(
      id,
      saveRoleDto,
    );
  }
}
