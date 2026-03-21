import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import { resolveRequestLocale } from '@lib/locale.js';

export const requestContextMiddleware: RequestHandler = (req, res, next) => {
  const requestId = req.header('x-request-id')?.trim() || randomUUID();

  req.requestId = requestId;
  req.locale = resolveRequestLocale(req);
  res.setHeader('x-request-id', requestId);

  next();
};
