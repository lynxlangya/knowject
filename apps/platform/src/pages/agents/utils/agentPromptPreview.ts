export const buildAgentPromptPreview = (systemPrompt: string): string => {
  const normalized = systemPrompt.replace(/\s+/g, ' ').trim();

  if (!normalized) {
    return '当前未填写提示词。';
  }

  return normalized.length > 60 ? `${normalized.slice(0, 60)}…` : normalized;
};
