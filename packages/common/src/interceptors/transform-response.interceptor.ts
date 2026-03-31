import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Request } from 'express';
import { map, Observable } from 'rxjs';

export interface Response<T extends { _totalCount?: number }> {
  data: T | T[];
  metadata?: ResponseMetadata;
  success: boolean;
}

export interface ResponseMetadata {
  total: number;
  prevPage: number | null;
  page: number;
  nextPage: number | null;
  limit: number;
}

export class TransformResponseInterceptor<
  T extends { _totalCount?: number },
> implements NestInterceptor<T, Response<T>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<Response<T>> | Promise<Observable<Response<T>>> {
    const request = context.switchToHttp().getRequest<Request>();
    const page = parseInt((request.query.page as string) || '1');
    const limit = parseInt((request.query.limit as string) || '10');
    const httpMethod = request.method;

    return next.handle().pipe(
      map((data) => {
        if (Array.isArray(data) && httpMethod === 'GET') {
          return {
            success: true,
            metadata: {
              total: data['_totalCount'] || 0,
              prevPage: page > 1 ? page - 1 : null,
              page,
              nextPage: data.length === limit ? page + 1 : null,
              limit,
            },
            data,
          };
        }
        return { success: true, data };
      }),
    );
  }
}
