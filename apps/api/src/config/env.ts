import { existsSync, readFileSync } from 'node:fs';
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
  chroma: {
    url: string | null;
    host: string | null;
    heartbeatPath: string;
    tenant: string;
    database: string;
    requestTimeoutMs: number;
  };
  knowledge: {
    storageRoot: string;
    indexerUrl: string;
    indexerRequestTimeoutMs: number;
  };
  openai: {
    apiKey: string | null;
    baseUrl: string;
    embeddingModel: string;
    requestTimeoutMs: number;
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
const ENV_FILE_SUFFIX = '_FILE';

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

const getSiblingEnvName = (name: string): string => {
  if (name.endsWith(ENV_FILE_SUFFIX)) {
    return name.slice(0, -ENV_FILE_SUFFIX.length);
  }

  return `${name}${ENV_FILE_SUFFIX}`;
};

const validateParsedEnvironment = (
  filePath: string,
  parsedEnvironment: Record<string, string>,
): void => {
  for (const name of Object.keys(parsedEnvironment)) {
    const siblingName = getSiblingEnvName(name);

    if (siblingName && siblingName in parsedEnvironment) {
      throw new Error(
        `Environment file ${filePath} cannot define both ${name} and ${siblingName}`,
      );
    }
  }
};

const loadEnvironmentFiles = (): void => {
  const candidates = [join(workspaceRoot, '.env'), join(workspaceRoot, '.env.local')];
  const baseEnvKeys = new Set(Object.keys(process.env));

  for (const candidate of candidates) {
    if (!existsSync(candidate)) {
      continue;
    }

    const parsedEnvironment = dotenv.parse(readFileSync(candidate));

    validateParsedEnvironment(candidate, parsedEnvironment);

    for (const [name, value] of Object.entries(parsedEnvironment)) {
      if (baseEnvKeys.has(name)) {
        continue;
      }

      const siblingName = getSiblingEnvName(name);

      if (siblingName && !baseEnvKeys.has(siblingName)) {
        delete process.env[siblingName];
      }

      process.env[name] = value;
    }
  }
};

const readConfiguredString = (name: string): string | null => {
  const directValue = process.env[name]?.trim();
  const filePath = process.env[`${name}_FILE`]?.trim();

  if (directValue && filePath) {
    throw new Error(`Environment variables ${name} and ${name}_FILE cannot be set together`);
  }

  if (directValue) {
    return directValue;
  }

  if (!filePath) {
    return null;
  }

  const fileValue = readFileSync(filePath, 'utf8').trim();

  if (!fileValue) {
    throw new Error(`Environment variable ${name}_FILE points to an empty file`);
  }

  return fileValue;
};

const readOptionalString = (name: string): string | null => {
  return readConfiguredString(name);
};

const readRequiredString = (name: string): string => {
  const value = readConfiguredString(name);

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

const readOptionalPositiveInteger = (name: string, fallback: number): number => {
  const raw = readOptionalString(name);

  if (!raw) {
    return fallback;
  }

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

const parseServiceHost = (url: string): string => {
  try {
    return new URL(url).host || 'unknown';
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
  const chromaUrl = readOptionalString('CHROMA_URL');

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
      host: parseServiceHost(mongoUri),
    },
    chroma: {
      url: chromaUrl,
      host: chromaUrl ? parseServiceHost(chromaUrl) : null,
      heartbeatPath: readOptionalString('CHROMA_HEARTBEAT_PATH') ?? '/api/v2/heartbeat',
      tenant: readOptionalString('CHROMA_TENANT') ?? 'default_tenant',
      database: readOptionalString('CHROMA_DATABASE') ?? 'default_database',
      requestTimeoutMs: readOptionalPositiveInteger('CHROMA_TIMEOUT_MS', 15000),
    },
    knowledge: {
      storageRoot:
        readOptionalString('KNOWLEDGE_STORAGE_ROOT') ??
        join(workspaceRoot, '.knowject-storage', 'knowledge'),
      indexerUrl:
        readOptionalString('KNOWLEDGE_INDEXER_URL') ?? 'http://127.0.0.1:8001',
      indexerRequestTimeoutMs: readOptionalPositiveInteger(
        'KNOWLEDGE_INDEXER_TIMEOUT_MS',
        15000,
      ),
    },
    openai: {
      apiKey: readOptionalString('OPENAI_API_KEY'),
      baseUrl: readOptionalString('OPENAI_BASE_URL') ?? 'https://api.openai.com/v1',
      embeddingModel:
        readOptionalString('OPENAI_EMBEDDING_MODEL') ?? 'text-embedding-3-small',
      requestTimeoutMs: readOptionalPositiveInteger('OPENAI_TIMEOUT_MS', 15000),
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
