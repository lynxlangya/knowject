import {
  ArrowUpOutlined,
  CloseOutlined,
  PartitionOutlined,
  PlusOutlined,
  StopOutlined,
} from '@ant-design/icons';
import {
  Button,
  Input,
  Popover,
} from 'antd';
import { KNOWJECT_BRAND } from '../../../styles/brand';
import { tp } from '../project.i18n';

export interface ProjectChatComposerSkillOption {
  id: string;
  name: string;
  description: string;
}

interface ProjectChatComposerProps {
  availableSkills: ProjectChatComposerSkillOption[];
  value: string;
  canSubmit: boolean;
  sendActionLocked: boolean;
  isStreaming: boolean;
  submitLoading: boolean;
  selectedSkillId: string | null;
  onValueChange: (value: string) => void;
  onSelectedSkillIdChange: (skillId: string | null) => void;
  onSubmit: () => void;
  onStop: () => void;
}

export const ProjectChatComposer = ({
  availableSkills,
  value,
  canSubmit,
  sendActionLocked,
  isStreaming,
  submitLoading,
  selectedSkillId,
  onValueChange,
  onSelectedSkillIdChange,
  onSubmit,
  onStop,
}: ProjectChatComposerProps) => {
  const selectedSkill =
    availableSkills.find((skill) => skill.id === selectedSkillId) ?? null;

  return (
    <form
      data-project-chat-composer="true"
      className="overflow-hidden rounded-[1.1rem] border bg-white shadow-[0_4px_10px_rgba(15,23,42,0.02)] transition-colors duration-200"
      style={{
        borderColor: KNOWJECT_BRAND.primaryBorder,
        boxShadow: `0 4px 10px rgba(15, 23, 42, 0.02), inset 0 1px 0 rgba(255, 255, 255, 0.92)`,
      }}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div
        data-project-chat-composer-editor="true"
        className="relative bg-[linear-gradient(180deg,rgba(251,253,252,0.94),rgba(255,255,255,0.99))] px-2 pt-1 sm:px-2.5 sm:pt-1.5"
      >
        {selectedSkill ? (
          <div
            data-project-chat-composer-skill-pill="true"
            className="mb-1 flex items-center"
          >
            <span className="inline-flex items-center gap-1 rounded-full bg-[#eef8f5] px-2 py-0.5 text-[11px] font-medium text-[#245f54]">
              <span className="truncate">
                {tp('conversation.skillPicker.activeLabel', {
                  name: selectedSkill.name,
                })}
              </span>
              <button
                type="button"
                aria-label={tp('conversation.skillPicker.clear')}
                className="grid h-3.5 w-3.5 place-items-center rounded-full border-0 bg-transparent p-0 text-[10px] text-[#4d7d73] transition-colors hover:bg-[#dff1ec] hover:text-[#1f5a4f]"
                onClick={() => onSelectedSkillIdChange(null)}
              >
                <CloseOutlined />
              </button>
            </span>
          </div>
        ) : null}

        <Input.TextArea
          value={value}
          autoSize={{ minRows: 2, maxRows: 7 }}
          disabled={sendActionLocked}
          variant="borderless"
          aria-label={tp('conversation.composerAria')}
          placeholder={tp('conversation.composerPlaceholder')}
          style={{ width: '100%' }}
          className="w-full! resize-none! bg-transparent! px-0! py-0! pb-1! font-body! text-[14px]! leading-6! text-slate-800! placeholder:text-[13px]! placeholder:font-medium! placeholder:tracking-[0.01em]! placeholder:text-slate-400! min-h-[44px]!"
          onChange={(event) => onValueChange(event.target.value)}
          onPressEnter={(event) => {
            if (event.shiftKey || event.nativeEvent.isComposing) {
              return;
            }

            event.preventDefault();
            onSubmit();
          }}
        />
      </div>

      <div
        data-project-chat-composer-toolbar="true"
        className="flex items-center justify-between gap-1.5 bg-white px-2 py-0.5 sm:px-2.5"
      >
        <div className="flex items-center gap-0.5">
          <Button
            type="text"
            htmlType="button"
            aria-label={tp('conversation.composerPlusAria')}
            disabled={sendActionLocked}
            data-project-chat-composer-plus="true"
            icon={<PlusOutlined />}
            onClick={() => undefined}
            className="h-6.5! w-6.5! rounded-full! bg-transparent! p-0! text-[13px]! text-slate-500! shadow-none! transition-colors! hover:bg-[#f7fbfa]! hover:text-[#235e53]! disabled:bg-transparent! disabled:text-slate-300!"
          />

          <Popover
            trigger="click"
            placement="topLeft"
            overlayClassName="max-w-[260px]"
            content={
              <div className="w-[220px]">
                {availableSkills.length > 0 ? (
                  <div className="flex max-h-[220px] flex-col gap-1 overflow-auto">
                    {availableSkills.map((skill) => {
                      const active = skill.id === selectedSkill?.id;

                      return (
                        <button
                          key={skill.id}
                          type="button"
                          data-project-chat-composer-skill-option={skill.id}
                          className={[
                            'w-full rounded-lg border px-2.5 py-1.5 text-left transition-colors',
                            active
                              ? 'border-[#c6ebe3] bg-[#f3fcfa]'
                              : 'border-slate-200 bg-white hover:border-[#dcece7] hover:bg-[#fafcfb]',
                          ].join(' ')}
                          onClick={() => onSelectedSkillIdChange(skill.id)}
                        >
                          <div className="truncate text-[12px] font-medium text-slate-800">
                            {skill.name}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] text-slate-500">
                    {tp('conversation.skillPicker.empty')}
                  </div>
                )}
              </div>
            }
          >
            <Button
              type="text"
              htmlType="button"
              aria-label={tp('conversation.skillPicker.triggerAria')}
              disabled={sendActionLocked}
              data-project-chat-composer-skill-trigger="true"
              icon={<PartitionOutlined />}
              className={[
                'h-6.5! w-6.5! rounded-full! p-0! text-[12px]!',
                selectedSkill
                  ? 'bg-[#eef8f5]! text-[#245f54]!'
                  : 'bg-transparent! text-slate-500!',
                'shadow-none! transition-colors! hover:bg-[#f7fbfa]! hover:text-[#235e53]! disabled:bg-transparent! disabled:text-slate-300!',
              ].join(' ')}
            />
          </Popover>
        </div>

        {isStreaming ? (
          <Button
            htmlType="button"
            aria-label={tp('conversation.stop')}
            data-project-chat-composer-stop="true"
            icon={<StopOutlined />}
            onClick={onStop}
            className="h-6.5! min-w-[64px]! rounded-full! border-slate-200! bg-white! px-2! text-[10px]! font-semibold! text-slate-700! shadow-[0_1px_4px_rgba(15,23,42,0.016)]! transition-colors! hover:border-slate-300! hover:bg-slate-50!"
          >
            {tp('conversation.stop')}
          </Button>
        ) : (
          <Button
            type="primary"
            htmlType="submit"
            shape="circle"
            aria-label={tp('conversation.sendAria')}
            data-project-chat-composer-submit="true"
            loading={submitLoading}
            disabled={!canSubmit}
            icon={<ArrowUpOutlined />}
            className="h-6.5! w-6.5! shrink-0 border-0! shadow-[0_2px_6px_rgba(40,184,160,0.1)]!"
            style={{
              background: canSubmit
                ? KNOWJECT_BRAND.primary
                : KNOWJECT_BRAND.primarySurfaceStrong,
              color: canSubmit
                ? '#ffffff'
                : KNOWJECT_BRAND.textMuted,
            }}
          />
        )}
      </div>
    </form>
  );
};
