import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { decryptApiKey, encryptApiKey, isEncryptionKeyConfigured } from './crypto.js';

const TEST_ENCRYPTION_KEY =
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

test('crypto reads settings encryption key from SETTINGS_ENCRYPTION_KEY_FILE', async () => {
  const originalKey = process.env.SETTINGS_ENCRYPTION_KEY;
  const originalKeyFile = process.env.SETTINGS_ENCRYPTION_KEY_FILE;
  const tempDir = await mkdtemp(join(tmpdir(), 'knowject-crypto-'));
  const keyFilePath = join(tempDir, 'settings_encryption_key.txt');

  await writeFile(keyFilePath, `${TEST_ENCRYPTION_KEY}\n`, 'utf8');
  delete process.env.SETTINGS_ENCRYPTION_KEY;
  process.env.SETTINGS_ENCRYPTION_KEY_FILE = keyFilePath;

  try {
    const ciphertext = encryptApiKey('sk-test-1234');

    assert.notEqual(ciphertext, 'sk-test-1234');
    assert.equal(decryptApiKey(ciphertext), 'sk-test-1234');
    assert.equal(isEncryptionKeyConfigured(), true);
  } finally {
    if (originalKey === undefined) {
      delete process.env.SETTINGS_ENCRYPTION_KEY;
    } else {
      process.env.SETTINGS_ENCRYPTION_KEY = originalKey;
    }

    if (originalKeyFile === undefined) {
      delete process.env.SETTINGS_ENCRYPTION_KEY_FILE;
    } else {
      process.env.SETTINGS_ENCRYPTION_KEY_FILE = originalKeyFile;
    }

    await rm(tempDir, { recursive: true, force: true });
  }
});
