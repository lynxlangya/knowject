export interface ProjectSummary {
  id: string;
  name: string;
  createdAt: string;
}

export interface ConversationSummary {
  id: string;
  projectId: string;
  title: string;
  updatedAt: string;
  preview: string;
}

export type ChatMessageRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: ChatMessageRole;
  content: string;
  createdAt: string;
}

export type AddProjectResult = 'added' | 'empty' | 'duplicate';
