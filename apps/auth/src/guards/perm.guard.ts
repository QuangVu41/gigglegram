import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthenticationService } from '@/src/authentication.service';
import { Reflector } from '@nestjs/core';
import { transformToPermissionSet, PermsDecType } from '@repo/common';
import { Metadata } from '@grpc/grpc-js';

@Injectable()
export class PermGuard implements CanActivate {
  constructor(
    private readonly authenticationService: AuthenticationService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const headers = req.headers;
    if (!headers) return true;

    const { perms } =
      this.reflector.getAllAndOverride<PermsDecType>('perms', [
        context.getHandler(),
        context.getClass(),
      ]) || {};

    if (!perms) return true;

    const permissionSet = transformToPermissionSet(perms);
    const metadata: Metadata = new Metadata();
    metadata.set('headers', JSON.stringify(headers));

    return (
      await this.authenticationService.hasPermission(permissionSet, metadata)
    ).success;
  }
}
