import { App, Button, Card, Empty, Pagination, Spin, Typography } from 'antd';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { extractApiErrorMessage } from '@api/error';
import { getMembersOverview, type MemberOverviewResponseItem } from '@api/members';
import { getAuthUser } from '@app/auth/user';
import { useProjectContext } from '@app/project/useProjectContext';
import { MemberDetailPanel } from './components/MemberDetailPanel';
import { MemberDirectoryList } from './components/MemberDirectoryList';
import { MemberFiltersBar } from './components/MemberFiltersBar';
import { SubtleScrollArea } from './components/SubtleScrollArea';
import {
  buildMemberViewModels,
  filterMemberViewModels,
} from './members.helpers';
import type { MemberFiltersState } from './members.types';

const DEFAULT_FILTERS: MemberFiltersState = {
  query: '',
  status: 'all',
  adminScope: 'all',
  projectId: 'all',
  sortBy: 'activity',
};

const MEMBER_PAGE_SIZE = 30;
const MEMBERS_SECTION_GAP = 16;
const MEMBERS_CONTENT_BREATHING_ROOM = 12;

export const MembersPage = () => {
  const { message } = App.useApp();
  const authUser = getAuthUser();
  const { projects } = useProjectContext();
  const sectionRef = useRef<HTMLElement | null>(null);
  const filtersRef = useRef<HTMLDivElement | null>(null);
  const [filters, setFilters] = useState<MemberFiltersState>(DEFAULT_FILTERS);
  const [items, setItems] = useState<MemberOverviewResponseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [contentAreaHeight, setContentAreaHeight] = useState<number | null>(null);

  useEffect(() => {
    const loadMembers = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await getMembersOverview();
        setItems(result.items);
      } catch (currentError) {
        console.error('[MembersPage] 加载成员概览失败:', currentError);
        setError(
          extractApiErrorMessage(currentError, '加载成员概览失败，请稍后重试'),
        );
      } finally {
        setLoading(false);
      }
    };

    void loadMembers();
  }, []);

  const members = useMemo(() => {
    return buildMemberViewModels({
      items,
      projects,
      currentUserId: authUser?.id ?? null,
    });
  }, [authUser?.id, items, projects]);

  const filteredMembers = useMemo(() => {
    return filterMemberViewModels(members, filters);
  }, [filters, members]);

  useEffect(() => {
    const totalPages = Math.max(
      1,
      Math.ceil(filteredMembers.length / MEMBER_PAGE_SIZE),
    );

    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, filteredMembers.length]);

  const pagedMembers = useMemo(() => {
    const startIndex = (currentPage - 1) * MEMBER_PAGE_SIZE;
    return filteredMembers.slice(startIndex, startIndex + MEMBER_PAGE_SIZE);
  }, [currentPage, filteredMembers]);

  useEffect(() => {
    if (pagedMembers.length === 0) {
      setActiveMemberId(null);
      return;
    }

    const hasActiveMember = pagedMembers.some(
      (member) => member.id === activeMemberId,
    );

    if (!hasActiveMember) {
      setActiveMemberId(pagedMembers[0]?.id ?? null);
    }
  }, [activeMemberId, pagedMembers]);

  const activeMember =
    pagedMembers.find((member) => member.id === activeMemberId) ?? null;

  const summaryItems = useMemo(() => {
    const crossProjectCount = members.filter(
      (member) => member.visibleProjectCount > 1,
    ).length;
    const adminCount = members.filter(
      (member) => member.adminProjectCount > 0,
    ).length;
    const blockedCount = members.filter(
      (member) => member.blockedProjectCount > 0,
    ).length;

    return [
      {
        label: '协作成员',
        value: `${members.length} 位`,
        hint: '基于当前账号可见项目聚合出的协作成员。',
      },
      {
        label: '跨项目协作',
        value: `${crossProjectCount} 位`,
        hint: '同时参与两个及以上可见项目的成员。',
      },
      {
        label: '项目管理员',
        value: `${adminCount} 位`,
        hint: '在至少一个可见项目中拥有 admin 权限。',
      },
      {
        label: '存在阻塞',
        value: `${blockedCount} 位`,
        hint: '当前协作快照中存在 blocked 状态的成员。',
      },
    ];
  }, [members]);

  const handleFilterChange = (patch: Partial<MemberFiltersState>) => {
    setCurrentPage(1);
    setFilters((currentFilters) => ({
      ...currentFilters,
      ...patch,
    }));
  };

  useLayoutEffect(() => {
    if (loading || !!error) return;

    const sectionElement = sectionRef.current;
    const filtersElement = filtersRef.current;
    const scrollContainer = sectionElement?.parentElement;

    if (!sectionElement || !filtersElement || !scrollContainer) {
      return;
    }

    const updateContentAreaHeight = () => {
      const computedStyle = window.getComputedStyle(scrollContainer);
      const paddingTop = Number.parseFloat(computedStyle.paddingTop) || 0;
      const paddingBottom = Number.parseFloat(computedStyle.paddingBottom) || 0;
      const viewportHeight =
        scrollContainer.clientHeight - paddingTop - paddingBottom;
      const filtersHeight = filtersElement.getBoundingClientRect().height;
      const nextHeight = Math.max(
        360,
        viewportHeight -
          filtersHeight -
          MEMBERS_SECTION_GAP -
          MEMBERS_CONTENT_BREATHING_ROOM,
      );

      setContentAreaHeight(nextHeight);
    };

    updateContentAreaHeight();

    const resizeObserver = new ResizeObserver(() => {
      updateContentAreaHeight();
    });

    resizeObserver.observe(scrollContainer);
    resizeObserver.observe(filtersElement);

    window.addEventListener('resize', updateContentAreaHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateContentAreaHeight);
    };
  }, [loading, error]);

  if (loading) {
    return (
      <div className="flex min-h-105 items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="rounded-3xl! border-slate-200! shadow-[0_8px_24px_rgba(15,23,42,0.035)]!">
        <Typography.Title level={4} className="text-slate-800!">
          成员
        </Typography.Title>
        <Typography.Paragraph className="text-slate-500!">
          {error}
        </Typography.Paragraph>
        <Button onClick={() => window.location.reload()}>重新加载</Button>
      </Card>
    );
  }

  return (
    <section ref={sectionRef} className="flex min-h-full flex-col gap-4 pr-4 md:pr-5">
      <Card
        className="shrink-0 rounded-3xl! border-slate-200! shadow-[0_8px_24px_rgba(15,23,42,0.035)]!"
        styles={{ body: { padding: '22px 22px 20px' } }}
      >
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <Typography.Text className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              协作成员
            </Typography.Text>
            <Typography.Title level={3} className="mb-0! mt-2 text-slate-800!">
              当前账号可见的成员协作总览
            </Typography.Title>
            <Typography.Paragraph className="mb-0! mt-3 text-sm! leading-6! text-slate-600!">
              这里按你当前可见的项目关系聚合成员基础信息、参与项目、协作快照与权限摘要。
              当前阶段优先回答“谁在参与、参与了哪些项目、当前状态如何”，组织级邀请与权限矩阵后续接入。
            </Typography.Paragraph>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="primary"
              onClick={() =>
                message.info(
                  '当前阶段请先让成员完成注册，再在项目成员页把已有用户加入项目。',
                )
              }
            >
              邀请成员
            </Button>
            <Button
              onClick={() =>
                message.info('组织级角色与权限矩阵将在后续阶段接入。')
              }
            >
              角色与权限
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summaryItems.map((item) => (
            <div
              key={item.label}
              className="rounded-[20px] border border-slate-200 bg-slate-50/70 px-4 py-4"
            >
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

      <div
        ref={filtersRef}
        className="sticky top-0 z-20 pb-1"
        style={{
          background:
            'linear-gradient(180deg, rgba(249,251,254,0.98) 0%, rgba(249,251,254,0.98) 72%, rgba(249,251,254,0) 100%)',
        }}
      >
        <MemberFiltersBar
          filters={filters}
          total={members.length}
          filteredTotal={filteredMembers.length}
          projects={projects}
          onChange={handleFilterChange}
        />
      </div>

      {members.length === 0 ? (
        <Card
          className="min-h-0 rounded-3xl! border-slate-200! shadow-[0_8px_24px_rgba(15,23,42,0.035)]!"
          styles={{
            body: {
              height: contentAreaHeight ? `${contentAreaHeight}px` : '100%',
              minHeight: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '48px 20px',
            },
          }}
        >
          <Empty description="当前还没有可见的协作成员" />
        </Card>
      ) : (
        <div
          className="grid min-h-0 gap-4 overflow-hidden xl:grid-cols-[320px_minmax(0,1fr)]"
          style={{
            height: contentAreaHeight ? `${contentAreaHeight}px` : undefined,
          }}
        >
          <Card
            className="h-full min-h-0 rounded-3xl! border-slate-200! shadow-[0_8px_24px_rgba(15,23,42,0.035)]!"
            styles={{
              body: {
                padding: '20px',
                height: '100%',
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
              },
            }}
          >
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <Typography.Text className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  成员目录
                </Typography.Text>
                <Typography.Title level={5} className="mb-0! mt-2 text-slate-800!">
                  当前可见成员
                </Typography.Title>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
              <SubtleScrollArea className="min-h-0 flex-1 pr-1">
                <MemberDirectoryList
                  members={pagedMembers}
                  activeMemberId={activeMemberId}
                  onSelect={setActiveMemberId}
                />
              </SubtleScrollArea>

              <div className="flex justify-center border-t border-slate-100 pt-3">
                <Pagination
                  size="small"
                  current={currentPage}
                  pageSize={MEMBER_PAGE_SIZE}
                  total={Math.max(filteredMembers.length, 1)}
                  showSizeChanger={false}
                  showLessItems
                  onChange={(page) => setCurrentPage(page)}
                />
              </div>
            </div>
          </Card>

          <Card
            className="h-full min-h-0 rounded-3xl! border-slate-200! shadow-[0_8px_24px_rgba(15,23,42,0.035)]!"
            styles={{
              body: {
                padding: '20px',
                height: '100%',
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
              },
            }}
          >
            <MemberDetailPanel member={activeMember} />
          </Card>
        </div>
      )}
    </section>
  );
};
