import type { SelectProps } from 'antd';
import { tp } from '../knowledge.i18n';
import type { KnowledgeFormValues } from '../types/knowledgeManagement.types';

export const KNOWLEDGE_BATCH_UPLOAD_MESSAGE_KEY = 'knowledge-batch-upload';
export const KNOWLEDGE_PAGE_SUBTITLE = tp('subtitle');

export const KNOWLEDGE_FORM_INITIAL_VALUES: KnowledgeFormValues = {
  name: '',
  description: '',
  sourceType: 'global_docs',
};

export const KNOWLEDGE_SOURCE_TYPE_OPTIONS: SelectProps['options'] = [
  { value: 'global_docs', label: tp('sourceType.global_docs') },
  {
    value: 'global_code',
    label: tp('sourceType.global_code'),
  },
];
