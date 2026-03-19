export interface EditKnowledgeFormValues {
  name: string;
  description?: string;
}

export interface ProjectResourceSummaryItem {
  label: string;
  value: string;
  hint: string;
}

export type ProjectKnowledgeCardActionKey =
  | "open-global"
  | "unbind"
  | "upload"
  | "edit"
  | "rebuild"
  | "delete";
