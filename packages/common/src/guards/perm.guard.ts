import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermsDecType } from '@common/src/decorators/perms.decorator';
import { AUTH_SERVICE_NAME, AuthServiceClient } from '@repo/types';
import { type ClientGrpc } from '@nestjs/microservices';
import { transformToPermissionSet } from '@common/src/utils';
import { Metadata } from '@grpc/grpc-js';
import { firstValueFrom } from 'rxjs';
import { Request } from 'express';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION, schema, users } from '@repo/database';
import { eq } from 'drizzle-orm';

@Injectable()
export class PermGuard implements CanActivate, OnModuleInit {
  private authService!: AuthServiceClient;

  constructor(
    private readonly reflector: Reflector,
    @Inject(AUTH_SERVICE_NAME) private readonly client: ClientGrpc,
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  onModuleInit() {
    this.authService =
      this.client.getService<AuthServiceClient>(AUTH_SERVICE_NAME);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const headers = req.headers;
    if (!headers) return true;

    const { perms, ownedResource } =
      this.reflector.getAllAndOverride<PermsDecType>('perms', [
        context.getHandler(),
        context.getClass(),
      ]) || {};
    const userHeader = headers['gg-user'];

    if (!perms) return true;

    if (ownedResource && userHeader) {
      const { resourceKey, resourceParamIdKey } = ownedResource;
      const resourceId = req.params[resourceParamIdKey];
      const user = JSON.parse(userHeader as string);

      const currentUser = await this.db.query.users.findFirst({
        where: eq(users.id, user.id),
        columns: {},
        with: {
          [resourceKey]: {
            where: eq(schema[resourceKey].id as any, resourceId),
            columns: { id: true },
          },
        },
      });

      if (
        currentUser &&
        currentUser[resourceKey] &&
        Array.isArray(currentUser[resourceKey]) &&
        currentUser[resourceKey].length > 0
      )
        return true;
    }

    const permissionSet = transformToPermissionSet(perms);
    const metadata = new Metadata();
    metadata.set('headers', JSON.stringify(headers));

    return (
      await firstValueFrom(
        this.authService.hasPermission(permissionSet, metadata),
      )
    ).success;
  }
}
