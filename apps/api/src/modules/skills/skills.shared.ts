import { AppError } from '@lib/app-error.js';
import { getFallbackMessage } from '@lib/locale.messages.js';
import { createValidationAppError } from '@lib/validation.js';
import type { WithId } from 'mongodb';
import {
  buildLegacySkillDefinition,
  SKILL_CATEGORIES,
  type SkillCategory,
  type SkillStatus,
} from './skills.definition.js';
import type {
  ListSkillsFilters,
  ListSkillsInput,
  NormalizedSkillReadModel,
  SkillDetailResponse,
  SkillDocument,
  SkillLifecycleStatus,
  PersistedSkillSource,
  SkillSummaryResponse,
} from './skills.types.js';

export const SKILLS_COLLECTION_NAME = 'skills';
export const SKILL_ENTRY_FILE_NAME = 'SKILL.md';

export const createSkillNotFoundError = (): AppError => {
  return new AppError({
    statusCode: 404,
    code: 'SKILL_NOT_FOUND',
    message: getFallbackMessage('skills.notFound'),
    messageKey: 'skills.notFound',
  });
};

export const createReadonlySystemSkillError = (): AppError => {
  return new AppError({
    statusCode: 403,
    code: 'SYSTEM_SKILL_READONLY',
    message: getFallbackMessage('skills.systemReadonly'),
    messageKey: 'skills.systemReadonly',
  });
};

export const createSkillSlugConflictError = (slug: string): AppError => {
  return new AppError({
    statusCode: 409,
    code: 'SKILL_SLUG_CONFLICT',
    message: getFallbackMessage('skills.slugConflict'),
    messageKey: 'skills.slugConflict',
    details: {
      slug,
    },
  });
};

export const createSkillInUseError = ({
  action,
  projectCount,
  agentCount,
}: {
  action: 'delete' | 'deprecate' | 'archive';
  projectCount: number;
  agentCount: number;
}): AppError => {
  const message = getFallbackMessage('skills.inUse.message', {
    projectCount,
    agentCount,
    action,
  });

  return new AppError({
    statusCode: 409,
    code: 'SKILL_IN_USE',
    message,
    messageKey: 'skills.inUse.message',
    messageParams: {
      projectCount,
      agentCount,
      action,
    },
    details: {
      action,
      projectCount,
      agentCount,
    },
  });
};

export const buildSkillBindableFlag = (
  status?: SkillStatus,
): boolean => {
  return status === 'active';
};

export const buildSkillSlug = (name: string): string => {
  const slug = name
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\p{Letter}\p{Number}-]+/gu, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'skill';
};

