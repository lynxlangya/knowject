import type { FormInstance } from "antd";
import { Form, Input, Modal, Typography } from "antd";
import type { EditKnowledgeFormValues } from "../types/projectResources.types";
import { tp } from "../project.i18n";

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
      title={tp('resources.metadata.title')}
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={submitting}
      destroyOnHidden
    >
      <div className="space-y-4">
        <Typography.Paragraph className="mb-0! text-sm! leading-6! text-slate-500!">
          {tp('resources.metadata.description')}
        </Typography.Paragraph>

        <Form<EditKnowledgeFormValues>
          form={form}
          layout="vertical"
          onFinish={onSubmit}
        >
          <Form.Item
            name="name"
            label={tp('resources.metadata.name')}
            rules={[
              {
                required: true,
                message: tp('resources.metadata.nameRequired'),
              },
            ]}
          >
            <Input maxLength={80} placeholder={tp('resources.metadata.namePlaceholder')} />
          </Form.Item>

          <Form.Item name="description" label={tp('resources.metadata.descriptionLabel')}>
            <Input.TextArea
              autoSize={{ minRows: 4, maxRows: 6 }}
              maxLength={240}
              placeholder={tp('resources.metadata.descriptionPlaceholder')}
            />
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
};
