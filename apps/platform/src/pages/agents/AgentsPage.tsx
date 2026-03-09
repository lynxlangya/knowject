import { GlobalAssetManagementPage } from '../assets/GlobalAssetManagementPage';

export const AgentsPage = () => {
  return (
    <GlobalAssetManagementPage
      title="智能体"
      assetType="agents"
      description="全局智能体负责封装可复用的角色、提示词和协作流程，项目内仅做绑定和执行编排，不直接修改全局定义。"
    />
  );
};
