import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

export type NodeEnvironment = 'development' | 'test' | 'production';

export interface AppEnv {
  workspaceRoot: string;
  packageRoot: string;
  nodeEnv: NodeEnvironment;
  appName: string;
  port: number;
  logLevel: string;
  corsOrigin: string;
  mongo: {
    uri: string;
    dbName: string;
    host: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
    issuer: string;
    audience: string;
  };
  argon2: {
    memoryCost: number;
    timeCost: number;
    parallelism: number;
  };
  apiErrors: {
    exposeDetails: boolean;
    includeStack: boolean;
  };
}

let cachedEnv: AppEnv | null = null;

const currentFilePath = fileURLToPath(import.meta.url);
const packageRoot = resolve(dirname(currentFilePath), '../..');

const findWorkspaceRoot = (startDir: string): string => {
  let currentDir = resolve(startDir);

  while (true) {
    if (existsSync(join(currentDir, 'pnpm-workspace.yaml'))) {
      return currentDir;
    }

    const parentDir = dirname(currentDir);

    if (parentDir === currentDir) {
      return startDir;
    }

    currentDir = parentDir;
  }
};

const workspaceRoot = findWorkspaceRoot(packageRoot);

const loadEnvironmentFiles = (): void => {
  const candidates = [join(workspaceRoot, '.env.local'), join(workspaceRoot, '.env')];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      dotenv.config({ path: candidate });
    }
  }
};

const readRequiredString = (name: string): string => {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

const readPositiveInteger = (name: string): number => {
  const raw = readRequiredString(name);
  const parsed = Number.parseInt(raw, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Environment variable ${name} must be a positive integer`);
  }

  return parsed;
};

const readBoolean = (name: string): boolean => {
  const raw = readRequiredString(name).toLowerCase();

  if (raw === 'true') {
    return true;
  }

  if (raw === 'false') {
    return false;
  }

  throw new Error(`Environment variable ${name} must be "true" or "false"`);
};

const readNodeEnvironment = (): NodeEnvironment => {
  const value = readRequiredString('NODE_ENV');

  if (value === 'development' || value === 'test' || value === 'production') {
    return value;
  }

  throw new Error('Environment variable NODE_ENV must be development, test, or production');
};

const parseMongoHost = (uri: string): string => {
  try {
    return new URL(uri).host || 'unknown';
  } catch {
    return 'unknown';
  }
};

export const getEnv = (): AppEnv => {
  if (cachedEnv) {
    return cachedEnv;
  }

  loadEnvironmentFiles();

  const mongoUri = readRequiredString('MONGODB_URI');

  cachedEnv = {
    workspaceRoot,
    packageRoot,
    nodeEnv: readNodeEnvironment(),
    appName: readRequiredString('APP_NAME'),
    port: readPositiveInteger('PORT'),
    logLevel: readRequiredString('LOG_LEVEL'),
    corsOrigin: readRequiredString('CORS_ORIGIN'),
    mongo: {
      uri: mongoUri,
      dbName: readRequiredString('MONGODB_DB_NAME'),
      host: parseMongoHost(mongoUri),
    },
    jwt: {
      secret: readRequiredString('JWT_SECRET'),
      expiresIn: readRequiredString('JWT_EXPIRES_IN'),
      issuer: readRequiredString('JWT_ISSUER'),
      audience: readRequiredString('JWT_AUDIENCE'),
    },
    argon2: {
      memoryCost: readPositiveInteger('ARGON2_MEMORY_COST'),
      timeCost: readPositiveInteger('ARGON2_TIME_COST'),
      parallelism: readPositiveInteger('ARGON2_PARALLELISM'),
    },
    apiErrors: {
      exposeDetails: readBoolean('API_ERROR_EXPOSE_DETAILS'),
      includeStack: readBoolean('API_ERROR_INCLUDE_STACK'),
    },
  };

  return cachedEnv;
};
