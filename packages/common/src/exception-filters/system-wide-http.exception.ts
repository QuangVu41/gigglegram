import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import {
  SystemWideErrorCodes,
  SystemWideErrorMessages,
  SystemWideHttpExceptionResponse,
} from '@repo/types';
import { Response } from 'express';

@Catch(HttpException, Error)
export class SystemWideHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SystemWideHttpExceptionFilter.name);

  catch(exception: HttpException | Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    let errorRes: SystemWideHttpExceptionResponse;
    let status: number;
    const stack = exception.stack;
    const description = exception.message;
    let code: string;

    this.logger.error(exception);

    if (exception instanceof HttpException) {
      errorRes = exception.getResponse() as SystemWideHttpExceptionResponse;
      status = exception.getStatus();

      code = errorRes.code
        ? errorRes.code
        : SystemWideErrorCodes.INTERNAL_SERVER_ERROR &&
            status.toString().startsWith('5')
          ? SystemWideErrorCodes.INTERNAL_SERVER_ERROR
          : SystemWideErrorCodes.GENERAL_CLIENT_ERROR;
    } else if ((exception as any)?.body) {
      errorRes = {
        code: (exception as any)?.body?.code,
        description: (exception as any)?.body?.message,
        message: (exception as any)?.body?.message,
      };
      status = (exception as any)?.statusCode || 400;
      code = (exception as any)?.body?.code;
    } else {
      errorRes = {
        code: SystemWideErrorCodes.INTERNAL_SERVER_ERROR,
        description: exception.message,
        message: exception.message,
      };
      status = 500;
      code = SystemWideErrorCodes.INTERNAL_SERVER_ERROR;
    }

    res.status(status).json({
      success: false,
      code,
      message: SystemWideErrorMessages[code] || description,
      description: errorRes.description || errorRes.message || description,
      statusCode: status,
      stack,
    });
  }
}
