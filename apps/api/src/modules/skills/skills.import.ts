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

const fetchJson = async (url: string): Promise<unknown> => {
  const response = await fetch(url, {
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

  return response.json();
};

const fetchBuffer = async (
  url: string,
): Promise<{ buffer: Buffer; contentType: string | null }> => {
  const response = await fetch(url, {
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

  const arrayBuffer = await response.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    contentType: response.headers.get("content-type"),
  };
};

const fetchText = async (
  url: string,
): Promise<{ text: string; contentType: string | null }> => {
  const { buffer, contentType } = await fetchBuffer(url);

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
  const url = new URL(value);

  if (url.hostname === "raw.githubusercontent.com") {
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
    const url = readOptionalStringField(normalizedInput.url, "url");

    if (!url) {
      throw createValidationAppError("请输入原始 Markdown URL", {
        url: "请输入原始 Markdown URL",
      });
    }

    return {
      mode,
      dryRun,
      url,
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

const collectGitHubBundleFiles = async (
  target: GitHubImportTarget,
  bundleRootPath: string,
): Promise<ImportedSkillBundleFile[]> => {
  const initialEntries = await readGitHubDirectoryEntries(
    buildGitHubContentsUrl(target, bundleRootPath),
  );
  const files: ImportedSkillBundleFile[] = [];

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

      const { buffer } = await fetchBuffer(entry.download_url);
      const relativePath = assertSafeBundleRelativePath(
        bundleRootPath
          ? posix.relative(bundleRootPath, entry.path)
          : entry.path,
      );

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
  const { text, contentType } = await fetchText(url);

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
