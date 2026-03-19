import type { SelectProps } from 'antd';
import type { KnowledgeFormValues } from '../types/knowledgeManagement.types';

export const KNOWLEDGE_BATCH_UPLOAD_MESSAGE_KEY = 'knowledge-batch-upload';
export const KNOWLEDGE_PAGE_SUBTITLE = '统一索引全局文档，供技能与智能体复用';

export const KNOWLEDGE_FORM_INITIAL_VALUES: KnowledgeFormValues = {
  name: '',
  description: '',
  sourceType: 'global_docs',
};

export const KNOWLEDGE_SOURCE_TYPE_OPTIONS: SelectProps['options'] = [
  { value: 'global_docs', label: 'global_docs · 全局文档' },
  {
    value: 'global_code',
    label: 'global_code · 全局代码（预留）',
  },
];
