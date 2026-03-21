import { basename, posix } from "node:path";
import { AppError } from "@lib/app-error.js";
import type { MessageKey } from "@lib/locale.messages.js";
import { getFallbackMessage } from "@lib/locale.messages.js";
import { readMutationInput } from "@lib/mutation-input.js";
import {
  createValidationAppError,
  readOptionalStringField,
} from "@lib/validation.js";
import {
  SKILL_ENTRY_FILE_NAME,
  assertSafeBundleRelativePath,
} from "./skills.shared.js";
import type {
  ImportSkillInput,
  SkillImportProvenance,
} from "./skills.types.js";

const IMPORT_REQUEST_TIMEOUT_MS = 15000;
const IMPORT_MAX_METADATA_BYTES = 512 * 1024;
const IMPORT_MAX_SINGLE_FILE_BYTES = 512 * 1024;
const IMPORT_MAX_TOTAL_BYTES = 2 * 1024 * 1024;
const IMPORT_MAX_TOTAL_FILES = 32;

const ALLOWED_GITHUB_PAGE_HOSTS = new Set(["github.com"]);
const ALLOWED_GITHUB_API_HOSTS = new Set(["api.github.com"]);
const ALLOWED_GITHUB_RAW_HOSTS = new Set([
  "raw.githubusercontent.com",
  "gist.githubusercontent.com",
]);
const ALLOWED_DIRECT_IMPORT_HOSTS = ALLOWED_GITHUB_RAW_HOSTS;
const GITHUB_API_LABEL = "github_api";
const GITHUB_METADATA_LABEL = "github_metadata";
const SKILL_BUNDLE_FILE_LABEL = "skill_bundle_file";
const SKILL_MARKDOWN_LABEL = "skill_markdown";

interface ImportedSkillBundleFile {
  path: string;
  content: Buffer;
  size: number;
}

export interface ImportedSkillBundle {
  origin: "github" | "url";
  skillMarkdown: string;
  bundleFiles: ImportedSkillBundleFile[];
  importProvenance: SkillImportProvenance;
}

interface NormalizedUrlImportInput {
  mode: "url";
  dryRun: boolean;
  url: string;
}

interface GitHubImportTarget {
  repository: string;
  owner: string;
  repo: string;
  path: string;
  ref: string | null;
  githubUrl: string | null;
}

interface NormalizedGitHubImportInput {
  mode: "github";
  dryRun: boolean;
  target: GitHubImportTarget;
}

type NormalizedImportInput =
  | NormalizedUrlImportInput
  | NormalizedGitHubImportInput;

interface GitHubContentItem {
  type: "file" | "dir";
  path: string;
  url: string;
  download_url: string | null;
}

interface ImportBudget {
  totalBytes: number;
  totalFiles: number;
}

const createImportFetchError = (
  message: string,
  details?: unknown,
  messageKey?: MessageKey,
): AppError => {
  return new AppError({
    statusCode: 400,
    code: "SKILL_IMPORT_FETCH_FAILED",
    message,
    messageKey,
    details,
  });
};

const createImportLimitError = (
  message: string,
  details?: unknown,
  messageKey?: MessageKey,
): AppError => {
  return new AppError({
    statusCode: 413,
    code: "SKILL_IMPORT_LIMIT_EXCEEDED",
    message,
    messageKey,
    details,
  });
};

const encodeGitHubPath = (value: string): string => {
  return value
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
};

const readOptionalBooleanField = (
  value: unknown,
  field: string,
): boolean | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  throw createValidationAppError(
    getFallbackMessage("validation.boolean"),
    {
      [field]: getFallbackMessage("validation.boolean"),
    },
    "validation.boolean",
  );
};

