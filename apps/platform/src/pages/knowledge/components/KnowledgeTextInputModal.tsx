import { Button, Form, Input, Modal, Typography } from 'antd';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('pages');
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
      title={t('knowledge.upload.textModalTitle')}
      open={open}
      onCancel={onCancel}
      footer={null}
      width={760}
      destroyOnHidden
      styles={{ body: { paddingTop: 12 } }}
    >
      <div className="space-y-5">
        <Typography.Paragraph className="mb-0! text-sm! leading-6! text-slate-500!">
          {t('knowledge.upload.textModalDescription')}
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
          <Form.Item name="title" label={t('knowledge.upload.textTitleLabel')}>
            <Input maxLength={80} placeholder={t('knowledge.upload.textTitlePlaceholder')} />
          </Form.Item>

          <Form.Item
            name="content"
            label={t('knowledge.upload.textContentLabel')}
            rules={[
              {
                validator: (_, value: string | undefined) => {
                  if (value?.trim()) {
                    return Promise.resolve();
                  }

                  return Promise.reject(new Error(t('knowledge.upload.textContentRequired')));
                },
              },
            ]}
          >
            <Input.TextArea
              autoSize={{ minRows: 12, maxRows: 18 }}
              maxLength={20000}
              placeholder={t('knowledge.upload.textContentPlaceholder')}
            />
          </Form.Item>

          <div className="flex justify-end gap-3">
            <Button onClick={onBack} disabled={submitting}>
              {t('knowledge.upload.back')}
            </Button>
            <Button
              type="primary"
              loading={submitting}
              onClick={() => form.submit()}
            >
              {t('knowledge.upload.save')}
            </Button>
          </div>
        </Form>
      </div>
    </Modal>
  );
};
