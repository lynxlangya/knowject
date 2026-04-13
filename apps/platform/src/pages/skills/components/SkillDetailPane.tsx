import {
  DeleteOutlined,
  MoreOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Dropdown,
  Empty,
  Typography,
  type MenuProps,
} from "antd";
import type { SkillSummaryResponse } from "@api/skills";
import { useTranslation } from "react-i18next";
import {
  GLOBAL_ASSET_CONTENT_CARD_CLASS_NAME,
  GlobalAssetMetaPill,
} from "@pages/assets/components/GlobalAssetLayout";
import { formatGlobalAssetUpdatedAt } from "@pages/assets/components/globalAsset.shared";
import { getStatusBadgeMeta } from "../adapters/skillStatus.adapter";
import { CATEGORY_META } from "../constants/skillsManagement.constants";
import { tp } from "../skills.i18n";

interface SkillDetailPaneProps {
  error: string | null;
  items: SkillSummaryResponse[];
  filteredItems: SkillSummaryResponse[];
  onSkillMenuAction: (skill: SkillSummaryResponse, actionKey: string) => void;
}

const buildStatusActionItems = (
  status: SkillSummaryResponse["status"],
): MenuProps["items"] => {
  if (status === "active") {
    return [
      {
        key: "deprecate",
        label: tp("action.deprecate"),
        icon: <UploadOutlined />,
      },
      {
        key: "archive",
        label: tp("action.archive"),
        icon: <UploadOutlined />,
      },
    ];
  }

  if (status === "deprecated") {
    return [
      {
        key: "activate",
        label: tp("action.activate"),
        icon: <UploadOutlined />,
      },
      {
        key: "archive",
        label: tp("action.archive"),
        icon: <UploadOutlined />,
      },
    ];
  }

  if (status === "archived") {
    return [
      {
        key: "activate",
        label: tp("action.activate"),
        icon: <UploadOutlined />,
      },
      {
        key: "draft",
        label: tp("action.moveToDraft"),
        icon: <UploadOutlined />,
      },
    ];
  }

  return [
    {
      key: "activate",
      label: tp("action.activate"),
      icon: <UploadOutlined />,
    },
    {
      key: "archive",
      label: tp("action.archive"),
      icon: <UploadOutlined />,
    },
  ];
};

const buildSkillActionMenuItems = (
  skill: SkillSummaryResponse,
): MenuProps["items"] => {
  const statusActionItems = buildStatusActionItems(skill.status) ?? [];

  return [
    ...statusActionItems,
    {
      type: "divider",
    },
    {
      key: "delete",
      label: tp("action.delete"),
      icon: <DeleteOutlined />,
      danger: true,
    },
  ];
};

const previewList = (items: string[] | undefined): string[] => {
  return (items ?? [])
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 2);
};

export const SkillDetailPane = ({
  error,
  items,
  filteredItems,
  onSkillMenuAction,
}: SkillDetailPaneProps) => {
  const { t } = useTranslation("pages");

  if (!error && items.length === 0) {
    return (
      <Card className={GLOBAL_ASSET_CONTENT_CARD_CLASS_NAME}>
        <Empty
          description={t("skills.emptyAll")}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  if (!error && items.length > 0 && filteredItems.length === 0) {
    return (
      <Card className={GLOBAL_ASSET_CONTENT_CARD_CLASS_NAME}>
        <Empty
          description={t("skills.emptyFiltered")}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  if (error || filteredItems.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {filteredItems.map((skill) => {
        const statusMeta = getStatusBadgeMeta(skill);
        const categoryMeta = skill.category
          ? CATEGORY_META[skill.category]
          : null;
        const triggerScenarios = previewList(
          skill.definition?.triggerScenarios,
        );
        const outputContract = previewList(skill.definition?.outputContract);

        return (
          <article
            key={skill.id}
            className="group flex h-full flex-col rounded-shell border border-slate-200 bg-white p-5 shadow-card"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <GlobalAssetMetaPill className={statusMeta.accentClass}>
                    {statusMeta.label}
                  </GlobalAssetMetaPill>
                  {categoryMeta ? (
                    <GlobalAssetMetaPill className={categoryMeta.accentClass}>
                      {categoryMeta.label}
                    </GlobalAssetMetaPill>
                  ) : null}
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

              <div className="flex items-center justify-end">
                <Dropdown
                  trigger={["click"]}
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
                    aria-label={t("skills.moreActions", { name: skill.name })}
                  />
                </Dropdown>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-panel border border-slate-200 bg-slate-50/80 px-4 py-3">
                <Typography.Text className="text-caption font-semibold uppercase tracking-[0.14em] text-slate-400">
                  {t("skills.owner")}
                </Typography.Text>
                <Typography.Paragraph className="mb-0! mt-2 text-sm! text-slate-600!">
                  {skill.owner || t("skills.ownerFallback")}
                </Typography.Paragraph>
              </div>

              <div className="rounded-panel border border-slate-200 bg-slate-50/80 px-4 py-3">
                <Typography.Text className="text-caption font-semibold uppercase tracking-[0.14em] text-slate-400">
                  {t("skills.definition.goal.label")}
                </Typography.Text>
                <Typography.Paragraph className="mb-0! mt-2 text-sm! text-slate-600!">
                  {skill.definition?.goal ||
                    t("skills.definition.previewEmpty")}
                </Typography.Paragraph>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-panel border border-slate-200 bg-white px-4 py-3">
                <Typography.Text className="text-caption font-semibold uppercase tracking-[0.14em] text-slate-400">
                  {t("skills.definition.triggerScenarios.label")}
                </Typography.Text>
                <div className="mt-2 space-y-1 text-sm text-slate-600">
                  {triggerScenarios.length > 0 ? (
                    triggerScenarios.map((item) => (
                      <div key={item}>• {item}</div>
                    ))
                  ) : (
                    <div>{t("skills.definition.previewEmpty")}</div>
                  )}
                </div>
              </div>

              <div className="rounded-panel border border-slate-200 bg-white px-4 py-3">
                <Typography.Text className="text-caption font-semibold uppercase tracking-[0.14em] text-slate-400">
                  {t("skills.definition.outputContract.label")}
                </Typography.Text>
                <div className="mt-2 space-y-1 text-sm text-slate-600">
                  {outputContract.length > 0 ? (
                    outputContract.map((item) => <div key={item}>• {item}</div>)
                  ) : (
                    <div>{t("skills.definition.previewEmpty")}</div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-auto pt-5">
              <div className="border-t border-slate-200/80 pt-4 text-xs text-slate-400">
                {t("skills.updatedAt", {
                  value: formatGlobalAssetUpdatedAt(skill.updatedAt),
                })}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
};
