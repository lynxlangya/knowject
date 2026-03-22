import type { SkillSummaryResponse } from '@api/skills';
import type { GlobalAssetSummaryItem } from '@pages/assets/components/GlobalAssetLayout';
import { createGlobalAssetSummaryItem } from '@pages/assets/components/globalAsset.shared';
import { tp } from '../skills.i18n';

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
      tp('summary.total'),
      tp('summary.totalValue', { count: items.length }),
      tp('summary.totalHint'),
    ),
    createGlobalAssetSummaryItem(
      tp('summary.published'),
      tp('summary.publishedValue', { count: publishedCount }),
      draftCount === 0
        ? tp('summary.publishedHintNone')
        : tp('summary.publishedHintDrafts', { count: draftCount }),
    ),
    createGlobalAssetSummaryItem(
      tp('summary.available'),
      tp('summary.availableValue', { count: availableCount }),
      contractOnlyCount === 0
        ? tp('summary.availableHintAll')
        : tp('summary.availableHintPending', { count: contractOnlyCount }),
    ),
    createGlobalAssetSummaryItem(
      tp('summary.imported'),
      tp('summary.importedValue', { count: importedCount }),
      tp('summary.importedHint'),
    ),
  ];
};
