import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { SystemWideErrorCodes, SystemWideErrorMessages } from '@repo/types';
import { Response } from 'express';

@Catch(HttpException)
export class SystemWideHttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const errorRes = exception.getResponse() as {
      code: string;
      description: string;
    };
    const status = exception.getStatus();
    const stack = exception.stack;
    const description = exception.message;

    const code = errorRes.code
      ? errorRes.code
      : SystemWideErrorCodes.INTERNAL_SERVER_ERROR &&
          status.toString().startsWith('5')
        ? SystemWideErrorCodes.INTERNAL_SERVER_ERROR
        : SystemWideErrorCodes.GENERAL_CLIENT_ERROR;

    res.status(status).json({
      code,
      message: SystemWideErrorMessages[code],
      description: errorRes.description || description,
      statusCode: status,
      stack,
    });
  }
}
