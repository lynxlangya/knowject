import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { ObjectId } from 'mongodb';
import type { AppEnv } from '@config/env.js';
import { AppError } from '@lib/app-error.js';
import {
  createRequiredFieldError,
  createValidationAppError,
  readOptionalStringField,
} from '@lib/validation.js';
import { resolveImportedSkillBundle } from './skills.import.js';
import {
  mergeSkillMarkdownMetadata,
  parseSkillMarkdown,
  type ParsedSkillMarkdown,
} from './skills.markdown.js';
import { findRegisteredSkillById, listRegisteredSkills } from './skills.registry.js';
import type { SkillsRepository } from './skills.repository.js';
import {
  SKILL_ENTRY_FILE_NAME,
  createSkillInUseError,
  assertSafeBundleRelativePath,
  buildSkillMarkdownExcerpt,
  buildSkillSlug,
  createReadonlySystemSkillError,
  createSkillNotFoundError,
  createSkillSlugConflictError,
  matchesSkillFilters,
  normalizeSkillsListFilters,
  toSkillDetailResponse,
  toSkillSummaryResponse,
} from './skills.shared.js';
import type {
  CreateSkillInput,
  ImportSkillInput,
  ListSkillsInput,
  SkillBundleFileRecord,
  SkillDetailEnvelope,
  SkillDocument,
  SkillImportPreviewResponse,
  SkillLifecycleStatus,
  SkillMutationResponse,
  SkillsCommandContext,
  SkillsListResponse,
  UpdateSkillInput,
} from './skills.types.js';

interface SkillBundleContentFile {
  path: string;
  content: Buffer;
  size: number;
}

interface SkillReferenceCounts {
  projectCount: number;
  agentCount: number;
}

interface SkillUsageLookup {
  countManagedSkillReferences(skillId: string): Promise<SkillReferenceCounts>;
}

export interface SkillsService {
  listSkills(
    context: SkillsCommandContext,
    input?: ListSkillsInput,
  ): Promise<SkillsListResponse>;
  getSkillDetail(
    context: SkillsCommandContext,
    skillId: string,
  ): Promise<SkillDetailEnvelope>;
  createSkill(
    context: SkillsCommandContext,
    input: CreateSkillInput,
  ): Promise<SkillMutationResponse>;
  importSkill(
    context: SkillsCommandContext,
    input: ImportSkillInput,
  ): Promise<SkillMutationResponse | SkillImportPreviewResponse>;
  updateSkill(
    context: SkillsCommandContext,
    skillId: string,
    input: UpdateSkillInput,
  ): Promise<SkillMutationResponse>;
  deleteSkill(context: SkillsCommandContext, skillId: string): Promise<void>;
}

const sortSkillItems = <
  T extends {
    source: 'system' | 'custom' | 'imported';
    updatedAt: string;
    createdAt: string;
  },
>(
  items: T[],
): T[] => {
  return [...items].sort((left, right) => {
    const updatedAtDelta =
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();

    if (updatedAtDelta !== 0) {
      return updatedAtDelta;
    }

    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
};

const readRequiredSkillId = (skillId: string): string => {
  return skillId.trim();
};

const readOptionalLifecycleStatus = (
  value: unknown,
): SkillLifecycleStatus | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value === 'draft' || value === 'published') {
    return value;
  }

  throw createValidationAppError('lifecycleStatus 不合法', {
    lifecycleStatus: 'lifecycleStatus 只能为 draft 或 published',
  });
};

const readSkillMutationInput = <
  T extends CreateSkillInput | UpdateSkillInput | ImportSkillInput,
>(
  input: T,
): T => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw createValidationAppError('请求体必须为对象', {
      body: '请求体必须为对象',
    });
  }

  return input;
};

const readOptionalSkillMarkdown = (value: unknown): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw createValidationAppError('skillMarkdown 必须为字符串', {
      skillMarkdown: 'skillMarkdown 必须为字符串',
    });
  }

  return value;
};

const prepareSkillMarkdown = ({
  baseMarkdown,
  nextMarkdown,
  name,
  description,
}: {
  baseMarkdown?: string;
  nextMarkdown?: string;
  name?: string;
  description?: string;
}): ParsedSkillMarkdown => {
  const sourceMarkdown = nextMarkdown ?? baseMarkdown;

  if (!sourceMarkdown) {
    throw new AppError(createRequiredFieldError('skillMarkdown'));
  }

  if (name === undefined && description === undefined) {
    return parseSkillMarkdown(sourceMarkdown);
  }

  return mergeSkillMarkdownMetadata(sourceMarkdown, {
    ...(name !== undefined ? { name } : {}),
    ...(description !== undefined ? { description } : {}),
  });
};

