import {
  CloudUploadOutlined,
  FileTextOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import { Modal, Typography } from 'antd';
import type { DragEvent, KeyboardEvent } from 'react';
import { useRef, useState } from 'react';
import { KNOWLEDGE_UPLOAD_MAX_FILES } from '../knowledgeUpload.shared';

interface KnowledgeSourcePickerModalProps {
  open: boolean;
  onCancel: () => void;
  onUploadClick: () => void;
  onTextInputClick: () => void;
  onDropFiles: (files: File[]) => void;
}

interface SourceActionCardProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
}

const SourceActionCard = ({
  icon,
  label,
  description,
  onClick,
}: SourceActionCardProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-30 items-center gap-4 rounded-[24px] border border-slate-200 bg-slate-50/90 px-5 py-4 text-left transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-[0_16px_32px_rgba(15,23,42,0.08)]"
    >
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] border border-slate-200 bg-white text-[22px] text-slate-600 transition group-hover:border-emerald-200 group-hover:text-emerald-600">
        {icon}
      </span>

      <span className="min-w-0">
        <Typography.Text className="block text-base font-semibold text-slate-800!">
          {label}
        </Typography.Text>
        <Typography.Text className="mt-1 block text-sm text-slate-500!">
          {description}
        </Typography.Text>
      </span>
    </button>
  );
};

export const KnowledgeSourcePickerModal = ({
  open,
  onCancel,
  onUploadClick,
  onTextInputClick,
  onDropFiles,
}: KnowledgeSourcePickerModalProps) => {
  const dragDepthRef = useRef(0);
  const [dragActive, setDragActive] = useState(false);

  const resetDragState = () => {
    dragDepthRef.current = 0;
    setDragActive(false);
  };

  const handleDragEnter = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current += 1;
    setDragActive(true);
  };

  const handleDragOver = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!dragActive) {
      setDragActive(true);
    }
  };

  const handleDragLeave = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);

    if (dragDepthRef.current === 0) {
      setDragActive(false);
    }
  };

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const files = Array.from(event.dataTransfer.files ?? []);
    resetDragState();
    onDropFiles(files);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    onUploadClick();
  };

  const handleCancel = () => {
    resetDragState();
    onCancel();
  };

  return (
    <Modal
      title="添加来源"
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={760}
      destroyOnHidden
      styles={{ body: { paddingTop: 12 } }}
    >
      <div className="space-y-8 pt-1">
        <button
          type="button"
          onClick={onUploadClick}
          onKeyDown={handleKeyDown}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`group relative flex min-h-86 w-full flex-col items-center justify-center overflow-hidden rounded-[30px] border border-dashed px-6 py-8 text-center transition ${
            dragActive
              ? 'border-emerald-400 bg-emerald-50/90 shadow-[0_22px_44px_rgba(16,185,129,0.14)]'
              : 'border-slate-300 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(241,245,249,0.92))] hover:border-slate-400 hover:bg-white hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]'
          }`}
        >
          <div className="absolute inset-x-8 top-5 h-px bg-[linear-gradient(90deg,rgba(148,163,184,0),rgba(148,163,184,0.42),rgba(148,163,184,0))]" />
          <div
            className={`flex h-18 w-18 items-center justify-center rounded-[24px] border text-[32px] transition ${
              dragActive
                ? 'border-emerald-300 bg-white text-emerald-600 shadow-[0_14px_30px_rgba(16,185,129,0.16)]'
                : 'border-slate-200 bg-white/90 text-slate-500'
            }`}
          >
            <InboxOutlined />
          </div>

          <Typography.Title level={4} className="mb-0! mt-6 text-slate-800!">
            将文档拖到这里
          </Typography.Title>
          <Typography.Paragraph className="mb-0! mt-3 max-w-lg text-sm! leading-6! text-slate-500!">
            支持 .md、.txt，单个文件不超过 50 MB；单次最多 {KNOWLEDGE_UPLOAD_MAX_FILES}{' '}
            个文件；20 MB 以上建议拆分上传
          </Typography.Paragraph>
        </button>

        <div className="grid gap-3 pt-2 sm:grid-cols-2">
          <SourceActionCard
            icon={<CloudUploadOutlined />}
            label="上传文件"
            description={`从本地选择文档，单次最多 ${KNOWLEDGE_UPLOAD_MAX_FILES} 个，系统会按队列逐个上传。`}
            onClick={onUploadClick}
          />
          <SourceActionCard
            icon={<FileTextOutlined />}
            label="文本录入"
            description="直接粘贴或输入文字，保存后自动生成文本文件。"
            onClick={onTextInputClick}
          />
        </div>
      </div>
    </Modal>
  );
};
