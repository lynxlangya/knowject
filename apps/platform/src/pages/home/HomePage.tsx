import {
  DatabaseOutlined,
  MessageOutlined,
  RightOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { KNOWJECT_BRAND } from '../../styles/brand';

export const HomePage = () => {
  const { t } = useTranslation('pages');
  const facets = [
    {
      key: 'knowledge',
      icon: <DatabaseOutlined />,
      tint: KNOWJECT_BRAND.primary,
    },
    {
      key: 'conversation',
      icon: <MessageOutlined />,
      tint: '#5B9CF6',
    },
    {
      key: 'collaboration',
      icon: <TeamOutlined />,
      tint: '#62AEEB',
    },
  ] as const;

  return (
    <section className="home-showcase project-page-surface-enter">
      <div className="home-showcase__field" aria-hidden="true" />
      <div className="home-showcase__grid">
        <main className="home-showcase__main">
          <div className="home-showcase__pill">
            <span className="home-showcase__pill-dot" />
            <span>{t('home.eyebrow')}</span>
          </div>

          <div className="home-showcase__copy">
            <p className="home-showcase__kicker">{t('home.kicker')}</p>
            <h1 className="home-showcase__title">
              <span>{t('home.titleLead')}</span>
              <span>{t('home.titleBrand')}</span>
            </h1>
            <p className="home-showcase__subtitle">{t('home.subtitle')}</p>
            <p className="home-showcase__description">{t('home.description')}</p>
            <div className="home-showcase__hint">
              <span aria-hidden="true" />
              <p>{t('home.hint')}</p>
            </div>
          </div>

          <div className="home-showcase__artifact" aria-hidden="true">
            <div className="home-showcase__orbit home-showcase__orbit--outer" />
            <div className="home-showcase__orbit home-showcase__orbit--middle" />
            <div className="home-showcase__orbit home-showcase__orbit--inner" />
            <div className="home-showcase__signal home-showcase__signal--one" />
            <div className="home-showcase__signal home-showcase__signal--two" />
            <div className="home-showcase__signal home-showcase__signal--three" />
            <div className="home-showcase__base home-showcase__base--back" />
            <div className="home-showcase__base home-showcase__base--front" />
            <div className="home-showcase__chip">
              <span>K</span>
            </div>
          </div>
        </main>

        <aside className="home-showcase__rail" aria-label="Knowject">
          <div className="home-showcase__rail-head">
            <span>KNOWJECT</span>
            <span className="home-showcase__avatar">KJ</span>
          </div>

          <span className="home-showcase__watermark" aria-hidden="true">
            K
          </span>

          <div className="home-showcase__facets">
            {facets.map((facet, index) => (
              <article className="home-showcase__facet" key={facet.key}>
                <span className="home-showcase__facet-icon" style={{ color: facet.tint }}>
                  {facet.icon}
                </span>
                <span className="home-showcase__facet-copy">
                  <span style={{ color: facet.tint }}>0{index + 1}</span>
                  <strong>{t(`home.facets.${facet.key}`)}</strong>
                </span>
                <RightOutlined className="home-showcase__facet-arrow" />
              </article>
            ))}
          </div>

          <p className="home-showcase__signature">{t('home.signature')}</p>
        </aside>
      </div>
    </section>
  );
};
