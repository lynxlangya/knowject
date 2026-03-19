import { basename, posix } from "node:path";
import { AppError } from "@lib/app-error.js";
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
): AppError => {
  return new AppError({
    statusCode: 400,
    code: "SKILL_IMPORT_FETCH_FAILED",
    message,
    details,
  });
};

const createImportLimitError = (
  message: string,
  details?: unknown,
): AppError => {
  return new AppError({
    statusCode: 413,
    code: "SKILL_IMPORT_LIMIT_EXCEEDED",
    message,
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

  throw createValidationAppError(`${field} 必须为布尔值`, {
    [field]: `${field} 必须为布尔值`,
  });
};

const parseValidatedHttpsInputUrl = (value: string, field: string): URL => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw createValidationAppError(`${field} 格式不合法`, {
      [field]: `${field} 必须为合法 URL`,
    });
  }

  if (url.protocol !== "https:") {
    throw createValidationAppError(`${field} 仅支持 HTTPS`, {
      [field]: `${field} 仅支持 HTTPS`,
    });
  }

  if (url.username || url.password) {
    throw createValidationAppError(`${field} 不支持携带认证信息`, {
      [field]: `${field} 不支持携带认证信息`,
    });
  }

  return url;
};

const assertAllowedInputUrlHost = (
  url: URL,
  field: string,
  allowedHosts: ReadonlySet<string>,
  message: string,
): URL => {
  if (!allowedHosts.has(url.hostname.toLowerCase())) {
    throw createValidationAppError(message, {
      [field]: `${field} 仅支持受信任来源`,
    });
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
    throw createImportFetchError(`${label} URL 不合法`, {
      url: value,
    });
  }

  if (url.protocol !== "https:") {
    throw createImportFetchError(`${label} 仅支持 HTTPS`, {
      url: value,
    });
  }

  if (url.username || url.password) {
    throw createImportFetchError(`${label} 不支持携带认证信息`, {
      url: value,
    });
  }

  if (!allowedHosts.has(url.hostname.toLowerCase())) {
    throw createImportFetchError(`${label} 不在允许列表内`, {
      url: value,
      hostname: url.hostname,
    });
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
    throw createImportLimitError(`${label} 超过大小上限`, {
      url,
      contentLength,
      maxBytes,
    });
  }

  if (!response.body) {
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length > maxBytes) {
      throw createImportLimitError(`${label} 超过大小上限`, {
        url,
        bytes: buffer.length,
        maxBytes,
      });
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
      throw createImportLimitError(`${label} 超过大小上限`, {
        url,
        bytes: totalBytes,
        maxBytes,
      });
    }

    chunks.push(Buffer.from(value));
  }

  return Buffer.concat(chunks, totalBytes);
};

const fetchJson = async (url: string): Promise<unknown> => {
  const normalizedUrl = assertAllowedRemoteUrl(
    url,
    ALLOWED_GITHUB_API_HOSTS,
    "GitHub API",
  );
  const response = await fetch(normalizedUrl, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "knowject-skill-import",
    },
    signal: AbortSignal.timeout(IMPORT_REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw createImportFetchError(`GitHub 导入失败（HTTP ${response.status}）`, {
      url,
      status: response.status,
    });
  }

  const buffer = await readResponseBuffer(
    response,
    normalizedUrl.toString(),
    IMPORT_MAX_METADATA_BYTES,
    "GitHub 元数据",
  );

  try {
    return JSON.parse(buffer.toString("utf8")) as unknown;
  } catch {
    throw createImportFetchError("GitHub 返回不是有效 JSON", {
      url: normalizedUrl.toString(),
    });
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
      `Skill 资源下载失败（HTTP ${response.status}）`,
      {
        url,
        status: response.status,
      },
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
    throw createValidationAppError("repository 格式不合法", {
      repository: "repository 必须为 owner/repo",
    });
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
      "GitHub URL 不合法",
    );
    const segments = url.pathname.split("/").filter(Boolean);

    if (segments.length < 4) {
      throw createValidationAppError("GitHub URL 不合法", {
        githubUrl: "无法识别 raw.githubusercontent.com URL",
      });
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
    "GitHub URL 不合法",
  );

  if (url.hostname !== "github.com") {
    throw createValidationAppError("GitHub URL 不合法", {
      githubUrl: "仅支持 github.com 或 raw.githubusercontent.com URL",
    });
  }

  const segments = url.pathname.split("/").filter(Boolean);

  if (segments.length < 2) {
    throw createValidationAppError("GitHub URL 不合法", {
      githubUrl: "无法识别 owner/repo",
    });
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
    throw createValidationAppError("GitHub URL 不合法", {
      githubUrl: "仅支持 GitHub tree/blob URL",
    });
  }

  if (!ref) {
    throw createValidationAppError("GitHub URL 不合法", {
      githubUrl: "GitHub URL 必须包含 ref",
    });
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
      throw createValidationAppError("请输入原始 Markdown URL", {
        url: "请输入原始 Markdown URL",
      });
    }

    const url = assertAllowedInputUrlHost(
      parseValidatedHttpsInputUrl(rawUrl, "url"),
      "url",
      ALLOWED_DIRECT_IMPORT_HOSTS,
      "URL 导入仅支持受信任的原始文件地址",
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
      throw createValidationAppError("请输入 GitHub 仓库信息", {
        repository: "请输入 owner/repo",
      });
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

  throw createValidationAppError("mode 不合法", {
    mode: "mode 只能为 github 或 url",
  });
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
      "GitHub 路径必须指向 Skill 目录或 SKILL.md 文件",
      {
        url,
      },
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
    throw createImportLimitError("Skill bundle 文件数超过上限", {
      maxFiles: IMPORT_MAX_TOTAL_FILES,
    });
  }
};

const registerImportedFile = (
  budget: ImportBudget,
  file: { path: string; size: number },
): void => {
  if (file.size > IMPORT_MAX_SINGLE_FILE_BYTES) {
    throw createImportLimitError("Skill bundle 单文件超过上限", {
      path: file.path,
      size: file.size,
      maxBytes: IMPORT_MAX_SINGLE_FILE_BYTES,
    });
  }

  if (budget.totalBytes + file.size > IMPORT_MAX_TOTAL_BYTES) {
    throw createImportLimitError("Skill bundle 总大小超过上限", {
      path: file.path,
      totalBytes: budget.totalBytes + file.size,
      maxBytes: IMPORT_MAX_TOTAL_BYTES,
    });
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
        label: "Skill bundle 文件",
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
    throw createImportFetchError("GitHub 路径下未找到 SKILL.md", {
      repository: target.repository,
      path: target.path,
      ref: target.ref,
    });
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
    label: "Skill Markdown",
  });

  if (contentType?.includes("text/html") || looksLikeHtmlDocument(text)) {
    throw createImportFetchError(
      "URL 导入只支持原始 Markdown 文本，不支持网页地址",
      {
        url,
        contentType,
      },
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
