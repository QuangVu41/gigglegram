import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const userHeader = request.headers['gg-user'];

    if (request['user']) return request['user'];

    if (!userHeader) return null;

    try {
      return JSON.parse(userHeader as string);
    } catch {
      return null;
    }
  },
);

export const CurrentSession = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const sessionHeader = request.headers['gg-session'];

    if (request['session']) return request['session'];

    if (!sessionHeader) return null;

    try {
      return JSON.parse(sessionHeader as string);
    } catch {
      return null;
    }
  },
);