const parseValidatedHttpsInputUrl = (value: string, field: string): URL => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw createValidationAppError(
      getFallbackMessage("validation.url.invalid"),
      {
        [field]: getFallbackMessage("validation.url.invalid"),
      },
      "validation.url.invalid",
    );
  }

  if (url.protocol !== "https:") {
    throw createValidationAppError(
      getFallbackMessage("validation.url.httpsOnly"),
      {
        [field]: getFallbackMessage("validation.url.httpsOnly"),
      },
      "validation.url.httpsOnly",
    );
  }

  if (url.username || url.password) {
    throw createValidationAppError(
      getFallbackMessage("validation.url.authUnsupported"),
      {
        [field]: getFallbackMessage("validation.url.authUnsupported"),
      },
      "validation.url.authUnsupported",
    );
  }

  return url;
};

const assertAllowedInputUrlHost = (
  url: URL,
  field: string,
  allowedHosts: ReadonlySet<string>,
  messageKey: MessageKey,
): URL => {
  if (!allowedHosts.has(url.hostname.toLowerCase())) {
    throw createValidationAppError(
      getFallbackMessage(messageKey),
      {
        [field]: getFallbackMessage(messageKey),
      },
      messageKey,
    );
  }

  return url;
};

const assertAllowedRemoteUrl = (
  value: string,
  allowedHosts: ReadonlySet<string>,
  label: string,
): URL => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw createImportFetchError(
      getFallbackMessage("skills.import.fetch.invalidUrl"),
      {
        url: value,
        label,
      },
      "skills.import.fetch.invalidUrl",
    );
  }

  if (url.protocol !== "https:") {
    throw createImportFetchError(
      getFallbackMessage("skills.import.fetch.httpsOnly"),
      {
        url: value,
        label,
      },
      "skills.import.fetch.httpsOnly",
    );
  }

  if (url.username || url.password) {
    throw createImportFetchError(
      getFallbackMessage("skills.import.fetch.authUnsupported"),
      {
        url: value,
        label,
      },
      "skills.import.fetch.authUnsupported",
    );
  }

  if (!allowedHosts.has(url.hostname.toLowerCase())) {
    throw createImportFetchError(
      getFallbackMessage("skills.import.fetch.hostNotAllowed"),
      {
        url: value,
        hostname: url.hostname,
        label,
      },
      "skills.import.fetch.hostNotAllowed",
    );
  }

  return url;
};

const parseContentLength = (response: Response): number | null => {
  const headerValue = response.headers.get("content-length");
  if (!headerValue) {
    return null;
  }

  const parsed = Number.parseInt(headerValue, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

const readResponseBuffer = async (
  response: Response,
  url: string,
  maxBytes: number,
  label: string,
): Promise<Buffer> => {
  const contentLength = parseContentLength(response);
  if (contentLength !== null && contentLength > maxBytes) {
    throw createImportLimitError(
      getFallbackMessage("skills.import.limit.exceeded"),
      {
        url,
        contentLength,
        maxBytes,
        label,
      },
      "skills.import.limit.exceeded",
    );
  }

  if (!response.body) {
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length > maxBytes) {
      throw createImportLimitError(
        getFallbackMessage("skills.import.limit.exceeded"),
        {
          url,
          bytes: buffer.length,
          maxBytes,
          label,
        },
        "skills.import.limit.exceeded",
      );
    }

    return buffer;
  }

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    if (!value) {
      continue;
    }

    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw createImportLimitError(
        getFallbackMessage("skills.import.limit.exceeded"),
        {
          url,
          bytes: totalBytes,
          maxBytes,
          label,
        },
        "skills.import.limit.exceeded",
      );
    }

    chunks.push(Buffer.from(value));
  }

  return Buffer.concat(chunks, totalBytes);
};

