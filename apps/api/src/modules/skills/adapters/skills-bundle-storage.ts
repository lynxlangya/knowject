import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { AppEnv } from "@config/env.js";
import {
  SKILL_ENTRY_FILE_NAME,
  assertSafeBundleRelativePath,
} from "../skills.shared.js";
import type { SkillBundleFileRecord } from "../skills.types.js";
import type { SkillBundleContentFile } from "../types/skills.service.types.js";

export const mapBundleFiles = (
  files: SkillBundleContentFile[],
): SkillBundleFileRecord[] => {
  return files.map((file) => ({
    path: assertSafeBundleRelativePath(file.path),
    size: file.size,
  }));
};

export const toBundleContentFiles = (
  files: Array<{
    path: string;
    content: Buffer;
    size: number;
  }>,
): SkillBundleContentFile[] => {
  return files.map((file) => ({
    path: assertSafeBundleRelativePath(file.path),
    content: file.content,
    size: file.size,
  }));
};

export const buildManualBundleFiles = (
  skillMarkdown: string,
): SkillBundleContentFile[] => {
  const content = Buffer.from(skillMarkdown, "utf8");

  return [
    {
      path: SKILL_ENTRY_FILE_NAME,
      content,
      size: content.length,
    },
  ];
};

export const upsertSkillEntryFile = (
  existingFiles: SkillBundleFileRecord[],
  skillMarkdown: string,
): {
  file: SkillBundleContentFile;
  bundleFiles: SkillBundleFileRecord[];
} => {
  const content = Buffer.from(skillMarkdown, "utf8");
  const nextEntryFile = {
    path: SKILL_ENTRY_FILE_NAME,
    content,
    size: content.length,
  };
  const filteredFiles = existingFiles.filter(
    (file) => file.path !== SKILL_ENTRY_FILE_NAME,
  );

  return {
    file: nextEntryFile,
    bundleFiles: [
      ...filteredFiles,
      { path: SKILL_ENTRY_FILE_NAME, size: content.length },
    ].sort((left, right) => left.path.localeCompare(right.path)),
  };
};

export const ensureSkillsStorageRoot = async (env: AppEnv): Promise<void> => {
  await mkdir(env.skills.storageRoot, { recursive: true });
};

export const writeSkillBundleFiles = async (
  env: AppEnv,
  storagePath: string,
  bundleFiles: SkillBundleContentFile[],
  options?: {
    replaceDirectory?: boolean;
  },
): Promise<void> => {
  const rootDirectory = join(env.skills.storageRoot, storagePath);

  if (options?.replaceDirectory) {
    await rm(rootDirectory, { recursive: true, force: true });
  }

  await mkdir(rootDirectory, { recursive: true });

  await Promise.all(
    bundleFiles.map(async (file) => {
      const safePath = assertSafeBundleRelativePath(file.path);
      const targetFilePath = join(rootDirectory, safePath);

      await mkdir(dirname(targetFilePath), { recursive: true });
      await writeFile(targetFilePath, file.content);
    }),
  );
};

export const deleteSkillBundleFiles = async (
  env: AppEnv,
  storagePath: string,
): Promise<void> => {
  await rm(join(env.skills.storageRoot, storagePath), {
    recursive: true,
    force: true,
  });
};
