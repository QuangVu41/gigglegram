import {
  AUTH_SERVICE_NAME,
  AuthServiceClient,
  SystemWideErrorCodes,
} from '@repo/types';
import {
  Inject,
  Injectable,
  Logger,
  NestMiddleware,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { type ClientGrpc } from '@nestjs/microservices';
import { NextFunction, Request, Response } from 'express';
import { Metadata } from '@grpc/grpc-js';
import { tap } from 'rxjs';

@Injectable()
export class AuthProtectMiddleware implements NestMiddleware, OnModuleInit {
  private readonly logger = new Logger(AuthProtectMiddleware.name);
  private authService!: AuthServiceClient;
  private readonly publicPaths = ['/api/users/username'];

  constructor(
    @Inject(AUTH_SERVICE_NAME) private readonly authClient: ClientGrpc,
  ) {}

  onModuleInit() {
    this.authService =
      this.authClient.getService<AuthServiceClient>(AUTH_SERVICE_NAME);
  }

  use(req: Request, res: Response, next: NextFunction) {
    if (
      this.publicPaths.some((path) => req.originalUrl.startsWith(path)) &&
      req.method === 'GET'
    )
      return next();

    const metadata = new Metadata();
    metadata.set('headers', JSON.stringify(req.headers));

    this.authService
      .authenticate({}, metadata)
      .pipe(
        tap((authenticatedSession) => {
          req['user'] = authenticatedSession.user;
          req['session'] = authenticatedSession.session;
        }),
      )
      .subscribe({
        next: () => {
          next();
        },
        error: (error) => {
          if (error instanceof Error) {
            this.logger.error('Authentication failed.', error);
            return next(
              new UnauthorizedException({
                code:
                  error.message.split(':')[1]?.trim() ||
                  SystemWideErrorCodes.AUTH_UNAUTHORIZED,
              }),
            );
          }
          next(error);
        },
      });
  }
}
