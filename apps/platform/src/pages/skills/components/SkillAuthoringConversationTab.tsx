import { Alert, Button, Card, Input, Select, Typography } from 'antd';
import type { SkillCategory } from '@api/skills';
import { useTranslation } from 'react-i18next';
import { getAuthoringScopeTargetOptions, getCategoryOptions } from '../constants/skillsManagement.constants';
import type { SkillAuthoringSessionState } from '../types/skillsManagement.types';

interface SkillAuthoringConversationTabProps {
  session: SkillAuthoringSessionState;
  authoringSubmitting: boolean;
  onScenarioChange: (value: SkillCategory) => void;
  onTargetsChange: (value: string[]) => void;
  onConfirmScope: () => void;
  onAnswerChange: (value: string) => void;
  onSubmitAnswer: () => void;
  onConfirmDraft: () => void;
}

export const SkillAuthoringConversationTab = ({
  session,
  authoringSubmitting,
  onScenarioChange,
  onTargetsChange,
  onConfirmScope,
  onAnswerChange,
  onSubmitAnswer,
  onConfirmDraft,
}: SkillAuthoringConversationTabProps) => {
  const { t } = useTranslation('pages');
  const categoryOptions = getCategoryOptions();
  const scopeTargetOptions = getAuthoringScopeTargetOptions();
  const hasConfirmedScope = Boolean(
    session.scope.scenario && session.scope.targets.length > 0,
  );
  const canContinue = hasConfirmedScope && session.pendingAnswer.trim().length > 0;

  return (
    <div className="space-y-4">
      <Alert type="info" showIcon message={t('skills.authoring.intro')} />

      <Card className="space-y-3">
        <Typography.Paragraph type="secondary">
          {session.messages[0]?.content ?? t('skills.authoring.scope.title')}
        </Typography.Paragraph>

        <div className="space-y-2">
          <Typography.Text className="text-sm font-medium text-slate-700">
            {t('skills.authoring.scope.scenario')}
          </Typography.Text>
          <Select
            value={session.scope.scenario}
            options={categoryOptions}
            onChange={onScenarioChange}
          />
        </div>

        <div className="space-y-2">
          <Typography.Text className="text-sm font-medium text-slate-700">
            {t('skills.authoring.scope.targets')}
          </Typography.Text>
          <Select
            mode="multiple"
            value={session.scope.targets}
            options={scopeTargetOptions}
            onChange={onTargetsChange}
          />
        </div>

        <div className="flex justify-end">
          <Button
            onClick={onConfirmScope}
            disabled={
              authoringSubmitting ||
              !session.scope.scenario ||
              session.scope.targets.length === 0
            }
          >
            {t('skills.authoring.actions.confirmScope')}
          </Button>
        </div>
      </Card>

      {session.stage === 'synthesizing' ? (
        <Alert type="info" showIcon message={t('skills.authoring.synthesizing')} />
      ) : null}

      <div className="space-y-3">
        {session.messages.map((message, index) => (
          <div
            key={message.id ?? `${message.role}-${index}`}
            className={
              message.role === 'assistant'
                ? 'rounded-xl bg-slate-50 p-3'
                : 'rounded-xl bg-emerald-50 p-3'
            }
          >
            {message.content}
          </div>
        ))}
      </div>

      <Input.TextArea
        value={session.pendingAnswer}
        autoSize={{ minRows: 4, maxRows: 8 }}
        disabled={!hasConfirmedScope || authoringSubmitting}
        onChange={(event) => {
          onAnswerChange(event.target.value);
        }}
      />

      <div className="flex flex-wrap justify-end gap-3">
        <Button
          onClick={onSubmitAnswer}
          loading={authoringSubmitting}
          disabled={!canContinue || authoringSubmitting}
        >
          {t('skills.authoring.actions.continue')}
        </Button>
        {session.readyForConfirmation ? (
          <Button type="primary" onClick={onConfirmDraft} disabled={authoringSubmitting}>
            {t('skills.authoring.actions.confirmDraft')}
          </Button>
        ) : null}
      </div>
    </div>
  );
};
