import { Typography } from 'antd';
import type { ReactNode } from 'react';
import type { ConversationSummary } from '@app/project/project.types';
import { KNOWJECT_BRAND } from '@styles/brand';
import i18n from '../../i18n';
import { tp } from './project.i18n';

interface ProjectConversationLabelProps {
  conversation: ConversationSummary;
  active: boolean;
  titleContent?: ReactNode;
}

const formatConversationUpdatedAt = (value: string): string => {
  return new Intl.DateTimeFormat(i18n.resolvedLanguage || 'en', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

export const ProjectConversationLabel = ({
  conversation,
  active,
  titleContent,
}: ProjectConversationLabelProps) => {
  return (
    <div
      className={[
        'group relative w-full overflow-hidden rounded-3xl border px-4 py-4 text-left transition-colors duration-200 ease-out',
        active
          ? 'bg-white'
          : 'border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/70',
      ].join(' ')}
      style={
        active
          ? {
              backgroundColor: KNOWJECT_BRAND.primarySurface,
              borderColor: KNOWJECT_BRAND.primaryBorder,
            }
          : undefined
      }
    >
      <span
        className={[
          'absolute bottom-4 left-0 top-4 w-1 rounded-full transition-colors duration-200',
          active ? '' : 'bg-[#C2EDE6] group-hover:bg-[#28B8A0]/60',
        ].join(' ')}
        style={active ? { backgroundColor: KNOWJECT_BRAND.primary } : undefined}
        aria-hidden="true"
      />

      <div className="pl-3">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2">
              <span
                className={[
                  'h-2.5 w-2.5 rounded-full transition-colors duration-200',
                  active ? 'bg-emerald-400' : 'bg-[#C2EDE6] group-hover:bg-[#28B8A0]/70',
                ].join(' ')}
                aria-hidden="true"
              />
              <Typography.Text
                className={[
                  'text-caption font-semibold uppercase tracking-[0.18em]',
                  active ? 'text-emerald-600' : 'text-slate-400',
                ].join(' ')}
              >
                {active ? tp('conversation.active') : tp('conversation.recent')}
              </Typography.Text>
            </div>
          </div>

          <span
            className={[
              'shrink-0 rounded-full px-2.5 py-1 text-caption font-medium',
              active
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-slate-100 text-slate-500',
            ].join(' ')}
          >
            {formatConversationUpdatedAt(conversation.updatedAt)}
          </span>
        </div>

        {titleContent ?? (
          <Typography.Text className="[display:-webkit-box] overflow-hidden text-body font-semibold leading-7 text-slate-800 [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
            {conversation.title}
          </Typography.Text>
        )}
      </div>
    </div>
  );
};