const validateCreateSkillInput = (input: CreateSkillInput): ParsedSkillMarkdown => {
  const normalizedInput = readSkillMutationInput(input);
  const skillMarkdown = readOptionalSkillMarkdown(normalizedInput.skillMarkdown);
  const name = readOptionalStringField(normalizedInput.name, 'name');
  const description = readOptionalStringField(normalizedInput.description, 'description');

  return prepareSkillMarkdown({
    nextMarkdown: skillMarkdown,
    name,
    description,
  });
};

const validateUpdateSkillInput = (
  input: UpdateSkillInput,
  currentSkillMarkdown: string,
): {
  lifecycleStatus?: SkillLifecycleStatus;
  parsedSkill: ParsedSkillMarkdown;
} => {
  const normalizedInput = readSkillMutationInput(input);
  const skillMarkdown = readOptionalSkillMarkdown(normalizedInput.skillMarkdown);
  const name = readOptionalStringField(normalizedInput.name, 'name');
  const description = readOptionalStringField(normalizedInput.description, 'description');
  const lifecycleStatus = readOptionalLifecycleStatus(normalizedInput.lifecycleStatus);

  if (
    skillMarkdown === undefined &&
    name === undefined &&
    description === undefined &&
    lifecycleStatus === undefined
  ) {
    throw createValidationAppError('至少需要提供一个可更新字段', {
      skillMarkdown: '至少需要提供一个可更新字段',
      name: '至少需要提供一个可更新字段',
      description: '至少需要提供一个可更新字段',
      lifecycleStatus: '至少需要提供一个可更新字段',
    });
  }

  const parsedSkill = prepareSkillMarkdown({
    baseMarkdown: currentSkillMarkdown,
    nextMarkdown: skillMarkdown,
    name,
    description,
  });

  return {
    lifecycleStatus,
    parsedSkill,
  };
};

const mapBundleFiles = (
  files: SkillBundleContentFile[],
): SkillBundleFileRecord[] => {
  return files.map((file) => ({
    path: assertSafeBundleRelativePath(file.path),
    size: file.size,
  }));
};

const buildManualBundleFiles = (skillMarkdown: string): SkillBundleContentFile[] => {
  const content = Buffer.from(skillMarkdown, 'utf8');

  return [
    {
      path: SKILL_ENTRY_FILE_NAME,
      content,
      size: content.length,
    },
  ];
};

const upsertSkillEntryFile = (
  existingFiles: SkillBundleFileRecord[],
  skillMarkdown: string,
): {
  file: SkillBundleContentFile;
  bundleFiles: SkillBundleFileRecord[];
} => {
  const content = Buffer.from(skillMarkdown, 'utf8');
  const nextEntryFile = {
    path: SKILL_ENTRY_FILE_NAME,
    content,
    size: content.length,
  };
  const filteredFiles = existingFiles.filter((file) => file.path !== SKILL_ENTRY_FILE_NAME);

  return {
    file: nextEntryFile,
    bundleFiles: [...filteredFiles, { path: SKILL_ENTRY_FILE_NAME, size: content.length }].sort(
      (left, right) => left.path.localeCompare(right.path),
    ),
  };
};

const ensureSkillsStorageRoot = async (env: AppEnv): Promise<void> => {
  await mkdir(env.skills.storageRoot, { recursive: true });
};

