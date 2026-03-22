import { tp } from '../agents.i18n';

export const buildAgentPromptPreview = (systemPrompt: string): string => {
  const normalized = systemPrompt.replace(/\s+/g, ' ').trim();

  if (!normalized) {
    return tp('feedback.promptFallback');
  }

  return normalized.length > 60 ? `${normalized.slice(0, 60)}…` : normalized;
};
