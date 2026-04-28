import { CheckCircleOutlined } from '@ant-design/icons';
import { Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { KNOWJECT_BRAND } from '@styles/brand';

export const LoginHeroPanel = () => {
  const { t } = useTranslation('auth');
  const featureItems = [
    t('hero.features.projectKnowledge'),
    t('hero.features.teamContext'),
  ];

  return (
    <section className="relative flex flex-col justify-between overflow-hidden bg-[#123765] p-[clamp(32px,3.6vw,48px)] text-white max-[960px]:min-h-[15.5rem] max-[960px]:border-b max-[960px]:border-[#CFE3DF] max-[960px]:px-6 max-[960px]:py-7 max-[560px]:min-h-[13.75rem] max-[560px]:px-5 max-[560px]:py-6">
      <div className="absolute inset-0 bg-linear-to-br from-[#173E74] via-[#155F70] to-[#219985]" aria-hidden="true" />
      <div className="absolute inset-x-8 bottom-0 h-px bg-white/22 max-[960px]:hidden" aria-hidden="true" />

      <div className="relative z-2">
        <div className="grid h-16 w-16 place-items-center rounded-card bg-[#DDF8F3] shadow-[0_10px_26px_rgba(8,31,44,0.18)] max-[560px]:h-14 max-[560px]:w-14">
          <img
            src="/favicon.png"
            alt=""
            className="h-9 w-9 max-[560px]:h-8 max-[560px]:w-8"
          />
        </div>

        <Typography.Title
          level={1}
          className="mb-0! mt-8! max-w-[26.25rem] text-[clamp(36px,3.4vw,48px)]! font-[780]! leading-[1.02]! tracking-[-0.02em]! text-white! max-[960px]:mt-5! max-[960px]:text-[36px]! max-[560px]:text-[30px]!"
          style={{ fontFamily: KNOWJECT_BRAND.displayFont }}
        >
          知项 · Knowject
        </Typography.Title>

        <Typography.Paragraph className="mb-0! mt-3! max-w-[23rem] text-body! leading-relaxed! text-[#D8F2EE]! max-[960px]:max-w-none max-[960px]:text-base! max-[560px]:text-sm!">
          让项目知识，真正为团队所用。
        </Typography.Paragraph>
      </div>

      <div className="relative z-2 flex flex-col gap-3 max-[960px]:mt-6 max-[960px]:grid max-[960px]:grid-cols-2 max-[560px]:hidden">
        {featureItems.map((item) => (
          <div
            key={item}
            className="flex items-center gap-2.5 text-sm leading-[1.45] text-[#D8F2EE]"
          >
            <CheckCircleOutlined className="text-body text-[#86E3D0]" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </section>
  );
};
