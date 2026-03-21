import { AppError } from '@lib/app-error.js';
import { getFallbackMessage } from '@lib/locale.messages.js';
import { createValidationAppError } from '@lib/validation.js';
import type { WithId } from 'mongodb';
import type {
  ListSkillsFilters,
  ListSkillsInput,
  SkillDetailResponse,
  SkillDocument,
  SkillLifecycleStatus,
  SkillSource,
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
  action: 'delete' | 'unpublish';
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
  source: SkillSource,
  lifecycleStatus: SkillLifecycleStatus,
): boolean => {
  return source === 'system' || lifecycleStatus === 'published';
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
  return {
    id: skill._id.toHexString(),
    slug: skill.slug,
    name: skill.name,
    description: skill.description,
    type: skill.type,
    source: skill.source,
    origin: skill.origin,
    handler: skill.handler,
    parametersSchema: skill.parametersSchema,
    runtimeStatus: skill.runtimeStatus,
    lifecycleStatus: skill.lifecycleStatus,
    bindable: buildSkillBindableFlag(skill.source, skill.lifecycleStatus),
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

const readOptionalSourceFilter = (value: unknown): SkillSource | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value === 'system' || value === 'custom' || value === 'imported') {
    return value;
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
