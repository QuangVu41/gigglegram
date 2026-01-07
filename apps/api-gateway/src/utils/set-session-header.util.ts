import { ClientRequest, IncomingMessage } from 'http';

export const setSessionHeader = (
  proxyReq: ClientRequest,
  req: IncomingMessage,
) => {
  if (req['user']) {
    proxyReq.setHeader('gg-user', JSON.stringify(req['user']));
  }

  if (req['session']) {
    proxyReq.setHeader('gg-session', JSON.stringify(req['session']));
  }
};
