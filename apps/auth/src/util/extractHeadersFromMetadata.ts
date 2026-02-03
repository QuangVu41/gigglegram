import { Metadata } from '@grpc/grpc-js';
import { IncomingHttpHeaders } from 'http';

export const extractHeadersFromMetadata = (metadata: Metadata) => {
  const headers = JSON.parse(
    (metadata.get('headers')?.[0] as string) || '{}',
  ) as IncomingHttpHeaders;
  return headers;
};
