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
export class ProtectMiddleware implements NestMiddleware, OnModuleInit {
  private readonly logger = new Logger(ProtectMiddleware.name);
  private authService!: AuthServiceClient;

  constructor(
    @Inject(AUTH_SERVICE_NAME) private readonly authClient: ClientGrpc,
  ) {}

  onModuleInit() {
    this.authService =
      this.authClient.getService<AuthServiceClient>(AUTH_SERVICE_NAME);
  }

  use(req: Request, res: Response, next: NextFunction) {
    if (req.path === '/' || req.path === '/health') {
      return next();
    }

    if (req.headers['gg-user']) {
      req['user'] = JSON.parse(req.headers['gg-user'] as string);
    }

    if (req.headers['gg-session']) {
      req['session'] = JSON.parse(req.headers['gg-session'] as string);
    }

    if (req['user'] && req['session']) {
      return next();
    }

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
