import {
  GlobalAssetSidebar,
  GlobalAssetSidebarFilterItem,
  GlobalAssetSidebarSection,
} from '@pages/assets/components/GlobalAssetLayout';
import type {
  SkillFilterGroup,
  SkillSidebarFilter,
} from '../types/skillsManagement.types';

interface SkillsSidebarProps {
  filterGroups: SkillFilterGroup[];
  selectedFilter: SkillSidebarFilter;
  onFilterChange: (filter: SkillSidebarFilter) => void;
}

export const SkillsSidebar = ({
  filterGroups,
  selectedFilter,
  onFilterChange,
}: SkillsSidebarProps) => {
  return (
    <GlobalAssetSidebar>
      <GlobalAssetSidebarSection>
        {filterGroups.map((group) => (
          <GlobalAssetSidebarFilterItem
            key={group.key}
            active={selectedFilter === group.key}
            label={group.label}
            count={group.count}
            onClick={() => {
              onFilterChange(group.key);
            }}
          />
        ))}
      </GlobalAssetSidebarSection>
    </GlobalAssetSidebar>
  );
};
