import { buildPathRewriteConfig } from '@/src/utils/build-path-rewrite-config';
import { sendInternalErrorRes } from '@/src/utils/send-internal-error-res';
import { setSessionHeader } from '@/src/utils/set-session-header';
import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { ClientRequest, IncomingMessage, ServerResponse } from 'http';
import { createProxyMiddleware } from 'http-proxy-middleware';

@Injectable()
export class SettingsProxyMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SettingsProxyMiddleware.name);

  use = createProxyMiddleware({
    target: process.env.SETTINGS_SERVICE_URL!,
    changeOrigin: true,
    on: {
      proxyReq: this.onProxyReq.bind(this),
      error: this.onError.bind(this),
    },
    pathRewrite: buildPathRewriteConfig('settings'),
  });

  onError(
    error: Error,
    req: IncomingMessage,
    res: ServerResponse<IncomingMessage>,
  ) {
    this.logger.error('Error connecting to Settings Service.', error);
    sendInternalErrorRes(res, error);
  }

  onProxyReq(proxyReq: ClientRequest, req: IncomingMessage) {
    this.logger.log(`Proxying ${req.method} ${req.url} -> ${proxyReq.path}.`);
    setSessionHeader(proxyReq, req);
  }
}
