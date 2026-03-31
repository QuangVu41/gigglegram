import { buildPathRewriteConfig } from '@/src/utils/build-path-rewrite-config';
import { sendInternalErrorRes } from '@/src/utils/send-internal-error-res';
import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { ClientRequest, IncomingMessage, ServerResponse } from 'http';
import { createProxyMiddleware } from 'http-proxy-middleware';

@Injectable()
export class BAAuthProxyMiddleware implements NestMiddleware {
  private readonly logger = new Logger(BAAuthProxyMiddleware.name);

  use = createProxyMiddleware({
    target: process.env.AUTH_SERVICE_URL!,
    changeOrigin: true,
    on: {
      proxyReq: this.onProxyReq.bind(this),
      error: this.onError.bind(this),
    },
    pathRewrite: buildPathRewriteConfig('auth'),
  });

  onError(
    error: Error,
    req: IncomingMessage,
    res: ServerResponse<IncomingMessage>,
  ) {
    this.logger.error('Error connecting to Auth Service.', error);
    sendInternalErrorRes(res, error);
  }

  onProxyReq(proxyReq: ClientRequest, req: IncomingMessage) {
    this.logger.log(`Proxying ${req.method} ${req.url} -> ${proxyReq.path}.`);
  }
}
