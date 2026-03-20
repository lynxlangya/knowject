import {
  CopyOutlined,
  EditOutlined,
  FileTextOutlined,
  RedoOutlined,
} from '@ant-design/icons';
import { Popover, Typography } from 'antd';
import React from 'react';
import type { MouseEvent } from 'react';
import type { ProjectConversationSourceResponse } from '../../api/projects';
import { ProjectChatMarkdown } from './projectChat.markdown';

export interface ProjectChatUserBubbleActions {
  editing: boolean;
  disabled: boolean;
  onRetry: () => void;
  onEditStart: () => void;
  onEditConfirm: (content: string) => void;
  onEditCancel: () => void;
  onCopy: () => void;
}

export interface ProjectChatBubbleExtraInfo {
  createdAt: string;
  sources: ProjectConversationSourceResponse[];
  messageId?: string;
  status?: ProjectChatBubbleStatus;
  userActions?: ProjectChatUserBubbleActions;
}

export type ProjectChatBubbleStatus = 'streaming' | 'reconciling';

const PROJECT_CHAT_BUBBLE_STATUS_LABELS: Record<ProjectChatBubbleStatus, string> = {
  streaming: '生成中',
  reconciling: '同步中',
};

void React;

const formatMessageTime = (value: string): string => {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

const formatSourceDistance = (value: number | null): string | null => {
  if (value === null) {
    return null;
  }

  return `distance ${value.toFixed(2)}`;
};

const ProjectConversationSources = ({
  sources,
}: {
  sources: ProjectConversationSourceResponse[];
}) => {
  if (sources.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {sources.map((source, index) => {
        const fileName =
          source.source.split(/[\\/]/).filter(Boolean).pop() || source.source;

        return (
          <Popover
            key={`${source.knowledgeId}:${source.documentId}:${source.chunkId}:${source.chunkIndex}`}
            trigger={['hover', 'focus']}
            placement="topLeft"
            mouseEnterDelay={0.12}
            overlayClassName="max-w-[420px]"
            content={
              <div className="max-w-[360px] space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Typography.Text className="block truncate text-sm font-semibold text-slate-800">
                      {fileName}
                    </Typography.Text>
                    {source.source !== fileName ? (
                      <Typography.Text className="block text-caption leading-5 text-slate-400">
                        {source.source}
                      </Typography.Text>
                    ) : null}
                  </div>
                  {formatSourceDistance(source.distance) ? (
                    <Typography.Text className="shrink-0 text-caption text-slate-400">
                      {formatSourceDistance(source.distance)}
                    </Typography.Text>
                  ) : null}
                </div>
                <Typography.Paragraph className="mb-0! text-xs! leading-6! text-slate-600!">
                  {source.snippet}
                </Typography.Paragraph>
              </div>
            }
          >
            <span
              tabIndex={0}
              className="inline-flex max-w-full cursor-default items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-all duration-200 hover:border-emerald-200 hover:bg-emerald-50/80 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-100"
            >
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-100 px-1 text-caption font-semibold text-slate-500">
                {index + 1}
              </span>
              <FileTextOutlined className="text-xs text-slate-400" />
              <span className="max-w-[13rem] truncate">{fileName}</span>
            </span>
          </Popover>
        );
      })}
    </div>
  );
};

const BubbleTimestamp = ({ createdAt }: { createdAt: string }) => {
  return (
    <Typography.Text className="text-caption font-medium tracking-[0.02em] text-slate-400">
      {formatMessageTime(createdAt)}
    </Typography.Text>
  );
};

export const ProjectChatAssistantMessage = ({
  content,
  extraInfo,
}: {
  content: string;
  extraInfo?: ProjectChatBubbleExtraInfo;
}) => {
  return (
    <div
      id={getProjectChatMessageDomId(extraInfo?.messageId)}
      className="text-body text-slate-700"
    >
      <ProjectChatMarkdown content={content} />
    </div>
  );
};

const getProjectChatMessageDomId = (messageId?: string) => {
  return messageId ? `project-chat-message-${messageId}` : undefined;
};

export const ProjectChatUserMessage = ({
  content,
  extraInfo,
}: {
  content: string;
  extraInfo?: ProjectChatBubbleExtraInfo;
}) => {
  return (
    <Typography.Paragraph
      id={getProjectChatMessageDomId(extraInfo?.messageId)}
      className="mb-0! whitespace-pre-wrap text-body! leading-7! text-slate-800!"
    >
      {content}
    </Typography.Paragraph>
  );
};

export const ProjectChatAssistantFooter = ({
  extraInfo,
}: {
  extraInfo?: ProjectChatBubbleExtraInfo;
}) => {
  if (!extraInfo) {
    return null;
  }

  return (
    <div className="mt-2.5 flex flex-col gap-2.5">
      {extraInfo.sources.length > 0 ? (
        <ProjectConversationSources sources={extraInfo.sources} />
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        {extraInfo.status ? (
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-caption font-medium text-emerald-700">
            {PROJECT_CHAT_BUBBLE_STATUS_LABELS[extraInfo.status]}
          </span>
        ) : null}
        <BubbleTimestamp createdAt={extraInfo.createdAt} />
      </div>
    </div>
  );
};

export const ProjectChatUserFooter = ({
  extraInfo,
}: {
  extraInfo?: ProjectChatBubbleExtraInfo;
}) => {
  if (!extraInfo) {
    return null;
  }

  if (!extraInfo.userActions) {
    return (
      <div className="mt-1.5 flex h-6 items-center justify-end pr-0.5">
        <BubbleTimestamp createdAt={extraInfo.createdAt} />
      </div>
    );
  }

  const { userActions } = extraInfo;
  const handleActionClick = (
    event: MouseEvent<HTMLButtonElement>,
    action: () => void,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (userActions.disabled) {
      return;
    }

    action();
  };

  return (
    <div className="mt-1.5 h-6">
      <div className="invisible flex h-full items-center justify-end gap-1 pr-0.5 text-slate-400 opacity-0 transition-opacity duration-200 group-hover:visible group-hover:opacity-100">
        <BubbleTimestamp createdAt={extraInfo.createdAt} />

        <button
          type="button"
          aria-label="重新发起请求"
          disabled={userActions.disabled}
          className="inline-flex h-6 w-6 items-center justify-center rounded-full transition-colors duration-200 hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:text-slate-300"
          onClick={(event) => handleActionClick(event, userActions.onRetry)}
        >
          <RedoOutlined className="text-xs" />
        </button>
        <button
          type="button"
          aria-label="编辑消息"
          disabled={userActions.disabled}
          className="inline-flex h-6 w-6 items-center justify-center rounded-full transition-colors duration-200 hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:text-slate-300"
          onClick={(event) =>
            handleActionClick(event, userActions.onEditStart)
          }
        >
          <EditOutlined className="text-xs" />
        </button>
        <button
          type="button"
          aria-label="复制消息"
          disabled={userActions.disabled}
          className="inline-flex h-6 w-6 items-center justify-center rounded-full transition-colors duration-200 hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:text-slate-300"
          onClick={(event) => handleActionClick(event, userActions.onCopy)}
        >
          <CopyOutlined className="text-xs" />
        </button>
      </div>
    </div>
  );
};
