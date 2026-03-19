import type { FormInstance } from "antd";
import { Form, Input, Modal, Typography } from "antd";
import type { EditKnowledgeFormValues } from "../types/projectResources.types";

interface ProjectKnowledgeMetadataModalProps {
  open: boolean;
  form: FormInstance<EditKnowledgeFormValues>;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (values: EditKnowledgeFormValues) => void;
}

export const ProjectKnowledgeMetadataModal = ({
  open,
  form,
  submitting,
  onCancel,
  onSubmit,
}: ProjectKnowledgeMetadataModalProps) => {
  return (
    <Modal
      title="编辑项目知识库"
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={submitting}
      destroyOnHidden
    >
      <div className="space-y-4">
        <Typography.Paragraph className="mb-0! text-sm! leading-6! text-slate-500!">
          修改当前项目私有知识库的名称和描述，不会影响全局知识资产。
        </Typography.Paragraph>

        <Form<EditKnowledgeFormValues>
          form={form}
          layout="vertical"
          onFinish={onSubmit}
        >
          <Form.Item
            name="name"
            label="知识库名称"
            rules={[
              {
                required: true,
                message: "请输入知识库名称",
              },
            ]}
          >
            <Input maxLength={80} placeholder="例如：项目执行手册" />
          </Form.Item>

          <Form.Item name="description" label="描述">
            <Input.TextArea
              autoSize={{ minRows: 4, maxRows: 6 }}
              maxLength={240}
              placeholder="描述这份项目私有知识的内容边界、维护职责和使用场景。"
            />
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
};
