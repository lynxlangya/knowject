import type {
  GlobalAssetItem,
  GlobalCatalogOption,
  MemberProfile,
  ProjectResourceFocus,
} from './project.types';

const createInitialAvatarDataUrl = (
  name: string,
  backgroundColor: string,
  foregroundColor = '#f8fafc',
) => {
  const initials = name
    .split(' ')
    .map((segment) => segment.trim().charAt(0).toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join('');
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80" role="img" aria-label="${name}">
      <rect width="80" height="80" rx="20" fill="${backgroundColor}" />
      <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" fill="${foregroundColor}" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="700">${initials}</text>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const AVATAR_ALEX = createInitialAvatarDataUrl('Alex Chen', '#0f766e');
const AVATAR_YUKI = createInitialAvatarDataUrl('Yuki Zhang', '#7c3aed');
const AVATAR_NINA = createInitialAvatarDataUrl('Nina Song', '#c2410c');
const AVATAR_LEO = createInitialAvatarDataUrl('Leo Zhou', '#1d4ed8');
const AVATAR_IRIS = createInitialAvatarDataUrl('Iris Wang', '#be185d');
const AVATAR_OLIVIA = createInitialAvatarDataUrl('Olivia Gu', '#047857');
const AVATAR_JASON = createInitialAvatarDataUrl('Jason Fu', '#b45309');

const KNOWLEDGE_ASSETS: GlobalAssetItem[] = [
  {
    id: 'kb-arch',
    type: 'knowledge',
    name: '架构知识库',
    description: '沉淀架构约束、模块边界和关键设计决策。',
    updatedAt: '今天',
    owner: '平台团队',
    usageCount: 12,
  },
  {
    id: 'kb-mobile-ui',
    type: 'knowledge',
    name: '移动端 UI 规范',
    description: '汇总移动端设计规范、交互约束和组件基线。',
    updatedAt: '昨天',
    owner: '设计系统组',
    usageCount: 8,
  },
  {
    id: 'kb-api',
    type: 'knowledge',
    name: 'API 设计规范',
    description: '统一接口命名、错误码约定和契约演进方式。',
    updatedAt: '2天前',
    owner: '后端平台组',
    usageCount: 10,
  },
  {
    id: 'kb-brand',
    type: 'knowledge',
    name: '品牌资产库',
    description: '维护品牌文案、视觉元素和对外表达规范。',
    updatedAt: '本周',
    owner: '品牌市场组',
    usageCount: 6,
  },
];

const AGENT_ASSETS: GlobalAssetItem[] = [
  {
    id: 'agent-requirement',
    type: 'agents',
    name: '需求分析 Agent',
    description: '聚焦需求拆解、验收标准和风险识别。',
    updatedAt: '今天',
    owner: '产品团队',
    usageCount: 9,
  },
  {
    id: 'agent-code-review',
    type: 'agents',
    name: '代码审查 Agent',
    description: '关注回归风险、测试缺口和可维护性问题。',
    updatedAt: '昨天',
    owner: '工程效率组',
    usageCount: 11,
  },
  {
    id: 'agent-api-design',
    type: 'agents',
    name: 'API 设计 Agent',
    description: '协助接口建模、契约审阅和网关一致性设计。',
    updatedAt: '3天前',
    owner: '后端平台组',
    usageCount: 7,
  },
  {
    id: 'agent-copywriter',
    type: 'agents',
    name: '营销文案 Agent',
    description: '用于品牌表达、营销页面文案和转化内容打磨。',
    updatedAt: '本周',
    owner: '市场团队',
    usageCount: 4,
  },
];

const SKILL_ASSETS: GlobalAssetItem[] = [
  {
    id: 'skill-typescript',
    type: 'skills',
    name: 'TypeScript 工程化',
    description: '涵盖类型安全、模块边界和工程治理实践。',
    updatedAt: '今天',
    owner: '前端基础组',
    usageCount: 13,
  },
  {
    id: 'skill-routes',
    type: 'skills',
    name: '路由设计',
    description: '规范路由信息架构、重定向和兼容策略。',
    updatedAt: '昨天',
    owner: '平台团队',
    usageCount: 9,
  },
  {
    id: 'skill-api-contract',
    type: 'skills',
    name: '接口契约治理',
    description: '强调接口字段稳定性、版本约束和联调协作。',
    updatedAt: '2天前',
    owner: '后端平台组',
    usageCount: 8,
  },
  {
    id: 'skill-brand-story',
    type: 'skills',
    name: '品牌叙事',
    description: '用于梳理价值表达、产品定位和品牌故事。',
    updatedAt: '本周',
    owner: '品牌市场组',
    usageCount: 5,
  },
];

const TEAM_MEMBERS: MemberProfile[] = [
  {
    id: 'member-alex',
    name: 'Alex Chen',
    avatarUrl: AVATAR_ALEX,
  },
  {
    id: 'member-yuki',
    name: 'Yuki Zhang',
    avatarUrl: AVATAR_YUKI,
  },
  {
    id: 'member-nina',
    name: 'Nina Song',
    avatarUrl: AVATAR_NINA,
  },
  {
    id: 'member-leo',
    name: 'Leo Zhou',
    avatarUrl: AVATAR_LEO,
  },
  {
    id: 'member-iris',
    name: 'Iris Wang',
    avatarUrl: AVATAR_IRIS,
  },
  {
    id: 'member-olivia',
    name: 'Olivia Gu',
    avatarUrl: AVATAR_OLIVIA,
  },
  {
    id: 'member-jason',
    name: 'Jason Fu',
    avatarUrl: AVATAR_JASON,
  },
];

const CATALOG_BY_TYPE: Record<ProjectResourceFocus, GlobalAssetItem[]> = {
  knowledge: KNOWLEDGE_ASSETS,
  skills: SKILL_ASSETS,
  agents: AGENT_ASSETS,
};

const toOption = (item: { id: string; name: string }): GlobalCatalogOption => {
  return {
    value: item.id,
    label: item.name,
  };
};

export const GLOBAL_ASSET_TITLES: Record<ProjectResourceFocus, string> = {
  knowledge: '知识库',
  skills: '技能',
  agents: '智能体',
};

export const GLOBAL_KNOWLEDGE_OPTIONS = KNOWLEDGE_ASSETS.map(toOption);
export const GLOBAL_SKILL_OPTIONS = SKILL_ASSETS.map(toOption);
export const GLOBAL_AGENT_OPTIONS = AGENT_ASSETS.map(toOption);
export const GLOBAL_MEMBER_OPTIONS = TEAM_MEMBERS.map((member) => ({
  value: member.id,
  label: member.name,
}));

export const getGlobalAssetsByType = (type: ProjectResourceFocus): GlobalAssetItem[] => {
  return CATALOG_BY_TYPE[type];
};

export const getGlobalAssetById = (
  type: ProjectResourceFocus,
  id: string,
): GlobalAssetItem | null => {
  return getGlobalAssetsByType(type).find((item) => item.id === id) ?? null;
};

export const getAllGlobalAssets = (): GlobalAssetItem[] => {
  return [...KNOWLEDGE_ASSETS, ...SKILL_ASSETS, ...AGENT_ASSETS];
};

export const getCatalogMembers = (): MemberProfile[] => {
  return TEAM_MEMBERS;
};
