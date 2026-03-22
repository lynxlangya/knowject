import { App, Button, Card, Empty, Pagination, Spin, Typography } from 'antd';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { extractApiErrorMessage } from '@api/error';
import { getMembersOverview, type MemberOverviewResponseItem } from '@api/members';
import { listSkills, type SkillSummaryResponse } from '@api/skills';
import { getAuthUser } from '@app/auth/user';
import { useProjectContext } from '@app/project/useProjectContext';
import {
  GLOBAL_ASSET_PAGE_CLASS_NAME,
  GlobalAssetPageHeader,
} from '@pages/assets/components/GlobalAssetLayout';
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
  const { t, i18n } = useTranslation('pages');
  const authUser = getAuthUser();
  const { projects } = useProjectContext();
  const sectionRef = useRef<HTMLElement | null>(null);
  const filtersRef = useRef<HTMLDivElement | null>(null);
  const [filters, setFilters] = useState<MemberFiltersState>(DEFAULT_FILTERS);
  const [items, setItems] = useState<MemberOverviewResponseItem[]>([]);
  const [skillsCatalog, setSkillsCatalog] = useState<SkillSummaryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [contentAreaHeight, setContentAreaHeight] = useState<number | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const loadMembers = async () => {
      setLoading(true);
      setError(null);

      try {
        const [membersResult, skillsResult] = await Promise.allSettled([
          getMembersOverview(),
          listSkills(),
        ]);

        if (membersResult.status === 'rejected') {
          throw membersResult.reason;
        }

        setItems(membersResult.value.items);

        if (skillsResult.status === 'fulfilled') {
          setSkillsCatalog(skillsResult.value.items);
        } else {
          console.error('[MembersPage] skill catalog loading failed:', skillsResult.reason);
          setSkillsCatalog([]);
        }
      } catch (currentError) {
        console.error('[MembersPage] member overview loading failed:', currentError);
        setError(
          extractApiErrorMessage(currentError, t('members.reload')),
        );
      } finally {
        setLoading(false);
      }
    };

    void loadMembers();
  }, [reloadToken, t]);

  const members = useMemo(() => {
    return buildMemberViewModels({
      items,
      projects,
      currentUserId: authUser?.id ?? null,
      skillsCatalog,
      t,
      locale: i18n.language,
    });
  }, [authUser?.id, i18n.language, items, projects, skillsCatalog, t]);

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
        label: t('members.summary.collaborators'),
        value: t('members.detail.itemCount', { count: members.length }),
        hint: t('members.summary.collaboratorsHint'),
      },
      {
        label: t('members.summary.crossProject'),
        value: t('members.detail.itemCount', { count: crossProjectCount }),
        hint: t('members.summary.crossProjectHint'),
      },
      {
        label: t('members.summary.projectAdmins'),
        value: t('members.detail.itemCount', { count: adminCount }),
        hint: t('members.summary.projectAdminsHint'),
      },
      {
        label: t('members.summary.blocked'),
        value: t('members.detail.itemCount', { count: blockedCount }),
        hint: t('members.summary.blockedHint'),
      },
    ];
  }, [members, t]);

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
      <section className={GLOBAL_ASSET_PAGE_CLASS_NAME}>
        <div className="flex min-h-105 items-center justify-center">
          <Spin size="large" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className={GLOBAL_ASSET_PAGE_CLASS_NAME}>
        <Card className="rounded-3xl! border-slate-200! shadow-surface!">
          <Typography.Title level={4} className="text-slate-800!">
            {t('members.title')}
          </Typography.Title>
          <Typography.Paragraph className="text-slate-500!">
            {error}
          </Typography.Paragraph>
          <Button onClick={() => setReloadToken((currentToken) => currentToken + 1)}>
            {t('members.reload')}
          </Button>
        </Card>
      </section>
    );
  }

  return (
    <section ref={sectionRef} className={GLOBAL_ASSET_PAGE_CLASS_NAME}>
      <GlobalAssetPageHeader
        title={t('members.title')}
        subtitle={t('members.subtitle')}
        summaryItems={summaryItems}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              type="primary"
              onClick={() =>
                message.info(
                  t('members.inviteHint'),
                )
              }
            >
              {t('members.invite')}
            </Button>
            <Button
              onClick={() =>
                message.info(t('members.rolesAndPermissionsHint'))
              }
            >
              {t('members.rolesAndPermissions')}
            </Button>
          </div>
        }
      />

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
          className="min-h-0 rounded-3xl! border-slate-200! shadow-surface!"
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
          <Empty description={t('members.empty')} />
        </Card>
      ) : (
        <div
          className="grid min-h-0 gap-4 overflow-hidden xl:grid-cols-[320px_minmax(0,1fr)]"
          style={{
            height: contentAreaHeight ? `${contentAreaHeight}px` : undefined,
          }}
        >
          <Card
            className="h-full min-h-0 rounded-3xl! border-slate-200! shadow-surface!"
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
              <Typography.Title level={5} className="mb-0! text-slate-800!">
                {t('members.visibleMembers')}
              </Typography.Title>
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
            className="h-full min-h-0 rounded-3xl! border-slate-200! shadow-surface!"
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
