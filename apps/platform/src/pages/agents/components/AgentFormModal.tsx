import { Alert, Form, Input, Modal, Select, type FormInstance } from 'antd';
import { useTranslation } from 'react-i18next';
import { AGENT_FORM_INITIAL_VALUES } from '../constants/agentsManagement.constants';
import type {
  AgentFormValues,
  AgentSelectOption,
  ModalMode,
} from '../types/agentsManagement.types';

interface AgentFormModalProps {
  form: FormInstance<AgentFormValues>;
  knowledgeOptions: AgentSelectOption[];
  modalMode: ModalMode;
  onCancel: () => void;
  onSubmit: (values: AgentFormValues) => void;
  skillOptions: AgentSelectOption[];
  submitting: boolean;
}

export const AgentFormModal = ({
  form,
  knowledgeOptions,
  modalMode,
  onCancel,
  onSubmit,
  skillOptions,
  submitting,
}: AgentFormModalProps) => {
  const { t } = useTranslation('pages');
  return (
    <Modal
      title={
        modalMode === 'create'
          ? t('agents.form.createTitle')
          : t('agents.form.editTitle')
      }
      open={modalMode !== null}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={submitting}
      destroyOnHidden
      okText={
        modalMode === 'create' ? t('agents.form.create') : t('agents.form.save')
      }
      cancelText={t('agents.form.cancel')}
    >
      <Form<AgentFormValues>
        form={form}
        layout="vertical"
        onFinish={onSubmit}
        initialValues={AGENT_FORM_INITIAL_VALUES}
      >
        <Alert
          type="info"
          showIcon
          className="mb-4"
          message={t('agents.form.intro')}
        />

        <Form.Item
          name="name"
          label={t('agents.form.name')}
          rules={[{ required: true, whitespace: true, message: t('agents.form.nameRequired') }]}
        >
          <Input maxLength={80} placeholder={t('agents.form.namePlaceholder')} />
        </Form.Item>

        <Form.Item name="description" label={t('agents.form.description')}>
          <Input.TextArea
            autoSize={{ minRows: 3, maxRows: 5 }}
            maxLength={240}
            placeholder={t('agents.form.descriptionPlaceholder')}
          />
        </Form.Item>

        <Form.Item
          name="systemPrompt"
          label={t('agents.form.systemPrompt')}
          rules={[
            {
              required: true,
              whitespace: true,
              message: t('agents.form.promptRequired'),
            },
          ]}
        >
          <Input.TextArea
            autoSize={{ minRows: 5, maxRows: 8 }}
            maxLength={2000}
            showCount
            placeholder={t('agents.form.promptPlaceholder')}
          />
        </Form.Item>

        <Form.Item name="status" label={t('agents.form.status')}>
          <Select
            options={[
              { value: 'active', label: t('agents.form.active') },
              { value: 'disabled', label: t('agents.form.disabled') },
            ]}
          />
        </Form.Item>

        <Form.Item name="boundKnowledgeIds" label={t('agents.form.knowledge')}>
          <Select
            mode="multiple"
            allowClear
            placeholder={t('agents.form.optional')}
            options={knowledgeOptions}
            notFoundContent={t('agents.form.noKnowledge')}
          />
        </Form.Item>

        <Form.Item name="boundSkillIds" label={t('agents.form.skills')}>
          <Select
            mode="multiple"
            allowClear
            placeholder={t('agents.form.optional')}
            options={skillOptions}
            notFoundContent={t('agents.form.noSkills')}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
