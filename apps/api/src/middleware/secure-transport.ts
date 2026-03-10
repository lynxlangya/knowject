import type { Request, RequestHandler } from 'express';
import type { AppEnv } from '@config/env.js';
import { AppError } from '@lib/app-error.js';

const HTTPS_PROTOCOL = 'https';

const getForwardedProtocols = (request: Request): string[] => {
  const headerValue = request.get('x-forwarded-proto');
  if (!headerValue) {
    return [];
  }

  return headerValue
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
};

const isSecureRequest = (request: Request): boolean => {
  if (request.secure) {
    return true;
  }

  return getForwardedProtocols(request).includes(HTTPS_PROTOCOL);
};

export const createSensitiveRouteTransportGuard = (env: AppEnv): RequestHandler => {
  return (request, response, next) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Pragma', 'no-cache');

    if (env.nodeEnv !== 'production' || isSecureRequest(request)) {
      next();
      return;
    }

    next(
      new AppError({
        statusCode: 426,
        code: 'SECURE_TRANSPORT_REQUIRED',
        message: '生产环境中的认证与鉴权请求必须通过 HTTPS 发送',
        details: {
          transport: 'https_required',
        },
      }),
    );
  };
};
