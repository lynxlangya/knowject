import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { readRequiredHexString } from '@config/env.js';

const ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY_BYTES = 32;
const INITIALIZATION_VECTOR_BYTES = 16;

const getEncryptionKey = (): Buffer => {
  const rawKey = readRequiredHexString('SETTINGS_ENCRYPTION_KEY', ENCRYPTION_KEY_BYTES);
  const key = Buffer.from(rawKey, 'hex');

  if (key.length !== ENCRYPTION_KEY_BYTES) {
    throw new Error(
      `SETTINGS_ENCRYPTION_KEY 解码后长度不正确，需为 ${ENCRYPTION_KEY_BYTES} 字节`,
    );
  }

  return key;
};

export const encryptApiKey = (plaintext: string): string => {
  const key = getEncryptionKey();
  const initializationVector = randomBytes(INITIALIZATION_VECTOR_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, initializationVector);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    initializationVector.toString('hex'),
    authTag.toString('hex'),
    encrypted.toString('hex'),
  ].join(':');
};

export const decryptApiKey = (ciphertext: string): string => {
  const key = getEncryptionKey();
  const [initializationVectorHex, authTagHex, encryptedHex] = ciphertext.split(':');

  if (!initializationVectorHex || !authTagHex || !encryptedHex) {
    throw new Error('加密数据格式不正确');
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(initializationVectorHex, 'hex'),
  );
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, 'hex')),
    decipher.final(),
  ]).toString('utf8');
};

export const maskApiKey = (plaintext: string): string => {
  if (plaintext.length <= 4) {
    return '****';
  }

  return `...${plaintext.slice(-4)}`;
};

export const isEncryptionKeyConfigured = (): boolean => {
  try {
    readRequiredHexString('SETTINGS_ENCRYPTION_KEY', ENCRYPTION_KEY_BYTES);
    return true;
  } catch {
    return false;
  }
};
