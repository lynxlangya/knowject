import type { SkillSummaryResponse } from '@api/skills';
import type { GlobalAssetSummaryItem } from '@pages/assets/components/GlobalAssetLayout';
import { createGlobalAssetSummaryItem } from '@pages/assets/components/globalAsset.shared';
import { tp } from '../skills.i18n';

export const buildSkillSummaryItems = (
  items: SkillSummaryResponse[],
): GlobalAssetSummaryItem[] => {
  const activeCount = items.filter(
    (item) => item.status === 'active',
  ).length;
  const draftCount = items.filter((item) => item.status === 'draft').length;
  const presetCount = items.filter((item) => item.source === 'preset').length;
  const teamCount = items.filter((item) => item.source === 'team').length;

  return [
    createGlobalAssetSummaryItem(
      tp('summary.total'),
      tp('summary.totalValue', { count: items.length }),
      tp('summary.totalHint'),
    ),
    createGlobalAssetSummaryItem(
      tp('summary.active'),
      tp('summary.activeValue', { count: activeCount }),
      draftCount === 0
        ? tp('summary.activeHintNone')
        : tp('summary.activeHintDrafts', { count: draftCount }),
    ),
    createGlobalAssetSummaryItem(
      tp('summary.preset'),
      tp('summary.presetValue', { count: presetCount }),
      tp('summary.presetHint'),
    ),
    createGlobalAssetSummaryItem(
      tp('summary.team'),
      tp('summary.teamValue', { count: teamCount }),
      tp('summary.teamHint'),
    ),
  ];
};
