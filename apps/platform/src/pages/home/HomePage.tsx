import { Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { KNOWJECT_BRAND } from '../../styles/brand';

export const HomePage = () => {
  const { t } = useTranslation('pages');

  return (
    <section className="project-page-surface-enter relative isolate min-h-[calc(100vh-2rem)] overflow-hidden rounded-hero border border-slate-200/90 bg-white shadow-[0_20px_48px_rgba(15,23,42,0.055)] md:min-h-[calc(100vh-2.5rem)]">
      <div
        className="absolute inset-y-0 right-0 hidden w-[32%] min-w-[280px] border-l border-slate-200/70 lg:block"
        aria-hidden="true"
        style={{
          background:
            'linear-gradient(180deg, rgba(244,250,248,0.96) 0%, rgba(239,248,245,0.92) 100%)',
        }}
      />
      <div
        className="absolute inset-y-0 right-[18%] hidden w-px lg:block"
        aria-hidden="true"
        style={{
          background:
            'linear-gradient(180deg, rgba(40,184,160,0), rgba(40,184,160,0.18), rgba(40,184,160,0))',
        }}
      />
      <div
        className="absolute left-[-6%] top-[14%] h-56 w-56 rounded-full blur-3xl"
        aria-hidden="true"
        style={{ background: 'rgba(40,184,160,0.12)' }}
      />
      <div
        className="absolute right-[10%] top-[10%] h-48 w-48 rounded-full blur-3xl"
        aria-hidden="true"
        style={{ background: 'rgba(94,200,232,0.10)' }}
      />
      <div
        className="absolute bottom-[-8%] right-[22%] h-64 w-64 rounded-full blur-3xl"
        aria-hidden="true"
        style={{ background: 'rgba(40,184,160,0.08)' }}
      />
      <div
        className="absolute inset-0"
        aria-hidden="true"
        style={{
          background: [
            'radial-gradient(circle at 12% 20%, rgba(40,184,160,0.11) 0%, rgba(40,184,160,0) 24%)',
            'radial-gradient(circle at 72% 26%, rgba(94,200,232,0.12) 0%, rgba(94,200,232,0) 20%)',
            'linear-gradient(135deg, rgba(248,252,251,0.98) 0%, rgba(255,255,255,0.995) 52%, rgba(243,249,247,0.98) 100%)',
          ].join(', '),
        }}
      />
      <div className="relative grid min-h-[calc(100vh-2rem)] grid-cols-1 lg:min-h-[calc(100vh-2.5rem)] lg:grid-cols-[minmax(0,1fr)_320px]">
        <div
          className="relative flex min-w-0 flex-col justify-between px-7 py-7 md:px-10 md:py-9 xl:px-14 xl:py-11"
        >
          <div className="flex items-start justify-between gap-6 pr-0 lg:pr-10">
            <div
              className="inline-flex items-center gap-3 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500"
              style={{
                borderColor: KNOWJECT_BRAND.primaryBorder,
                background: 'rgba(255,255,255,0.76)',
                boxShadow: '0 10px 24px rgba(15, 23, 42, 0.04)',
              }}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: KNOWJECT_BRAND.primary }}
              />
              {t('home.eyebrow')}
            </div>
          </div>

          <div className="flex flex-1 items-center py-8 md:py-10 xl:py-12">
            <div className="max-w-4xl pr-0 lg:pr-14">
              <div className="space-y-5">
                <Typography.Text className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  {t('home.kicker')}
                </Typography.Text>

                <div className="space-y-1">
                  <h1 className="m-0 max-w-4xl text-[clamp(54px,8vw,108px)] leading-[0.9] tracking-[-0.06em] text-slate-900">
                    <span
                      className="block font-semibold"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      {t('home.titleLead')}
                    </span>
                    <span
                      className="mt-2 block"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {t('home.titleBrand')}
                    </span>
                  </h1>
                </div>
              </div>

              <Typography.Paragraph
                className="mb-0! mt-8 max-w-2xl text-[clamp(18px,2.1vw,28px)]! leading-[1.5]! text-slate-600!"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {t('home.subtitle')}
              </Typography.Paragraph>

              <Typography.Paragraph className="mb-0! mt-8 max-w-xl text-base! leading-7! text-slate-500! md:text-lg!">
                {t('home.description')}
              </Typography.Paragraph>

              <div className="mt-10 flex items-center gap-4">
                <div
                  className="h-px w-18 shrink-0"
                  aria-hidden="true"
                  style={{
                    background:
                      'linear-gradient(90deg, rgba(40,184,160,0.42), rgba(40,184,160,0))',
                  }}
                />
                <Typography.Paragraph className="mb-0! max-w-xl text-sm! leading-6! text-slate-500!">
                  {t('home.hint')}
                </Typography.Paragraph>
              </div>
            </div>
          </div>
        </div>

        <aside className="relative flex flex-col justify-between border-t border-slate-200/70 px-7 py-7 lg:border-l lg:border-t-0 lg:px-8 lg:py-8">
          <div className="flex items-start justify-between gap-4">
            <Typography.Text className="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">
              Knowject
            </Typography.Text>
            <span
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border text-[11px] font-semibold text-slate-500"
              style={{
                borderColor: KNOWJECT_BRAND.primaryBorder,
                background: 'rgba(255,255,255,0.72)',
              }}
            >
              KJ
            </span>
          </div>

          <div className="my-8 lg:my-0">
            <div
              className="text-[clamp(72px,10vw,144px)] leading-[0.86] tracking-[-0.08em] text-slate-900/8"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              K
            </div>
            <div className="-mt-3 space-y-3">
              {(['knowledge', 'conversation', 'collaboration'] as const).map((key, index) => (
                <div
                  key={key}
                  className="rounded-2xl border px-4 py-3"
                  style={{
                    borderColor: index === 1 ? '#D6E9F3' : KNOWJECT_BRAND.primaryBorder,
                    background: index === 1 ? 'rgba(240,248,252,0.72)' : 'rgba(255,255,255,0.68)',
                    boxShadow: '0 12px 28px rgba(15, 23, 42, 0.035)',
                  }}
                >
                  <Typography.Text className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    0{index + 1}
                  </Typography.Text>
                  <Typography.Paragraph className="mb-0! mt-2 text-sm! leading-6! text-slate-600!">
                    {t(`home.facets.${key}`)}
                  </Typography.Paragraph>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4">
            <Typography.Text className="text-xs leading-6 text-slate-400">
              {t('home.signature')}
            </Typography.Text>
          </div>
        </aside>
      </div>
    </section>
  );
};
