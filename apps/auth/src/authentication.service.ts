import { Metadata } from '@grpc/grpc-js';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import {
  AuthenticatedSessionResponse,
  Empty,
  PermissionSet,
  SystemWideErrorCodes,
  UpdateUserRequest,
} from '@repo/types';
import { AuthService } from '@thallesp/nestjs-better-auth';
import { auth } from '@/src/lib/auth';
import { fromNodeHeaders } from 'better-auth/node';
import { RpcException } from '@nestjs/microservices';
import { AddMembersDto } from '@/src/dto/add-members.dto';
import { extractHeadersFromMetadata } from '@repo/common';
import { transformPermissionsObj } from '@repo/common';

@Injectable()
export class AuthenticationService {
  private readonly logger = new Logger(AuthenticationService.name);

  constructor(private readonly baAuthService: AuthService<typeof auth>) {}

  async authenticate(request: Empty, metadata: Metadata) {
    const headers = extractHeadersFromMetadata(metadata);
    try {
      const session = await this.baAuthService.api.getSession({
        headers: fromNodeHeaders(headers),
      });
      if (!session)
        throw new RpcException(SystemWideErrorCodes.AUTH_UNAUTHORIZED);

      return session as unknown as AuthenticatedSessionResponse;
    } catch (error) {
      this.logger.error('Authentication failed.', error);
      throw new RpcException(SystemWideErrorCodes.AUTH_UNAUTHORIZED);
    }
  }

  async hasPermission(request: PermissionSet, metadata: Metadata) {
    const headers = extractHeadersFromMetadata(metadata);
    const permissions = transformPermissionsObj(request);
    try {
      const hasPerm = await this.baAuthService.api.hasPermission({
        headers: fromNodeHeaders(headers),
        body: {
          permissions,
        },
      });

      if (hasPerm.success) {
        return {
          success: true,
        };
      }
      return {
        success: false,
      };
    } catch (error) {
      this.logger.error('Permission check failed.', error);
      return {
        success: false,
      };
    }
  }

  async updateUser(request: UpdateUserRequest, metadata: Metadata) {
    const headers = extractHeadersFromMetadata(metadata);
    try {
      const res = await this.baAuthService.api.updateUser({
        headers: fromNodeHeaders(headers),
        body: {
          ...request,
          gender: request.gender as any,
          lastActiveAt: request.lastActiveAt
            ? new Date(request.lastActiveAt)
            : undefined,
        },
      });

      return res;
    } catch (error) {
      this.logger.error('Failed to update user.', error);
      throw new RpcException(SystemWideErrorCodes.UPDATE_FAILED);
    }
  }

  async addMembers(addMembersDto: AddMembersDto) {
    try {
      const res = await Promise.all([
        ...addMembersDto.userIds.map((userId) =>
          this.baAuthService.api.addMember({
            body: {
              role: 'default' as any,
              userId: userId,
              organizationId: addMembersDto.organizationId,
            },
          }),
        ),
      ]);

      return res;
    } catch (error) {
      this.logger.error('Adding member failed.', error);
      if (error instanceof Error && (error as any)?.body)
        throw new BadRequestException({
          code: (error as any)?.body?.code,
          message: (error as any)?.body?.message,
        });
      throw new InternalServerErrorException({
        code: SystemWideErrorCodes.INTERNAL_SERVER_ERROR,
      });
    }
  }
}
