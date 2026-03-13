import { Button, Form, Input, Modal, Typography } from 'antd';
import { useEffect } from 'react';

export interface KnowledgeTextInputValues {
  title?: string;
  content: string;
}

interface KnowledgeTextInputModalProps {
  open: boolean;
  submitting: boolean;
  onBack: () => void;
  onCancel: () => void;
  onSubmit: (values: KnowledgeTextInputValues) => void | Promise<void>;
}

export const KnowledgeTextInputModal = ({
  open,
  submitting,
  onBack,
  onCancel,
  onSubmit,
}: KnowledgeTextInputModalProps) => {
  const [form] = Form.useForm<KnowledgeTextInputValues>();

  useEffect(() => {
    if (!open) {
      return;
    }

    form.setFieldsValue({
      title: '',
      content: '',
    });
  }, [form, open]);

  return (
    <Modal
      title="添加文本来源"
      open={open}
      onCancel={onCancel}
      footer={null}
      width={760}
      destroyOnHidden
      styles={{ body: { paddingTop: 12 } }}
    >
      <div className="space-y-5">
        <Typography.Paragraph className="mb-0! text-sm! leading-6! text-slate-500!">
          粘贴或输入文本，将它保存到当前知识库文件中。
        </Typography.Paragraph>

        <Form<KnowledgeTextInputValues>
          form={form}
          layout="vertical"
          initialValues={{
            title: '',
            content: '',
          }}
          onFinish={(values) => void onSubmit(values)}
        >
          <Form.Item name="title" label="标题（选填）">
            <Input maxLength={80} placeholder="例如：团队入职说明" />
          </Form.Item>

          <Form.Item
            name="content"
            label="文本内容"
            rules={[
              {
                validator: (_, value: string | undefined) => {
                  if (value?.trim()) {
                    return Promise.resolve();
                  }

                  return Promise.reject(new Error('请输入文本内容'));
                },
              },
            ]}
          >
            <Input.TextArea
              autoSize={{ minRows: 12, maxRows: 18 }}
              maxLength={20000}
              placeholder="在这里粘贴或输入要写入知识库的内容"
            />
          </Form.Item>

          <div className="flex justify-end gap-3">
            <Button onClick={onBack} disabled={submitting}>
              返回
            </Button>
            <Button
              type="primary"
              loading={submitting}
              onClick={() => form.submit()}
            >
              保存
            </Button>
          </div>
        </Form>
      </div>
    </Modal>
  );
};
