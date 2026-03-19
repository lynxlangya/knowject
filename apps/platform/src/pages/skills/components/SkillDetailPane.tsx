import { DeleteOutlined, EditOutlined, MoreOutlined, UploadOutlined } from '@ant-design/icons';
import { Button, Card, Dropdown, Empty, Tag, Typography, type MenuProps } from 'antd';
import type { SkillSummaryResponse } from '@api/skills';
import {
  GLOBAL_ASSET_CONTENT_CARD_CLASS_NAME,
  GlobalAssetMetaPill,
} from '@pages/assets/components/GlobalAssetLayout';
import { formatGlobalAssetUpdatedAt } from '@pages/assets/components/globalAsset.shared';
import { getStatusBadgeMeta } from '../adapters/skillStatus.adapter';
import { SOURCE_META } from '../constants/skillsManagement.constants';

interface SkillDetailPaneProps {
  error: string | null;
  items: SkillSummaryResponse[];
  filteredItems: SkillSummaryResponse[];
  onSkillMenuAction: (skill: SkillSummaryResponse, actionKey: string) => void;
}

const buildSkillActionMenuItems = (
  skill: SkillSummaryResponse,
): MenuProps['items'] => {
  if (skill.source === 'system') {
    return [
      {
        key: 'readonly',
        label: '系统内置 Skill，仅支持查看',
        icon: <EditOutlined />,
        disabled: true,
      },
    ];
  }

  const items: NonNullable<MenuProps['items']> = [
    {
      key: 'edit',
      label: '编辑',
      icon: <EditOutlined />,
    },
  ];

  if (skill.lifecycleStatus === 'draft') {
    items.push({
      key: 'publish',
      label: '发布',
      icon: <UploadOutlined />,
    });
  }

  items.push(
    {
      type: 'divider',
    },
    {
      key: 'delete',
      label: '删除',
      icon: <DeleteOutlined />,
      danger: true,
    },
  );

  return items;
};

export const SkillDetailPane = ({
  error,
  items,
  filteredItems,
  onSkillMenuAction,
}: SkillDetailPaneProps) => {
  if (!error && items.length === 0) {
    return (
      <Card className={GLOBAL_ASSET_CONTENT_CARD_CLASS_NAME}>
        <Empty
          description="当前还没有 Skill，先新建一个方法资产吧。"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  if (!error && items.length > 0 && filteredItems.length === 0) {
    return (
      <Card className={GLOBAL_ASSET_CONTENT_CARD_CLASS_NAME}>
        <Empty description="当前分组下暂无 Skill" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </Card>
    );
  }

  if (error || filteredItems.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {filteredItems.map((skill) => {
        const sourceMeta = SOURCE_META[skill.source];
        const statusMeta = getStatusBadgeMeta(skill);

        return (
          <article
            key={skill.id}
            className={`group flex h-full flex-col rounded-shell border border-slate-200 bg-linear-to-br ${sourceMeta.cardTintClass} p-5 shadow-card`}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <GlobalAssetMetaPill className={sourceMeta.accentClass}>
                    {sourceMeta.label}
                  </GlobalAssetMetaPill>
                  <GlobalAssetMetaPill className={statusMeta.accentClass}>
                    {statusMeta.label}
                  </GlobalAssetMetaPill>
                </div>

                <div className="space-y-3">
                  <Typography.Title level={4} className="mb-0! text-slate-900!">
                    {skill.name}
                  </Typography.Title>
                  <Typography.Paragraph
                    className="mb-0! min-h-12 text-sm! leading-6! text-slate-600!"
                    ellipsis={{ rows: 2, tooltip: skill.description }}
                  >
                    {skill.description}
                  </Typography.Paragraph>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                {skill.source === 'system' ? (
                  <Tag color="default" className="mr-0 rounded-full px-3 py-1">
                    只读
                  </Tag>
                ) : null}

                <Dropdown
                  trigger={['click']}
                  placement="bottomRight"
                  menu={{
                    items: buildSkillActionMenuItems(skill),
                    onClick: ({ key }) => onSkillMenuAction(skill, String(key)),
                  }}
                  destroyOnHidden
                >
                  <Button
                    type="text"
                    size="small"
                    icon={<MoreOutlined />}
                    aria-label={`更多操作：${skill.name}`}
                  />
                </Dropdown>
              </div>
            </div>

            <div className="mt-auto pt-5">
              <div className="border-t border-slate-200/80 pt-4 text-xs text-slate-400">
                更新于 {formatGlobalAssetUpdatedAt(skill.updatedAt)}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
};
