const REQUIRED_HEADINGS = [
  "作用",
  "触发场景",
  "所需上下文",
  "工作流",
  "输出",
  "注意事项",
] as const;

const FRONTMATTER_NAME_PATTERN = /^name:\s*.+$/m;
const FRONTMATTER_DESCRIPTION_PATTERN = /^description:\s*.+$/m;

const stringifyFrontmatterValue = (value: string): string => {
  return /[:#]/.test(value) || value.trim() !== value
    ? JSON.stringify(value)
    : value;
};

const parseFrontmatterValue = (value: string): string => {
  const trimmedValue = value.trim();

  if (
    (trimmedValue.startsWith('"') && trimmedValue.endsWith('"')) ||
    (trimmedValue.startsWith("'") && trimmedValue.endsWith("'"))
  ) {
    try {
      return JSON.parse(trimmedValue);
    } catch {
      return trimmedValue.slice(1, -1);
    }
  }

  return trimmedValue;
};

export const readSkillCreationDraftFrontmatter = (
  markdownDraft: string,
): { name: string; description: string } | null => {
  const normalizedDraft = markdownDraft.replace(/\r\n/g, "\n");

  if (!normalizedDraft.startsWith("---\n")) {
    return null;
  }

  const lines = normalizedDraft.split("\n");
  const closingIndex = lines.findIndex(
    (line, index) => index > 0 && line.trim() === "---",
  );

  if (closingIndex <= 0) {
    return null;
  }

  const frontmatter = new Map<string, string>();
  for (const line of lines.slice(1, closingIndex)) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1);
    if (key) {
      frontmatter.set(key, parseFrontmatterValue(value));
    }
  }

  const name = frontmatter.get("name")?.trim() ?? "";
  const description = frontmatter.get("description")?.trim() ?? "";

  return name || description ? { name, description } : null;
};

export const syncSkillCreationDraftFrontmatter = (
  markdownDraft: string,
  values: {
    name: string;
    description: string;
  },
): string => {
  const normalizedDraft = markdownDraft.replace(/\r\n/g, "\n");

  if (!normalizedDraft.startsWith("---\n")) {
    return markdownDraft;
  }

  const lines = normalizedDraft.split("\n");
  const closingIndex = lines.findIndex(
    (line, index) => index > 0 && line.trim() === "---",
  );

  if (closingIndex <= 0) {
    return markdownDraft;
  }

  const frontmatterLines = lines.slice(1, closingIndex);
  const replaceField = (key: "name" | "description", nextValue: string) => {
    const renderedValue = stringifyFrontmatterValue(nextValue);
    const nextLine = `${key}: ${renderedValue}`;
    const currentIndex = frontmatterLines.findIndex((line) =>
      line.trimStart().startsWith(`${key}:`),
    );

    if (currentIndex >= 0) {
      frontmatterLines[currentIndex] = nextLine;
      return;
    }

    frontmatterLines.push(nextLine);
  };

  replaceField("name", values.name);
  replaceField("description", values.description);

  return [
    lines[0],
    ...frontmatterLines,
    ...lines.slice(closingIndex),
  ].join("\n");
};

export const hasMinimumSkillCreationInputs = ({
  name,
  description,
  taskIntent,
}: {
  name: string;
  description: string;
  taskIntent: string;
}): boolean => {
  return [name, description, taskIntent].every((value) => value.trim().length > 0);
};

export const hasValidMinimumCreationMarkdown = (
  markdownDraft: string,
): boolean => {
  const normalizedDraft = markdownDraft.replace(/\r\n/g, "\n").trim();

  if (!normalizedDraft.startsWith("---")) {
    return false;
  }

  if (
    !FRONTMATTER_NAME_PATTERN.test(normalizedDraft) ||
    !FRONTMATTER_DESCRIPTION_PATTERN.test(normalizedDraft)
  ) {
    return false;
  }

  const existingHeadings = REQUIRED_HEADINGS.filter((heading) =>
    new RegExp(`^#{1,2}\\s+${heading}\\s*$`, "mu").test(normalizedDraft),
  );

  return existingHeadings.length >= 4;
};