export const buildSkillMarkdownExcerpt = (
  markdown: string,
  description: string,
): string => {
  const normalized = markdown
    .replace(/^---[\s\S]*?---/u, '')
    .replace(/[`#>*_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (normalized) {
    return normalized.length > 160 ? `${normalized.slice(0, 160)}...` : normalized;
  }

  return description.length > 160 ? `${description.slice(0, 160)}...` : description;
};

export const assertSafeBundleRelativePath = (relativePath: string): string => {
  const normalized = relativePath.replace(/\\/g, '/').trim().replace(/^\/+/, '');

  if (!normalized || normalized === '.' || normalized === '..') {
    throw createValidationAppError(
      getFallbackMessage('validation.skillBundlePath.invalid'),
      {
        skillMarkdown: getFallbackMessage('validation.skillBundlePath.invalid'),
      },
      'validation.skillBundlePath.invalid',
    );
  }

  const segments = normalized.split('/');

  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) {
    throw createValidationAppError(
      getFallbackMessage('validation.skillBundlePath.invalid'),
      {
        skillMarkdown: getFallbackMessage('validation.skillBundlePath.invalid'),
      },
      'validation.skillBundlePath.invalid',
    );
  }

  return normalized;
};

export const toSkillSummaryResponse = (
  skill: WithId<SkillDocument>,
): SkillSummaryResponse => {
  const normalizedSkill = normalizeStoredSkillForRead(skill);

  return {
    id: skill._id.toHexString(),
    slug: skill.slug,
    name: skill.name,
    description: skill.description,
    type: skill.type,
    source: normalizedSkill.source,
    origin: skill.origin,
    handler: skill.handler,
    parametersSchema: skill.parametersSchema,
    runtimeStatus: skill.runtimeStatus,
    lifecycleStatus: normalizedSkill.lifecycleStatus,
    category: normalizedSkill.category,
    status: normalizedSkill.status,
    owner: normalizedSkill.owner,
    definition: normalizedSkill.definition,
    statusChangedAt: normalizedSkill.statusChangedAt?.toISOString() ?? null,
    bindable: normalizedSkill.bindable,
    markdownExcerpt: skill.markdownExcerpt,
    bundleFileCount: skill.bundleFiles.length,
    importProvenance: skill.importProvenance,
    createdBy: skill.createdBy,
    createdAt: skill.createdAt.toISOString(),
    updatedAt: skill.updatedAt.toISOString(),
    publishedAt: skill.publishedAt?.toISOString() ?? null,
  };
};

export const toSkillDetailResponse = (
  skill: WithId<SkillDocument>,
): SkillDetailResponse => {
  return {
    ...toSkillSummaryResponse(skill),
    skillMarkdown: skill.skillMarkdown,
    bundleFiles: skill.bundleFiles,
  };
};

const readOptionalSourceFilter = (
  value: unknown,
): PersistedSkillSource | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value === 'preset' || value === 'system') {
    return 'preset';
  }

  if (value === 'team' || value === 'custom') {
    return 'team';
  }

  if (value === 'imported') {
    return 'team';
  }

  throw createValidationAppError(
    getFallbackMessage('validation.skills.sourceFilter.invalid'),
    {
      source: getFallbackMessage('validation.skills.sourceFilter.invalid'),
    },
    'validation.skills.sourceFilter.invalid',
  );
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

  throw createValidationAppError(
    getFallbackMessage('validation.skills.lifecycleFilter.invalid'),
    {
      lifecycleStatus: getFallbackMessage(
        'validation.skills.lifecycleFilter.invalid',
      ),
    },
    'validation.skills.lifecycleFilter.invalid',
  );
};

const readOptionalBindable = (value: unknown): boolean | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    if (value === 'true') {
      return true;
    }

    if (value === 'false') {
      return false;
    }
  }

  throw createValidationAppError(
    getFallbackMessage('validation.skills.bindableFilter.invalid'),
    {
      bindable: getFallbackMessage('validation.skills.bindableFilter.invalid'),
    },
    'validation.skills.bindableFilter.invalid',
  );
};

export const normalizeSkillsListFilters = (
  input: ListSkillsInput = {},
): ListSkillsFilters => {
  return {
    source: readOptionalSourceFilter(input.source),
    lifecycleStatus: readOptionalLifecycleStatus(input.lifecycleStatus),
    bindable: readOptionalBindable(input.bindable),
  };
};

export const matchesSkillFilters = (
  skill: Pick<SkillSummaryResponse, 'source' | 'lifecycleStatus' | 'bindable'>,
  filters: ListSkillsFilters,
): boolean => {
  if (filters.source && skill.source !== filters.source) {
    return false;
  }

  if (filters.lifecycleStatus && skill.lifecycleStatus !== filters.lifecycleStatus) {
    return false;
  }

  if (filters.bindable !== undefined && skill.bindable !== filters.bindable) {
    return false;
  }

  return true;
};

const normalizeSkillSourceForRead = (
  source: PersistedSkillSource,
): SkillSummaryResponse['source'] => {
  if (source === 'system') {
    return 'preset';
  }

  if (source === 'custom' || source === 'imported') {
    return 'team';
  }

  return source;
};

const buildLifecycleStatusFromStatus = (
  status?: SkillStatus,
  fallback?: SkillLifecycleStatus,
): SkillLifecycleStatus => {
  if (status) {
    return status === 'active' ? 'published' : 'draft';
  }

  return fallback ?? 'draft';
};

const buildStatusFromLegacyFields = ({
  status,
  lifecycleStatus,
}: {
  status?: SkillStatus;
  lifecycleStatus?: SkillLifecycleStatus;
}): SkillStatus => {
  if (status) {
    return status;
  }

  return lifecycleStatus === 'published' ? 'active' : 'draft';
};

const buildOwnerForRead = (skill: WithId<SkillDocument>): string => {
  if (skill.owner?.trim()) {
    return skill.owner.trim();
  }

  if (skill.source === 'system' || skill.source === 'preset') {
    return 'Knowject Core';
  }

  return skill.createdBy;
};

const normalizeSkillCategoryForRead = (
  category: SkillDocument['category'],
): SkillSummaryResponse['category'] => {
  return typeof category === 'string' &&
    (SKILL_CATEGORIES as readonly string[]).includes(category)
    ? (category as SkillCategory)
    : undefined;
};

const buildStatusChangedAtForRead = (
  skill: WithId<SkillDocument>,
  status: SkillStatus,
): Date => {
  if (skill.statusChangedAt instanceof Date) {
    return skill.statusChangedAt;
  }

  if (status === 'active' && skill.publishedAt instanceof Date) {
    return skill.publishedAt;
  }

  return skill.updatedAt;
};

const buildDefinitionForRead = (
  skill: WithId<SkillDocument>,
  owner: string,
) => {
  if (skill.definition) {
    return skill.definition;
  }

  return buildLegacySkillDefinition({
    name: skill.name,
    description: skill.description,
    skillMarkdown: skill.skillMarkdown,
    owner,
  });
};

export const normalizeStoredSkillForRead = (
  skill: WithId<SkillDocument>,
): NormalizedSkillReadModel => {
  const status = buildStatusFromLegacyFields({
    status: skill.status,
    lifecycleStatus: skill.lifecycleStatus,
  });
  const lifecycleStatus = buildLifecycleStatusFromStatus(
    status,
    skill.lifecycleStatus,
  );
  const owner = buildOwnerForRead(skill);

  return {
    source: normalizeSkillSourceForRead(skill.source),
    lifecycleStatus,
    category: normalizeSkillCategoryForRead(skill.category),
    status,
    owner,
    definition: buildDefinitionForRead(skill, owner),
    statusChangedAt: buildStatusChangedAtForRead(skill, status),
    bindable: buildSkillBindableFlag(status),
  };
};
