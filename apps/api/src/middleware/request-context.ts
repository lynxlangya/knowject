import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

export const requestContextMiddleware: RequestHandler = (req, res, next) => {
  const requestId = req.header('x-request-id')?.trim() || randomUUID();

  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  next();
};
