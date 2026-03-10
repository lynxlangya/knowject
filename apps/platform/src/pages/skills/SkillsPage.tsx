import { GlobalAssetManagementPage } from '@pages/assets/GlobalAssetManagementPage';

export const SkillsPage = () => {
  return (
    <GlobalAssetManagementPage
      title="技能"
      assetType="skills"
      description="全局技能是可跨项目复用的方法资产，用于沉淀成熟工作流和最佳实践，由全局统一治理并按项目接入。"
    />
  );
};
