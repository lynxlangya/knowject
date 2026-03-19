import type { Request, RequestHandler } from 'express';
import type { AppEnv } from '@config/env.js';
import { AppError } from '@lib/app-error.js';

const HTTPS_PROTOCOL = 'https';
const IPV4_MAPPED_IPV6_PREFIX = '::ffff:';

const normalizeRemoteAddress = (remoteAddress: string | undefined): string | null => {
  if (!remoteAddress) {
    return null;
  }

  const trimmedAddress = remoteAddress.trim().toLowerCase();

  if (!trimmedAddress) {
    return null;
  }

  const zoneSeparatorIndex = trimmedAddress.indexOf('%');
  const zoneLessAddress =
    zoneSeparatorIndex >= 0 ? trimmedAddress.slice(0, zoneSeparatorIndex) : trimmedAddress;

  if (zoneLessAddress.startsWith(IPV4_MAPPED_IPV6_PREFIX)) {
    return zoneLessAddress.slice(IPV4_MAPPED_IPV6_PREFIX.length);
  }

  return zoneLessAddress;
};

const isPrivateIpv4Address = (address: string): boolean => {
  const octets = address.split('.').map((segment) => Number.parseInt(segment, 10));

  if (octets.length !== 4 || octets.some((value) => Number.isNaN(value) || value < 0 || value > 255)) {
    return false;
  }

  const [firstOctet, secondOctet] = octets;

  return (
    firstOctet === 10 ||
    firstOctet === 127 ||
    (firstOctet === 172 && secondOctet >= 16 && secondOctet <= 31) ||
    (firstOctet === 192 && secondOctet === 168)
  );
};

const isTrustedProxySource = (request: Request): boolean => {
  const remoteAddress = normalizeRemoteAddress(request.socket.remoteAddress);

  if (!remoteAddress) {
    return false;
  }

  if (
    remoteAddress === '::1' ||
    remoteAddress === '0:0:0:0:0:0:0:1' ||
    remoteAddress.startsWith('fc') ||
    remoteAddress.startsWith('fd') ||
    remoteAddress.startsWith('fe80:')
  ) {
    return true;
  }

  return isPrivateIpv4Address(remoteAddress);
};

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

  if (!isTrustedProxySource(request)) {
    return false;
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
