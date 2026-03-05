export interface ProjectCreateOption {
  value: string;
  label: string;
}

export const PROJECT_KNOWLEDGE_OPTIONS: ProjectCreateOption[] = [
  { value: 'kb-arch', label: '架构知识库' },
  { value: 'kb-mobile-ui', label: '移动端 UI 规范' },
  { value: 'kb-api', label: 'API 设计规范' },
  { value: 'kb-brand', label: '品牌资产库' },
];

export const PROJECT_MEMBER_OPTIONS: ProjectCreateOption[] = [
  { value: 'member-alex', label: 'Alex Chen' },
  { value: 'member-yuki', label: 'Yuki Zhang' },
  { value: 'member-nina', label: 'Nina Song' },
  { value: 'member-leo', label: 'Leo Zhou' },
  { value: 'member-iris', label: 'Iris Wang' },
  { value: 'member-olivia', label: 'Olivia Gu' },
  { value: 'member-jason', label: 'Jason Fu' },
];

export const PROJECT_AGENT_OPTIONS: ProjectCreateOption[] = [
  { value: 'agent-requirement', label: '需求分析 Agent' },
  { value: 'agent-code-review', label: '代码审查 Agent' },
  { value: 'agent-api-design', label: 'API 设计 Agent' },
  { value: 'agent-copywriter', label: '营销文案 Agent' },
];

export const PROJECT_SKILL_OPTIONS: ProjectCreateOption[] = [
  { value: 'skill-typescript', label: 'TypeScript 工程化' },
  { value: 'skill-routes', label: '路由设计' },
  { value: 'skill-api-contract', label: '接口契约治理' },
  { value: 'skill-brand-story', label: '品牌叙事' },
];
