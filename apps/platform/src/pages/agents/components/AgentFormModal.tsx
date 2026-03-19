import { Alert, Form, Input, Modal, Select, type FormInstance } from 'antd';
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
  return (
    <Modal
      title={modalMode === 'create' ? '新建智能体' : '编辑智能体'}
      open={modalMode !== null}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={submitting}
      destroyOnHidden
      okText={modalMode === 'create' ? '创建智能体' : '保存修改'}
      cancelText="取消"
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
          message="当前模型由服务端固定为 server-default，页面只维护提示词、状态与资源绑定。"
        />

        <Form.Item
          name="name"
          label="智能体名称"
          rules={[{ required: true, whitespace: true, message: '请输入智能体名称' }]}
        >
          <Input maxLength={80} placeholder="例如：代码审查助手" />
        </Form.Item>

        <Form.Item name="description" label="描述">
          <Input.TextArea
            autoSize={{ minRows: 3, maxRows: 5 }}
            maxLength={240}
            placeholder="描述这个智能体的职责、边界和适用场景。"
          />
        </Form.Item>

        <Form.Item
          name="systemPrompt"
          label="System Prompt"
          rules={[
            {
              required: true,
              whitespace: true,
              message: '请输入 System Prompt',
            },
          ]}
        >
          <Input.TextArea
            autoSize={{ minRows: 5, maxRows: 8 }}
            maxLength={2000}
            showCount
            placeholder="例如：你是一个严格但务实的代码审查助手，优先指出回归风险、测试缺口和可维护性问题。"
          />
        </Form.Item>

        <Form.Item name="status" label="状态">
          <Select
            options={[
              { value: 'active', label: 'active · 启用中' },
              { value: 'disabled', label: 'disabled · 已停用' },
            ]}
          />
        </Form.Item>

        <Form.Item name="boundKnowledgeIds" label="绑定知识库">
          <Select
            mode="multiple"
            allowClear
            placeholder="可选"
            options={knowledgeOptions}
            notFoundContent="暂无可选知识库"
          />
        </Form.Item>

        <Form.Item name="boundSkillIds" label="绑定 Skill">
          <Select
            mode="multiple"
            allowClear
            placeholder="可选"
            options={skillOptions}
            notFoundContent="暂无可选 Skill"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
