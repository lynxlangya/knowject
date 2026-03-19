import { Form, Input, Modal, Select } from "antd";
import { useEffect } from "react";
import type { ProjectSummary } from "@app/project/project.types";
import { useProjectResourceOptions } from "@app/project/useProjectResourceOptions";

export interface ProjectFormValues {
  name: string;
  description?: string;
  knowledgeBaseIds?: string[];
  agentIds?: string[];
  skillIds?: string[];
}

interface ProjectFormModalProps {
  open: boolean;
  submitting?: boolean;
  editingProject?: ProjectSummary | null;
  onCancel: () => void;
  onSubmit: (values: ProjectFormValues) => Promise<void> | void;
}

const toProjectFormValues = (project: ProjectSummary): ProjectFormValues => ({
  name: project.name,
  description: project.description,
  knowledgeBaseIds: project.knowledgeBaseIds,
  agentIds: project.agentIds,
  skillIds: project.skillIds,
});

export const ProjectFormModal = ({
  open,
  submitting = false,
  editingProject = null,
  onCancel,
  onSubmit,
}: ProjectFormModalProps) => {
  const [form] = Form.useForm<ProjectFormValues>();
  const isEditing = editingProject !== null;
  const selectedKnowledgeIds = Form.useWatch("knowledgeBaseIds", form) ?? [];
  const selectedAgentIds = Form.useWatch("agentIds", form) ?? [];
  const selectedSkillIds = Form.useWatch("skillIds", form) ?? [];
  const {
    knowledgeOptionsLoading,
    agentOptionsLoading,
    skillOptionsLoading,
    resolvedKnowledgeOptions,
    resolvedAgentOptions,
    resolvedSkillOptions,
  } = useProjectResourceOptions({
    open,
    selectedKnowledgeIds,
    selectedAgentIds,
    selectedSkillIds,
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    if (editingProject) {
      form.setFieldsValue(toProjectFormValues(editingProject));
      return;
    }

    form.resetFields();
  }, [editingProject, form, open]);

  return (
    <Modal
      title={isEditing ? "编辑项目" : "创建项目"}
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      okText={isEditing ? "保存修改" : "创建项目"}
      cancelText="取消"
      destroyOnHidden
      confirmLoading={submitting}
    >
      <Form<ProjectFormValues>
        form={form}
        layout="vertical"
        onFinish={(values) => void onSubmit(values)}
      >
        <Form.Item
          name="name"
          label="项目名称"
          rules={[{ required: true, whitespace: true, message: "请输入项目名称" }]}
        >
          <Input maxLength={40} placeholder="例如：移动端应用重构" />
        </Form.Item>

        <Form.Item name="description" label="项目说明">
          <Input.TextArea
            maxLength={160}
            showCount
            autoSize={{ minRows: 3, maxRows: 5 }}
            placeholder="补充项目目标、当前阶段或协作重点"
          />
        </Form.Item>

        <Form.Item name="knowledgeBaseIds" label="选择现有知识库">
          <Select
            mode="multiple"
            allowClear
            placeholder="可选"
            loading={knowledgeOptionsLoading}
            options={resolvedKnowledgeOptions}
            notFoundContent={knowledgeOptionsLoading ? "加载中..." : "暂无可选知识库"}
          />
        </Form.Item>

        <Form.Item name="agentIds" label="智能体">
          <Select
            mode="multiple"
            allowClear
            placeholder="可选"
            loading={agentOptionsLoading}
            options={resolvedAgentOptions}
            notFoundContent={agentOptionsLoading ? "加载中..." : "暂无可选智能体"}
          />
        </Form.Item>

        <Form.Item name="skillIds" label="技能">
          <Select
            mode="multiple"
            allowClear
            placeholder="可选"
            loading={skillOptionsLoading}
            options={resolvedSkillOptions}
            notFoundContent={skillOptionsLoading ? "加载中..." : "暂无可选 Skill"}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