const fetchJson = async (url: string): Promise<unknown> => {
  const normalizedUrl = assertAllowedRemoteUrl(
    url,
    ALLOWED_GITHUB_API_HOSTS,
    GITHUB_API_LABEL,
  );
  const response = await fetch(normalizedUrl, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "knowject-skill-import",
    },
    signal: AbortSignal.timeout(IMPORT_REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw createImportFetchError(
      getFallbackMessage("skills.import.fetch.githubFailed"),
      {
        url,
        status: response.status,
      },
      "skills.import.fetch.githubFailed",
    );
  }

  const buffer = await readResponseBuffer(
    response,
    normalizedUrl.toString(),
    IMPORT_MAX_METADATA_BYTES,
    GITHUB_METADATA_LABEL,
  );

  try {
    return JSON.parse(buffer.toString("utf8")) as unknown;
  } catch {
    throw createImportFetchError(
      getFallbackMessage("skills.import.fetch.invalidJson"),
      {
        url: normalizedUrl.toString(),
      },
      "skills.import.fetch.invalidJson",
    );
  }
};

const fetchBuffer = async (
  url: string,
  options: {
    allowedHosts: ReadonlySet<string>;
    maxBytes: number;
    label: string;
  },
): Promise<{ buffer: Buffer; contentType: string | null }> => {
  const normalizedUrl = assertAllowedRemoteUrl(
    url,
    options.allowedHosts,
    options.label,
  );
  const response = await fetch(normalizedUrl, {
    headers: {
      "User-Agent": "knowject-skill-import",
    },
    signal: AbortSignal.timeout(IMPORT_REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw createImportFetchError(
      getFallbackMessage("skills.import.fetch.resourceDownloadFailed"),
      {
        url,
        status: response.status,
      },
      "skills.import.fetch.resourceDownloadFailed",
    );
  }

  return {
    buffer: await readResponseBuffer(
      response,
      normalizedUrl.toString(),
      options.maxBytes,
      options.label,
    ),
    contentType: response.headers.get("content-type"),
  };
};

const fetchText = async (
  url: string,
  options: {
    allowedHosts: ReadonlySet<string>;
    maxBytes: number;
    label: string;
  },
): Promise<{ text: string; contentType: string | null }> => {
  const { buffer, contentType } = await fetchBuffer(url, options);

  return {
    text: buffer.toString("utf8"),
    contentType,
  };
};

const normalizeRepository = (value: string): string => {
  const normalized = value
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replace(/\.git$/i, "");

  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(normalized)) {
    throw createValidationAppError(
      getFallbackMessage("validation.skills.import.repository.invalid"),
      {
        repository: getFallbackMessage(
          "validation.skills.import.repository.invalid",
        ),
      },
      "validation.skills.import.repository.invalid",
    );
  }

  return normalized;
};

const normalizeBundleRootPath = (rawPath: string | undefined): string => {
  if (!rawPath) {
    return "";
  }

  const normalized = rawPath.trim().replace(/^\/+|\/+$/g, "");

  if (!normalized) {
    return "";
  }

  return assertSafeBundleRelativePath(normalized);
};

const resolveGitHubBundleRootPath = (rawPath: string): string => {
  const normalizedPath = rawPath.trim().replace(/^\/+|\/+$/g, "");

  if (!normalizedPath) {
    return "";
  }

  if (basename(normalizedPath) !== SKILL_ENTRY_FILE_NAME) {
    return normalizeBundleRootPath(normalizedPath);
  }

  const directory = posix.dirname(normalizedPath);

  return directory === "." ? "" : normalizeBundleRootPath(directory);
};

const parseGitHubUrl = (value: string): GitHubImportTarget => {
  const url = parseValidatedHttpsInputUrl(value, "githubUrl");

  if (url.hostname === "raw.githubusercontent.com") {
    assertAllowedInputUrlHost(
      url,
      "githubUrl",
      ALLOWED_GITHUB_RAW_HOSTS,
      "validation.skills.import.githubUrl.invalid",
    );
    const segments = url.pathname.split("/").filter(Boolean);

    if (segments.length < 4) {
      throw createValidationAppError(
        getFallbackMessage("validation.skills.import.githubUrl.invalid"),
        {
          githubUrl: getFallbackMessage(
            "validation.skills.import.githubUrl.invalid",
          ),
        },
        "validation.skills.import.githubUrl.invalid",
      );
    }

    const [owner, repo, ref, ...pathSegments] = segments;

    return {
      repository: `${owner}/${repo}`,
      owner,
      repo,
      ref,
      path: resolveGitHubBundleRootPath(pathSegments.join("/")),
      githubUrl: value,
    };
  }

  assertAllowedInputUrlHost(
    url,
    "githubUrl",
    ALLOWED_GITHUB_PAGE_HOSTS,
    "validation.skills.import.githubUrl.invalid",
  );

  if (url.hostname !== "github.com") {
    throw createValidationAppError(
      getFallbackMessage("validation.skills.import.githubUrl.invalid"),
      {
        githubUrl: getFallbackMessage(
          "validation.skills.import.githubUrl.invalid",
        ),
      },
      "validation.skills.import.githubUrl.invalid",
    );
  }

  const segments = url.pathname.split("/").filter(Boolean);

  if (segments.length < 2) {
    throw createValidationAppError(
      getFallbackMessage("validation.skills.import.githubUrl.invalid"),
      {
        githubUrl: getFallbackMessage(
          "validation.skills.import.githubUrl.invalid",
        ),
      },
      "validation.skills.import.githubUrl.invalid",
    );
  }

  const [owner, repo, mode, ref, ...pathSegments] = segments;
  const baseTarget = {
    repository: `${owner}/${repo.replace(/\.git$/i, "")}`,
    owner,
    repo: repo.replace(/\.git$/i, ""),
    githubUrl: value,
  };

  if (!mode) {
    return {
      ...baseTarget,
      ref: null,
      path: "",
    };
  }

  if (mode !== "tree" && mode !== "blob") {
    throw createValidationAppError(
      getFallbackMessage("validation.skills.import.githubUrl.invalid"),
      {
        githubUrl: getFallbackMessage(
          "validation.skills.import.githubUrl.invalid",
        ),
      },
      "validation.skills.import.githubUrl.invalid",
    );
  }

  if (!ref) {
    throw createValidationAppError(
      getFallbackMessage("validation.skills.import.githubUrl.invalid"),
      {
        githubUrl: getFallbackMessage(
          "validation.skills.import.githubUrl.invalid",
        ),
      },
      "validation.skills.import.githubUrl.invalid",
    );
  }

  return {
    ...baseTarget,
    ref,
    path: resolveGitHubBundleRootPath(pathSegments.join("/")),
  };
};

const normalizeImportInput = (
  input: ImportSkillInput,
): NormalizedImportInput => {
  const normalizedInput = readMutationInput(input);

  const mode = readOptionalStringField(normalizedInput.mode, "mode");
  const dryRun =
    readOptionalBooleanField(normalizedInput.dryRun, "dryRun") ?? false;

  if (mode === "url") {
    const rawUrl = readOptionalStringField(normalizedInput.url, "url");

    if (!rawUrl) {
      throw createValidationAppError(
        getFallbackMessage("validation.required.markdownUrl"),
        {
          url: getFallbackMessage("validation.required.markdownUrl"),
        },
        "validation.required.markdownUrl",
      );
    }

    const url = assertAllowedInputUrlHost(
      parseValidatedHttpsInputUrl(rawUrl, "url"),
      "url",
      ALLOWED_DIRECT_IMPORT_HOSTS,
      "validation.skills.import.trustedRawUrlOnly",
    );

    return {
      mode,
      dryRun,
      url: url.toString(),
    };
  }

  if (mode === "github") {
    const githubUrl = readOptionalStringField(
      normalizedInput.githubUrl,
      "githubUrl",
    );

    if (githubUrl) {
      return {
        mode,
        dryRun,
        target: parseGitHubUrl(githubUrl),
      };
    }

    const repository = readOptionalStringField(
      normalizedInput.repository,
      "repository",
    );
    if (!repository) {
      throw createValidationAppError(
        getFallbackMessage("validation.required.githubRepository"),
        {
          repository: getFallbackMessage("validation.required.githubRepository"),
        },
        "validation.required.githubRepository",
      );
    }

    const normalizedRepository = normalizeRepository(repository);
    const [owner, repo] = normalizedRepository.split("/") as [string, string];
    const path = normalizeBundleRootPath(
      readOptionalStringField(normalizedInput.path, "path") ?? undefined,
    );
    const ref = readOptionalStringField(normalizedInput.ref, "ref") ?? null;

    return {
      mode,
      dryRun,
      target: {
        repository: normalizedRepository,
        owner,
        repo,
        path,
        ref,
        githubUrl: null,
      },
    };
  }

  throw createValidationAppError(
    getFallbackMessage("validation.skills.import.mode.invalid"),
    {
      mode: getFallbackMessage("validation.skills.import.mode.invalid"),
    },
    "validation.skills.import.mode.invalid",
  );
};

export const validateSkillImportInput = (input: ImportSkillInput): void => {
  normalizeImportInput(input);
};

const buildGitHubContentsUrl = (
  target: GitHubImportTarget,
  bundleRootPath: string,
): string => {
  const pathname = bundleRootPath
    ? `/repos/${target.owner}/${target.repo}/contents/${encodeGitHubPath(bundleRootPath)}`
    : `/repos/${target.owner}/${target.repo}/contents`;
  const url = new URL(`https://api.github.com${pathname}`);

  if (target.ref) {
    url.searchParams.set("ref", target.ref);
  }

  return url.toString();
};

const readGitHubDirectoryEntries = async (
  url: string,
): Promise<GitHubContentItem[]> => {
  const response = await fetchJson(url);

  if (!Array.isArray(response)) {
    throw createImportFetchError(
      getFallbackMessage("skills.import.fetch.directoryExpected"),
      {
        url,
      },
      "skills.import.fetch.directoryExpected",
    );
  }

  return response.filter((item): item is GitHubContentItem =>
    Boolean(
      item &&
      typeof item === "object" &&
      ("type" in item ||
        "download_url" in item ||
        "path" in item ||
        "url" in item),
    ),
  ) as GitHubContentItem[];
};

const createImportBudget = (): ImportBudget => ({
  totalBytes: 0,
  totalFiles: 0,
});

const assertImportBudgetAllowsAnotherFile = (budget: ImportBudget): void => {
  if (budget.totalFiles >= IMPORT_MAX_TOTAL_FILES) {
    throw createImportLimitError(
      getFallbackMessage("skills.import.limit.maxFiles"),
      {
        maxFiles: IMPORT_MAX_TOTAL_FILES,
      },
      "skills.import.limit.maxFiles",
    );
  }
};

const registerImportedFile = (
  budget: ImportBudget,
  file: { path: string; size: number },
): void => {
  if (file.size > IMPORT_MAX_SINGLE_FILE_BYTES) {
    throw createImportLimitError(
      getFallbackMessage("skills.import.limit.singleFile"),
      {
        path: file.path,
        size: file.size,
        maxBytes: IMPORT_MAX_SINGLE_FILE_BYTES,
      },
      "skills.import.limit.singleFile",
    );
  }

  if (budget.totalBytes + file.size > IMPORT_MAX_TOTAL_BYTES) {
    throw createImportLimitError(
      getFallbackMessage("skills.import.limit.totalBytes"),
      {
        path: file.path,
        totalBytes: budget.totalBytes + file.size,
        maxBytes: IMPORT_MAX_TOTAL_BYTES,
      },
      "skills.import.limit.totalBytes",
    );
  }

  budget.totalFiles += 1;
  budget.totalBytes += file.size;
};

const collectGitHubBundleFiles = async (
  target: GitHubImportTarget,
  bundleRootPath: string,
): Promise<ImportedSkillBundleFile[]> => {
  const initialEntries = await readGitHubDirectoryEntries(
    buildGitHubContentsUrl(target, bundleRootPath),
  );
  const files: ImportedSkillBundleFile[] = [];
  const budget = createImportBudget();

  const walkEntries = async (entries: GitHubContentItem[]): Promise<void> => {
    for (const entry of entries) {
      if (entry.type === "dir") {
        const childEntries = await readGitHubDirectoryEntries(entry.url);
        await walkEntries(childEntries);
        continue;
      }

      if (!entry.download_url) {
        continue;
      }

      assertImportBudgetAllowsAnotherFile(budget);
      const { buffer } = await fetchBuffer(entry.download_url, {
        allowedHosts: ALLOWED_GITHUB_RAW_HOSTS,
        maxBytes: IMPORT_MAX_SINGLE_FILE_BYTES,
        label: SKILL_BUNDLE_FILE_LABEL,
      });
      const relativePath = assertSafeBundleRelativePath(
        bundleRootPath
          ? posix.relative(bundleRootPath, entry.path)
          : entry.path,
      );
      registerImportedFile(budget, {
        path: relativePath,
        size: buffer.length,
      });

      files.push({
        path: relativePath,
        content: buffer,
        size: buffer.length,
      });
    }
  };

  await walkEntries(initialEntries);

  return files.sort((left, right) => left.path.localeCompare(right.path));
};

const importFromGitHub = async (
  target: GitHubImportTarget,
): Promise<ImportedSkillBundle> => {
  const bundleRootPath = target.path;
  const bundleFiles = await collectGitHubBundleFiles(target, bundleRootPath);
  const skillFile = bundleFiles.find(
    (file) => file.path === SKILL_ENTRY_FILE_NAME,
  );

  if (!skillFile) {
    throw createImportFetchError(
      getFallbackMessage("skills.import.fetch.missingEntry"),
      {
        repository: target.repository,
        path: target.path,
        ref: target.ref,
      },
      "skills.import.fetch.missingEntry",
    );
  }

  return {
    origin: "github",
    skillMarkdown: skillFile.content.toString("utf8"),
    bundleFiles,
    importProvenance: {
      repository: target.repository,
      path: target.path || null,
      ref: target.ref,
      sourceUrl: null,
      githubUrl:
        target.githubUrl ??
        `https://github.com/${target.repository}${target.path ? `/tree/${target.ref ?? "HEAD"}/${target.path}` : ""}`,
    },
  };
};

const looksLikeHtmlDocument = (value: string): boolean => {
  const normalized = value.trim().toLowerCase();
  return (
    normalized.startsWith("<!doctype html") || normalized.startsWith("<html")
  );
};

const importFromUrl = async (url: string): Promise<ImportedSkillBundle> => {
  const { text, contentType } = await fetchText(url, {
    allowedHosts: ALLOWED_DIRECT_IMPORT_HOSTS,
    maxBytes: IMPORT_MAX_SINGLE_FILE_BYTES,
    label: SKILL_MARKDOWN_LABEL,
  });

  if (contentType?.includes("text/html") || looksLikeHtmlDocument(text)) {
    throw createImportFetchError(
      getFallbackMessage("skills.import.fetch.htmlUnsupported"),
      {
        url,
        contentType,
      },
      "skills.import.fetch.htmlUnsupported",
    );
  }

  const buffer = Buffer.from(text, "utf8");
  const budget = createImportBudget();
  registerImportedFile(budget, {
    path: SKILL_ENTRY_FILE_NAME,
    size: buffer.length,
  });

  return {
    origin: "url",
    skillMarkdown: text,
    bundleFiles: [
      {
        path: SKILL_ENTRY_FILE_NAME,
        content: buffer,
        size: buffer.length,
      },
    ],
    importProvenance: {
      repository: null,
      path: null,
      ref: null,
      sourceUrl: url,
      githubUrl: null,
    },
  };
};

export const resolveImportedSkillBundle = async (
  input: ImportSkillInput,
): Promise<{
  bundle: ImportedSkillBundle;
  dryRun: boolean;
}> => {
  const normalized = normalizeImportInput(input);

  if (normalized.mode === "github") {
    return {
      bundle: await importFromGitHub(normalized.target),
      dryRun: normalized.dryRun,
    };
  }

  return {
    bundle: await importFromUrl(normalized.url),
    dryRun: normalized.dryRun,
  };
};