const writeSkillBundleFiles = async (
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

const deleteSkillBundleFiles = async (env: AppEnv, storagePath: string): Promise<void> => {
  await rm(join(env.skills.storageRoot, storagePath), { recursive: true, force: true });
};

const buildPersistedSkillDocument = ({
  skillId,
  actorId,
  source,
  origin,
  parsedSkill,
  bundleFiles,
  importProvenance,
}: {
  skillId: ObjectId;
  actorId: string;
  source: 'custom' | 'imported';
  origin: 'manual' | 'github' | 'url';
  parsedSkill: ParsedSkillMarkdown;
  bundleFiles: SkillBundleContentFile[];
  importProvenance: SkillDocument['importProvenance'];
}): SkillDocument & { _id: NonNullable<SkillDocument['_id']> } => {
  const now = new Date();

  return {
    _id: skillId,
    name: parsedSkill.name,
    slug: buildSkillSlug(parsedSkill.name),
    description: parsedSkill.description,
    type: 'markdown_bundle',
    source,
    origin,
    handler: null,
    parametersSchema: null,
    runtimeStatus: 'contract_only',
    lifecycleStatus: 'draft',
    skillMarkdown: parsedSkill.skillMarkdown,
    markdownExcerpt: buildSkillMarkdownExcerpt(
      parsedSkill.skillMarkdown,
      parsedSkill.description,
    ),
    storagePath: skillId.toHexString(),
    bundleFiles: mapBundleFiles(bundleFiles),
    importProvenance,
    createdBy: actorId,
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
  };
};

const ensureUniqueSkillSlug = async (
  repository: Pick<SkillsRepository, 'findSkillBySlug'>,
  slug: string,
  excludeSkillId?: string,
): Promise<void> => {
  if (findRegisteredSkillById(slug)) {
    throw createSkillSlugConflictError(slug);
  }

  const existingSkill = await repository.findSkillBySlug(slug);

  if (existingSkill && existingSkill._id.toHexString() !== excludeSkillId) {
    throw createSkillSlugConflictError(slug);
  }
};

const buildSkillListMeta = (): SkillsListResponse['meta'] => {
  return {
    module: 'skills',
    stage: 'GA-09',
    registry: 'hybrid',
    builtinOnly: false,
    boundaries: {
      businessRuntime: 'node-express',
      registryStore: 'mongodb+fs',
      knowledgeAccess: 'service-layer-only',
      execution: 'service-linked-or-contract-only',
      import: 'github-or-raw-url',
      authoring: 'skill-markdown',
    },
  };
};

const EMPTY_SKILL_REFERENCE_COUNTS: SkillReferenceCounts = {
  projectCount: 0,
  agentCount: 0,
};

const hasSkillReferences = (counts: SkillReferenceCounts): boolean => {
  return counts.projectCount > 0 || counts.agentCount > 0;
};

const assertSkillNotInUse = async ({
  skillId,
  action,
  usageLookup,
}: {
  skillId: string;
  action: 'delete' | 'unpublish';
  usageLookup: SkillUsageLookup;
}): Promise<void> => {
  const counts = await usageLookup.countManagedSkillReferences(skillId);

  if (!hasSkillReferences(counts)) {
    return;
  }

  throw createSkillInUseError({
    action,
    projectCount: counts.projectCount,
    agentCount: counts.agentCount,
  });
};

export const createSkillsService = ({
  env,
  repository,
  usageLookup = {
    countManagedSkillReferences: async () => EMPTY_SKILL_REFERENCE_COUNTS,
  },
}: {
  env: AppEnv;
  repository: SkillsRepository;
  usageLookup?: SkillUsageLookup;
}): SkillsService => {
  return {
    listSkills: async (_context, input = {}) => {
      const filters = normalizeSkillsListFilters(input);
      const builtinSkills =
        !filters.source || filters.source === 'system' ? listRegisteredSkills() : [];
      const storedSkills =
        filters.source === 'system'
          ? []
          : await repository.listSkills({
              ...(filters.source ? { source: filters.source } : {}),
              ...(filters.lifecycleStatus
                ? { lifecycleStatus: filters.lifecycleStatus }
                : {}),
            });
      const items = sortSkillItems(
        [...builtinSkills, ...storedSkills.map((skill) => toSkillSummaryResponse(skill))].filter(
          (skill) => matchesSkillFilters(skill, filters),
        ),
      );

      return {
        total: items.length,
        items,
        meta: buildSkillListMeta(),
      };
    },

    getSkillDetail: async (_context, skillId) => {
      const normalizedSkillId = readRequiredSkillId(skillId);
      const builtinSkill = findRegisteredSkillById(normalizedSkillId);

      if (builtinSkill) {
        return {
          skill: builtinSkill,
        };
      }

      const skill = await repository.findSkillById(normalizedSkillId);

      if (!skill) {
        throw createSkillNotFoundError();
      }

      return {
        skill: toSkillDetailResponse(skill),
      };
    },

    createSkill: async ({ actor }, input) => {
      const parsedSkill = validateCreateSkillInput(input);
      const skillId = new ObjectId();
      const bundleFiles = buildManualBundleFiles(parsedSkill.skillMarkdown);
      const document = buildPersistedSkillDocument({
        skillId,
        actorId: actor.id,
        source: 'custom',
        origin: 'manual',
        parsedSkill,
        bundleFiles,
        importProvenance: null,
      });

      await ensureUniqueSkillSlug(repository, document.slug);
      await ensureSkillsStorageRoot(env);
      await writeSkillBundleFiles(env, document.storagePath, bundleFiles, {
        replaceDirectory: true,
      });

      try {
        const persistedSkill = await repository.createSkill(document);

        return {
          skill: toSkillDetailResponse(persistedSkill),
        };
      } catch (error) {
        await deleteSkillBundleFiles(env, document.storagePath);
        throw error;
      }
    },

    importSkill: async ({ actor }, input) => {
      const normalizedInput = readSkillMutationInput(input);
      const { bundle, dryRun } = await resolveImportedSkillBundle(normalizedInput);
      const parsedSkill = parseSkillMarkdown(bundle.skillMarkdown);
      const bundleFiles = bundle.bundleFiles.map((file) => ({
        path: assertSafeBundleRelativePath(file.path),
        content: file.content,
        size: file.size,
      }));

      if (dryRun) {
        return {
          preview: {
            source: 'imported',
            origin: bundle.origin,
            type: 'markdown_bundle',
            name: parsedSkill.name,
            description: parsedSkill.description,
            runtimeStatus: 'contract_only',
            lifecycleStatus: 'draft',
            bindable: false,
            markdownExcerpt: buildSkillMarkdownExcerpt(
              parsedSkill.skillMarkdown,
              parsedSkill.description,
            ),
            skillMarkdown: parsedSkill.skillMarkdown,
            bundleFiles: mapBundleFiles(bundleFiles),
            bundleFileCount: bundleFiles.length,
            importProvenance: bundle.importProvenance!,
          },
        };
      }

      const skillId = new ObjectId();
      const document = buildPersistedSkillDocument({
        skillId,
        actorId: actor.id,
        source: 'imported',
        origin: bundle.origin,
        parsedSkill,
        bundleFiles,
        importProvenance: bundle.importProvenance,
      });

      await ensureUniqueSkillSlug(repository, document.slug);
      await ensureSkillsStorageRoot(env);
      await writeSkillBundleFiles(env, document.storagePath, bundleFiles, {
        replaceDirectory: true,
      });

      try {
        const persistedSkill = await repository.createSkill(document);

        return {
          skill: toSkillDetailResponse(persistedSkill),
        };
      } catch (error) {
        await deleteSkillBundleFiles(env, document.storagePath);
        throw error;
      }
    },

    updateSkill: async (_context, skillId, input) => {
      const normalizedSkillId = readRequiredSkillId(skillId);
      const builtinSkill = findRegisteredSkillById(normalizedSkillId);

      if (builtinSkill) {
        throw createReadonlySystemSkillError();
      }

      const currentSkill = await repository.findSkillById(normalizedSkillId);

      if (!currentSkill) {
        throw createSkillNotFoundError();
      }

      const { lifecycleStatus, parsedSkill } = validateUpdateSkillInput(
        input,
        currentSkill.skillMarkdown,
      );
      const nextSlug = buildSkillSlug(parsedSkill.name);
      await ensureUniqueSkillSlug(repository, nextSlug, normalizedSkillId);
      const nextLifecycleStatus = lifecycleStatus ?? currentSkill.lifecycleStatus;

      if (
        currentSkill.lifecycleStatus === 'published' &&
        nextLifecycleStatus === 'draft'
      ) {
        await assertSkillNotInUse({
          skillId: normalizedSkillId,
          action: 'unpublish',
          usageLookup,
        });
      }

      const nextPublishedAt =
        nextLifecycleStatus === 'published'
          ? currentSkill.publishedAt ?? new Date()
          : null;
      const { file: nextSkillEntryFile, bundleFiles } = upsertSkillEntryFile(
        currentSkill.bundleFiles,
        parsedSkill.skillMarkdown,
      );
      const updatedSkill = await repository.updateSkill(normalizedSkillId, {
        name: parsedSkill.name,
        slug: nextSlug,
        description: parsedSkill.description,
        lifecycleStatus: nextLifecycleStatus,
        skillMarkdown: parsedSkill.skillMarkdown,
        markdownExcerpt: buildSkillMarkdownExcerpt(
          parsedSkill.skillMarkdown,
          parsedSkill.description,
        ),
        bundleFiles,
        publishedAt: nextPublishedAt,
        updatedAt: new Date(),
      });

      if (!updatedSkill) {
        throw createSkillNotFoundError();
      }

      await ensureSkillsStorageRoot(env);
      await writeSkillBundleFiles(env, currentSkill.storagePath, [nextSkillEntryFile]);

      return {
        skill: toSkillDetailResponse(updatedSkill),
      };
    },

    deleteSkill: async (_context, skillId) => {
      const normalizedSkillId = readRequiredSkillId(skillId);
      const builtinSkill = findRegisteredSkillById(normalizedSkillId);

      if (builtinSkill) {
        throw createReadonlySystemSkillError();
      }

      const currentSkill = await repository.findSkillById(normalizedSkillId);

      if (!currentSkill) {
        throw createSkillNotFoundError();
      }

      await assertSkillNotInUse({
        skillId: normalizedSkillId,
        action: 'delete',
        usageLookup,
      });

      const deleted = await repository.deleteSkill(normalizedSkillId);

      if (!deleted) {
        throw createSkillNotFoundError();
      }

      await deleteSkillBundleFiles(env, currentSkill.storagePath);
    },
  };
};
