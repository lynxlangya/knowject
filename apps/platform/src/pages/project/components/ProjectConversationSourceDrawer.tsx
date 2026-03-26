import React from 'react';
import { Alert, Button, Skeleton, Typography } from 'antd';
import { tp } from '../project.i18n';

void React;

const PROJECT_CHAT_SOURCE_TAB_CLASS_NAME = [
  'group/source-tab rounded-[1.15rem] border px-3 py-2.5 text-left transition-all duration-200',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b0e6dc] focus-visible:ring-offset-2',
].join(' ');

const PROJECT_CHAT_SOURCE_TAB_ACTIVE_CLASS_NAME = [
  'border-[#9fdcce] bg-[linear-gradient(180deg,rgba(247,255,252,0.98),rgba(235,249,243,0.96))] shadow-[0_8px_20px_rgba(31,122,103,0.08)]',
].join(' ');

const PROJECT_CHAT_SOURCE_TAB_IDLE_CLASS_NAME = [
  'border-slate-200/90 bg-white/92 shadow-[0_3px_10px_rgba(15,23,42,0.04)]',
  'hover:border-[#c7e8e0] hover:bg-[#fbfefd] hover:shadow-[0_8px_18px_rgba(15,23,42,0.06)]',
].join(' ');

const PROJECT_CHAT_SOURCE_CHUNK_BUTTON_CLASS_NAME = [
  'rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b0e6dc] focus-visible:ring-offset-2',
].join(' ');

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
    <div
      data-project-chat-source-drawer-panel="true"
      className="flex h-full min-h-0 flex-col gap-3 rounded-[1.6rem] border border-[#d9ece7] bg-[linear-gradient(180deg,rgba(252,255,254,0.98),rgba(245,250,248,0.96))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]"
    >
      <div
        className="grid grid-cols-1 gap-2 sm:grid-cols-2"
        data-project-chat-source-tab-active={activeSource?.sourceKey ?? ''}
      >
        {sourceEntries.map((entry) => (
          <button
            key={entry.sourceKey}
            type="button"
            data-project-chat-source-tab={entry.sourceKey}
            className={[
              PROJECT_CHAT_SOURCE_TAB_CLASS_NAME,
              entry.sourceKey === activeSource?.sourceKey
                ? PROJECT_CHAT_SOURCE_TAB_ACTIVE_CLASS_NAME
                : PROJECT_CHAT_SOURCE_TAB_IDLE_CLASS_NAME,
            ].join(' ')}
            aria-label={`${tp('conversation.sourceDrawer.sourceLabel')}: ${entry.sourceLabel}`}
            aria-pressed={entry.sourceKey === activeSource?.sourceKey}
            onClick={() => onSourceKeyChange(entry.sourceKey)}
          >
            <span className="flex items-start justify-between gap-3">
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-[#173c35]">
                  {entry.sourceLabel}
                </span>
                <span className="mt-1 block text-xs text-[#6c8d84]">
                  {tp('conversation.sourceDrawer.distanceLabel')} {formatDistance(entry.distance)}
                </span>
              </span>
              <span
                aria-hidden="true"
                className={[
                  'mt-1 h-2 w-2 rounded-full transition-colors duration-200',
                  entry.sourceKey === activeSource?.sourceKey
                    ? 'bg-[#1f7a67] shadow-[0_0_0_3px_rgba(159,226,212,0.34)]'
                    : 'bg-slate-300',
                ].join(' ')}
              />
            </span>
          </button>
        ))}
      </div>

      {state === 'loading' ? (
        <div data-project-chat-source-drawer-loading="true">
          <Typography.Text className="mb-2 block text-sm text-slate-500">
            {tp('conversation.sourceDrawer.loading')}
          </Typography.Text>
          <Skeleton active paragraph={{ rows: 6 }} />
        </div>
      ) : null}

      {state === 'error' ? (
        <Alert
          type="error"
          showIcon
          title={errorMessage ?? tp('conversation.sourceDrawer.errorFallback')}
          action={
            <Button size="small" onClick={onRetry}>
              {tp('conversation.sourceDrawer.retry')}
            </Button>
          }
        />
      ) : null}

      {state === 'ready' && activeSource ? (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1.8fr)_minmax(140px,0.75fr)]">
            <section
              data-project-chat-source-metadata-card="source"
              className="rounded-[1.2rem] border border-[#dceee9] bg-white/90 px-4 py-3 shadow-[0_6px_18px_rgba(15,23,42,0.04)]"
            >
              <Typography.Text className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6b8f86]">
                {tp('conversation.sourceDrawer.sourceLabel')}
              </Typography.Text>
              <Typography.Text className="text-[15px] font-semibold leading-6 text-[#173c35]">
                {activeSource.sourceLabel}
              </Typography.Text>
            </section>

            <section
              data-project-chat-source-metadata-card="distance"
              className="rounded-[1.2rem] border border-[#dceee9] bg-[#f7fcfa] px-4 py-3 shadow-[0_6px_18px_rgba(15,23,42,0.04)]"
            >
              <Typography.Text className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6b8f86]">
                {tp('conversation.sourceDrawer.distanceLabel')}
              </Typography.Text>
              <Typography.Text className="block text-[20px] font-semibold tracking-[-0.03em] text-[#173c35]">
                {formatDistance(activeSource.distance)}
              </Typography.Text>
            </section>
          </div>

          {activeSource.entries.length > 1 ? (
            <div
              data-project-chat-source-active-chunk-id={activeEntry?.chunkId ?? ''}
              className="rounded-[1.2rem] border border-[#dceee9] bg-white/78 px-3 py-3 shadow-[0_6px_18px_rgba(15,23,42,0.04)]"
            >
              <Typography.Text className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6b8f86]">
                {tp('conversation.sourceDrawer.chunkLabel')}
              </Typography.Text>
              <div className="flex flex-wrap gap-2">
                {activeSource.entries.map((entry) => (
                  <button
                    key={entry.chunkId}
                    type="button"
                    data-project-chat-source-chunk-id={entry.chunkId}
                    className={[
                      PROJECT_CHAT_SOURCE_CHUNK_BUTTON_CLASS_NAME,
                      entry.chunkId === activeEntry?.chunkId
                        ? 'border-[#95d7c9] bg-[#eef8f4] text-[#17594b] shadow-[0_6px_14px_rgba(31,122,103,0.08)]'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-[#c7e8e0] hover:bg-[#fbfefd]',
                    ].join(' ')}
                    onClick={() => onActiveChunkIdChange(entry.chunkId)}
                  >
                    {tp('conversation.sourceDrawer.chunkValue', {
                      index: entry.chunkIndex + 1,
                    })}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div
            data-project-chat-source-snippet-panel="true"
            className="min-h-0 flex-1 overflow-hidden rounded-[1.35rem] border border-[#d5e9e3] bg-white/92 shadow-[0_10px_24px_rgba(15,23,42,0.05)]"
          >
            <div className="flex h-full min-h-0 flex-col">
              <div className="flex items-center justify-between border-b border-[#e2f0ec] px-4 py-3">
                <Typography.Text className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6b8f86]">
                  {tp('conversation.sources')}
                </Typography.Text>
                {activeEntry ? (
                  <span className="inline-flex rounded-full border border-[#d8ebe5] bg-[#f7fcfa] px-2.5 py-1 text-[10px] font-medium tracking-[0.04em] text-[#557a71]">
                    {activeEntry.chunkId}
                  </span>
                ) : null}
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                <Typography.Paragraph className="mb-0! whitespace-pre-wrap text-[14px]! leading-7! text-slate-700!">
                  {activeEntry?.snippet || tp('conversation.sourceDrawer.emptySnippet')}
                </Typography.Paragraph>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
