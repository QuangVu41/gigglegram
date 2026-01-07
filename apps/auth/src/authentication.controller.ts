import {
  AuthenticatedSession,
  AuthServiceController,
  AuthServiceControllerMethods,
  SystemWideErrorCodes,
  type Empty,
} from '@repo/types';
import { Controller, Logger } from '@nestjs/common';
import { Metadata } from '@grpc/grpc-js';
import { AuthService } from '@thallesp/nestjs-better-auth';
import { auth } from '@/src/lib/auth';
import { fromNodeHeaders } from 'better-auth/node';
import { IncomingHttpHeaders } from 'http';
import { RpcException } from '@nestjs/microservices';

@Controller()
@AuthServiceControllerMethods()
export class AuthenticationController implements AuthServiceController {
  private readonly logger = new Logger(AuthenticationController.name);

  constructor(private readonly authService: AuthService<typeof auth>) {}

  async authenticate(
    request: Empty,
    metadata: Metadata,
  ): Promise<AuthenticatedSession> {
    const headers = JSON.parse(
      metadata.get('headers')[0] as string,
    ) as IncomingHttpHeaders;
    try {
      const session = await this.authService.api.getSession({
        headers: fromNodeHeaders(headers),
      });
      if (!session)
        throw new RpcException(SystemWideErrorCodes.AUTH_UNAUTHORIZED);

      return session as unknown as AuthenticatedSession;
    } catch (error) {
      this.logger.error('Authentication failed.', error);
      throw new RpcException(SystemWideErrorCodes.AUTH_UNAUTHORIZED);
    }
  }
}
