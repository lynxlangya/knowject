import {
  Alert,
  Button,
  Card,
  Empty,
  Spin,
  Tag,
  Typography,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import {
  listSkills,
  type SkillParameterSchemaProperty,
  type SkillStatus,
  type SkillSummaryResponse,
  type SkillType,
} from '@api/skills';
import { extractApiErrorMessage } from '@api/error';

const SKILL_TYPE_META: Record<
  SkillType,
  { label: string; accentClass: string }
> = {
  repository_search: {
    label: '代码搜索',
    accentClass: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  },
  repository_inspection: {
    label: '仓库检查',
    accentClass: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  knowledge_search: {
    label: '知识检索',
    accentClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
};

const SKILL_STATUS_META: Record<
  SkillStatus,
  { label: string; accentClass: string }
> = {
  available: {
    label: '已接服务',
    accentClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  contract_only: {
    label: '契约预留',
    accentClass: 'border-amber-200 bg-amber-50 text-amber-700',
  },
};

const SUMMARY_TILE_CLASS =
  'rounded-[20px] border border-slate-200 bg-slate-50/70 px-4 py-4';
const META_PILL_CLASS =
  'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium';
const NEUTRAL_META_PILL_CLASS = `${META_PILL_CLASS} border-slate-200 bg-slate-50 text-slate-600`;
const PARAMETER_PILL_CLASS =
  'inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] text-slate-600';

const getRequiredParameterNames = (skill: SkillSummaryResponse): string[] => {
  return skill.parametersSchema.required;
};

const getOptionalParameterNames = (skill: SkillSummaryResponse): string[] => {
  return Object.keys(skill.parametersSchema.properties).filter(
    (parameterName) => !skill.parametersSchema.required.includes(parameterName),
  );
};

const formatParameterHint = (
  parameterName: string,
  property: SkillParameterSchemaProperty,
  isRequired: boolean,
): string => {
  const range =
    property.type === 'integer' &&
    property.minimum !== undefined &&
    property.maximum !== undefined
      ? ` (${property.minimum}-${property.maximum})`
      : '';
  const marker = isRequired ? '必填' : '可选';

  return `${parameterName} · ${marker}${range}`;
};

export const SkillsManagementPage = () => {
  const [items, setItems] = useState<SkillSummaryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadSkills = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await listSkills();

        if (cancelled) {
          return;
        }

        setItems(response.items);
      } catch (currentError) {
        if (cancelled) {
          return;
        }

        console.error('[SkillsManagementPage] 加载技能目录失败:', currentError);
        setError(
          extractApiErrorMessage(currentError, '加载技能目录失败，请稍后重试'),
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadSkills();

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const summaryItems = useMemo(() => {
    const availableCount = items.filter((item) => item.status === 'available').length;
    const contractOnlyCount = items.filter(
      (item) => item.status === 'contract_only',
    ).length;

    return [
      {
        label: '内置技能',
        value: `${items.length} 个`,
        hint: '当前只展示服务端注册过的系统内置 Skill。',
      },
      {
        label: '已接服务',
        value: `${availableCount} 个`,
        hint: '已明确对齐现有服务端能力，可被后续 Agent 正式绑定。',
      },
      {
        label: '契约预留',
        value: `${contractOnlyCount} 个`,
        hint: '已冻结 handler 与参数 schema，等待后续 runtime 接线。',
      },
    ];
  }, [items]);

  const handleReload = () => {
    setReloadToken((currentValue) => currentValue + 1);
  };

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <section className="space-y-5">
      <Card
        className="mb-5! rounded-[24px]! border-slate-200! shadow-[0_12px_30px_rgba(15,23,42,0.04)]!"
        styles={{ body: { padding: '22px 22px 20px' } }}
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Typography.Text className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              全局资产管理中心
            </Typography.Text>
            <Typography.Title level={2} className="mb-1! mt-2 text-slate-900!">
              技能
            </Typography.Title>
            <Typography.Paragraph className="mb-0! max-w-2xl text-sm! text-slate-500!">
              全局技能是可跨项目复用的方法资产，用于沉淀成熟工作流和最佳实践，由全局统一治理并按项目接入。
            </Typography.Paragraph>
          </div>
          <div className="flex max-w-md flex-col gap-3 rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <Tag color="blue">系统内置</Tag>
              <Tag color="default">只读目录</Tag>
            </div>
            <Typography.Paragraph className="mb-0! text-sm! text-slate-500!">
              当前阶段仅开放系统内置 Skill 目录，暂不支持新建、导入或编辑自定义 Skill。
            </Typography.Paragraph>
            <div>
              <Button onClick={handleReload}>刷新目录</Button>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {summaryItems.map((item) => (
            <div key={item.label} className={SUMMARY_TILE_CLASS}>
              <Typography.Text className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                {item.label}
              </Typography.Text>
              <Typography.Title level={4} className="mb-0! mt-2 text-slate-800!">
                {item.value}
              </Typography.Title>
              <Typography.Paragraph className="mb-0! mt-2 text-xs! leading-5! text-slate-500!">
                {item.hint}
              </Typography.Paragraph>
            </div>
          ))}
        </div>
      </Card>

      {error ? (
        <Alert
          type="error"
          showIcon
          message={error}
          action={
            <Button size="small" onClick={handleReload}>
              重试
            </Button>
          }
        />
      ) : null}

      {!error && items.length === 0 ? (
        <Card className="mb-5! rounded-[24px]! border-slate-200! shadow-[0_12px_30px_rgba(15,23,42,0.04)]!">
          <Empty
            description="当前还没有可用的系统内置 Skill"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </Card>
      ) : null}

      {!error && items.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {items.map((skill) => {
            const typeMeta = SKILL_TYPE_META[skill.type];
            const statusMeta = SKILL_STATUS_META[skill.status];
            const requiredParameterNames = getRequiredParameterNames(skill);
            const optionalParameterNames = getOptionalParameterNames(skill);

            return (
              <article
                key={skill.id}
                className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.035)]"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Typography.Title level={4} className="mb-0! text-slate-900!">
                        {skill.name}
                      </Typography.Title>
                      <span className={`${META_PILL_CLASS} border-sky-200 bg-sky-50 text-sky-700`}>
                        系统内置
                      </span>
                      <span className={`${META_PILL_CLASS} ${statusMeta.accentClass}`}>
                        {statusMeta.label}
                      </span>
                    </div>
                    <Typography.Paragraph className="mb-0! mt-2 text-sm! leading-6! text-slate-500!">
                      {skill.description}
                    </Typography.Paragraph>
                  </div>
                  <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-500">
                    {skill.id}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span
                    className={`${META_PILL_CLASS} ${typeMeta.accentClass}`}
                  >
                    {typeMeta.label}
                  </span>
                  <span className={NEUTRAL_META_PILL_CLASS}>
                    来源：系统
                  </span>
                  <span className={NEUTRAL_META_PILL_CLASS}>
                    参数：{requiredParameterNames.length} 必填 / {optionalParameterNames.length} 可选
                  </span>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
                  <div className="rounded-[18px] border border-slate-200 bg-slate-50/80 px-4 py-3">
                    <Typography.Text className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      执行标识
                    </Typography.Text>
                    <code className="mt-2 block break-all rounded-xl bg-slate-900 px-3 py-2 text-[13px] leading-6 text-slate-100">
                      {skill.handler}
                    </code>
                  </div>
                  <div className="rounded-[18px] border border-slate-200 bg-slate-50/80 px-4 py-3">
                    <Typography.Text className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      参数契约
                    </Typography.Text>
                    <Typography.Paragraph className="mb-0! mt-2 text-sm! text-slate-500!">
                      {skill.parametersSchema.description}
                    </Typography.Paragraph>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {Object.entries(skill.parametersSchema.properties).map(
                    ([parameterName, property]) => (
                      <span
                        key={`${skill.id}-${parameterName}`}
                        className={PARAMETER_PILL_CLASS}
                      >
                        {formatParameterHint(
                          parameterName,
                          property,
                          requiredParameterNames.includes(parameterName),
                        )}
                      </span>
                    ),
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
};
