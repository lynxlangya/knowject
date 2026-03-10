import { jwtVerify, SignJWT } from 'jose';
import type { AppEnv } from '@config/env.js';
import type { AccessTokenPayload } from './auth.types.js';

const encoder = new TextEncoder();

const getJwtSecret = (env: AppEnv): Uint8Array => {
  return encoder.encode(env.jwt.secret);
};

export const signAccessToken = async (
  env: AppEnv,
  payload: AccessTokenPayload,
): Promise<string> => {
  return new SignJWT({
    username: payload.username,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setIssuer(env.jwt.issuer)
    .setAudience(env.jwt.audience)
    .setExpirationTime(env.jwt.expiresIn)
    .sign(getJwtSecret(env));
};

export const verifyAccessToken = async (
  env: AppEnv,
  token: string,
): Promise<AccessTokenPayload> => {
  const verified = await jwtVerify(token, getJwtSecret(env), {
    issuer: env.jwt.issuer,
    audience: env.jwt.audience,
  });

  const subject = verified.payload.sub;
  const username = verified.payload.username;

  if (typeof subject !== 'string' || typeof username !== 'string') {
    throw new Error('Invalid access token payload');
  }

  return {
    sub: subject,
    username,
  };
};
