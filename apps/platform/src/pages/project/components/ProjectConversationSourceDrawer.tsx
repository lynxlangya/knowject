import React from 'react';
import { Alert, Button, Skeleton, Typography } from 'antd';

void React;

interface ProjectConversationSourceDrawerChunkEntry {
  id: string;
  chunkId: string;
  chunkIndex: number;
  snippet: string;
}

interface ProjectConversationSourceDrawerSourceEntry {
  sourceKey: string;
  sourceLabel: string;
  distance: number | null;
  activeEntry: {
    id: string;
    snippet: string;
  };
  entries: ProjectConversationSourceDrawerChunkEntry[];
}

interface ProjectConversationSourceDrawerProps {
  state: 'loading' | 'error' | 'ready';
  sourceEntries: ProjectConversationSourceDrawerSourceEntry[];
  activeSourceKey: string;
  activeChunkId?: string | null;
  errorMessage?: string;
  onSourceKeyChange: (sourceKey: string) => void;
  onActiveChunkIdChange: (chunkId: string) => void;
  onRetry: () => void;
}

const formatDistance = (distance: number | null): string => {
  return distance === null ? '-' : distance.toFixed(2);
};

export const ProjectConversationSourceDrawer = ({
  state,
  sourceEntries,
  activeSourceKey,
  activeChunkId,
  errorMessage,
  onSourceKeyChange,
  onActiveChunkIdChange,
  onRetry,
}: ProjectConversationSourceDrawerProps) => {
  const activeSource =
    sourceEntries.find((entry) => entry.sourceKey === activeSourceKey) ??
    sourceEntries[0] ??
    null;
  const activeEntry = activeSource
    ? activeSource.entries.find((entry) => entry.chunkId === activeChunkId) ??
      activeSource.entries[0] ??
      activeSource.activeEntry
    : null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div
        className="flex flex-wrap gap-2"
        data-project-chat-source-tab-active={activeSource?.sourceKey ?? ''}
      >
        {sourceEntries.map((entry) => (
          <button
            key={entry.sourceKey}
            type="button"
            data-project-chat-source-tab={entry.sourceKey}
            className={[
              'rounded-full border px-3 py-1 text-xs',
              entry.sourceKey === activeSource?.sourceKey
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-slate-50 text-slate-600',
            ].join(' ')}
            onClick={() => onSourceKeyChange(entry.sourceKey)}
          >
            <span>{entry.sourceKey}</span>
            <span className="sr-only">{entry.sourceLabel}</span>
          </button>
        ))}
      </div>

      {state === 'loading' ? (
        <div data-project-chat-source-drawer-loading="true">
          <Typography.Text className="mb-2 block text-sm text-slate-500">
            Loading placeholder
          </Typography.Text>
          <Skeleton active paragraph={{ rows: 6 }} />
        </div>
      ) : null}

      {state === 'error' ? (
        <Alert
          type="error"
          showIcon
          title={errorMessage ?? 'Failed to load source'}
          action={
            <Button size="small" onClick={onRetry}>
              Retry
            </Button>
          }
        />
      ) : null}

      {state === 'ready' && activeSource ? (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
          <div>
            <Typography.Text className="block text-xs text-slate-500">
              Source
            </Typography.Text>
            <Typography.Text className="text-sm font-medium text-slate-800">
              {activeSource.sourceLabel}
            </Typography.Text>
          </div>

          <div>
            <Typography.Text className="block text-xs text-slate-500">
              Distance
            </Typography.Text>
            <Typography.Text className="text-sm text-slate-700">
              {formatDistance(activeSource.distance)}
            </Typography.Text>
          </div>

          {activeSource.entries.length > 1 ? (
            <div data-project-chat-source-active-chunk-id={activeEntry?.chunkId ?? ''}>
              <Typography.Text className="mb-2 block text-xs text-slate-500">
                Chunk
              </Typography.Text>
              <div className="flex flex-wrap gap-2">
                {activeSource.entries.map((entry) => (
                  <button
                    key={entry.chunkId}
                    type="button"
                    data-project-chat-source-chunk-id={entry.chunkId}
                    className={[
                      'rounded-full border px-2.5 py-1 text-xs',
                      entry.chunkId === activeEntry?.chunkId
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-white text-slate-600',
                    ].join(' ')}
                    onClick={() => onActiveChunkIdChange(entry.chunkId)}
                  >
                    chunk {entry.chunkIndex + 1}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <Typography.Paragraph className="mb-0! whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {activeEntry?.snippet || 'No snippet available'}
            </Typography.Paragraph>
          </div>
        </div>
      ) : null}
    </div>
  );
};
