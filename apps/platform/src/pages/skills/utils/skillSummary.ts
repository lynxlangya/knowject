import type { SkillSummaryResponse } from '@api/skills';
import type { GlobalAssetSummaryItem } from '@pages/assets/components/GlobalAssetLayout';
import { createGlobalAssetSummaryItem } from '@pages/assets/components/globalAsset.shared';

export const buildSkillSummaryItems = (
  items: SkillSummaryResponse[],
): GlobalAssetSummaryItem[] => {
  const publishedCount = items.filter(
    (item) => item.lifecycleStatus === 'published',
  ).length;
  const draftCount = items.length - publishedCount;
  const availableCount = items.filter(
    (item) => item.runtimeStatus === 'available',
  ).length;
  const contractOnlyCount = items.length - availableCount;
  const importedCount = items.filter((item) => item.source === 'imported').length;

  return [
    createGlobalAssetSummaryItem(
      '技能总数',
      `${items.length} 个`,
      '当前纳入目录治理的 Skill 资产。',
    ),
    createGlobalAssetSummaryItem(
      '已发布',
      `${publishedCount} 个`,
      draftCount === 0
        ? '当前没有待整理的草稿。'
        : `${draftCount} 个仍处于草稿阶段。`,
    ),
    createGlobalAssetSummaryItem(
      '已接服务',
      `${availableCount} 个`,
      contractOnlyCount === 0
        ? '当前全部 Skill 都已接入运行时。'
        : `${contractOnlyCount} 个仍是契约预留。`,
    ),
    createGlobalAssetSummaryItem(
      '公网导入',
      `${importedCount} 个`,
      '来自 GitHub 或 URL 的外部 Skill。',
    ),
  ];
};
