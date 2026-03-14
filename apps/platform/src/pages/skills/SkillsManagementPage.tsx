import { ReloadOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Empty,
  Popover,
  Spin,
  Tooltip,
  Typography,
} from 'antd';
import { useEffect, useState } from 'react';
import {
  listSkills,
  type SkillParameterSchemaProperty,
  type SkillStatus,
  type SkillSummaryResponse,
} from '@api/skills';
import { extractApiErrorMessage } from '@api/error';

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

const META_PILL_CLASS =
  'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium';
const PARAMETER_PILL_CLASS =
  'inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] text-slate-600';
const SKILLS_PAGE_SUBTITLE = '系统方法资产可复用，项目内按需绑定';

const getRequiredParameterNames = (skill: SkillSummaryResponse): string[] => {
  return skill.parametersSchema.required;
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
            <Typography.Title level={2} className="mb-1! text-slate-900!">
              技能
            </Typography.Title>
            <Typography.Paragraph className="mb-0! mt-2 text-sm! text-slate-500!">
              {SKILLS_PAGE_SUBTITLE}
            </Typography.Paragraph>
          </div>
          <div className="flex items-center gap-3">
            <Typography.Text className="text-xs text-slate-400">
              当前为系统内置 Skill，只读
            </Typography.Text>
            <Tooltip title="刷新目录">
              <Button
                aria-label="刷新目录"
                shape="circle"
                icon={<ReloadOutlined />}
                onClick={handleReload}
              />
            </Tooltip>
          </div>
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
            const statusMeta = SKILL_STATUS_META[skill.status];
            const requiredParameterNames = getRequiredParameterNames(skill);
            const parameterEntries = Object.entries(skill.parametersSchema.properties);

            return (
              <article
                key={skill.id}
                className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.035)]"
              >
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

                <Typography.Paragraph
                  className="mb-0! mt-3 text-sm! leading-6! text-slate-500!"
                  ellipsis={{ rows: 2, tooltip: skill.description }}
                >
                  {skill.description}
                </Typography.Paragraph>

                <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
                  <Typography.Text className="text-slate-400">
                    Handler
                  </Typography.Text>
                  <code className="break-all text-[12px] text-slate-500">
                    {skill.handler}
                  </code>
                  <Popover
                    trigger="hover"
                    content={
                      <div className="max-w-72 space-y-3">
                        {skill.parametersSchema.description ? (
                          <Typography.Paragraph className="mb-0! text-sm! text-slate-500!">
                            {skill.parametersSchema.description}
                          </Typography.Paragraph>
                        ) : null}
                        {parameterEntries.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {parameterEntries.map(([parameterName, property]) => (
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
                            ))}
                          </div>
                        ) : (
                          <Typography.Text className="text-sm text-slate-500">
                            当前没有额外参数。
                          </Typography.Text>
                        )}
                      </div>
                    }
                  >
                    <button
                      type="button"
                      className="cursor-pointer border-0 bg-transparent p-0 text-xs text-slate-400 transition hover:text-slate-600"
                    >
                      参数详情
                    </button>
                  </Popover>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
};
