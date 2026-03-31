import { SystemWideErrorCodes, SystemWideErrorMessages } from '@repo/types';
import { IncomingMessage, ServerResponse } from 'http';

export const sendInternalErrorRes = (
  res: ServerResponse<IncomingMessage>,
  error: Error,
) => {
  res.writeHead(500, {
    'Content-Type': 'application/json',
  });
  res.end(
    JSON.stringify({
      success: false,
      code: SystemWideErrorCodes.INTERNAL_SERVER_ERROR,
      message: SystemWideErrorMessages.INTERNAL_SERVER_ERROR,
      description: error.message,
      statusCode: 500,
      stack: error.stack,
    }),
  );
};
