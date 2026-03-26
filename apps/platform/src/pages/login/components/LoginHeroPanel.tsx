import { CheckCircleOutlined } from '@ant-design/icons';
import { Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { KNOWJECT_BRAND } from '@styles/brand';

export const LoginHeroPanel = () => {
  const { t } = useTranslation('auth');
  const featureItems = [
    t('hero.features.deliveryBoost'),
    t('hero.features.contextUnderstanding'),
  ];

  return (
    <section className="relative flex flex-col justify-center border-r border-slate-400/25 bg-linear-to-br from-[#1E3580] via-[#1A7A8A] to-[#28B8A0] p-[clamp(36px,4vw,56px)] max-[960px]:border-r-0 max-[960px]:border-b max-[960px]:px-5.5 max-[960px]:py-7">
      <div className="relative z-2">
        <div className="grid h-21.5 w-21.5 place-items-center rounded-card-lg bg-linear-to-b from-[#E3F8F4] to-[#D1F7F2] shadow-[0_8px_22px_rgba(40,184,160,0.2)] max-[560px]:h-16 max-[560px]:w-16 max-[560px]:rounded-2xl">
          <img
            src="/favicon.png"
            alt=""
            className="h-11 w-11 max-[560px]:h-8.5 max-[560px]:w-8.5"
          />
        </div>

        <Typography.Title
          level={1}
          className="mb-0! mt-7! text-[clamp(42px,4.4vw,64px)]! font-[780]! leading-[1.04]! tracking-[-0.02em]! text-white! max-[960px]:mt-4! max-[960px]:text-[42px]! max-[560px]:text-3xl!"
          style={{ fontFamily: KNOWJECT_BRAND.displayFont }}
        >
          知项 · Knowject
        </Typography.Title>

        <Typography.Paragraph className="mb-0! mt-3.5! max-w-130 text-title! leading-relaxed! text-white/80! max-[960px]:mt-2! max-[960px]:text-base! max-[560px]:text-sm!">
          让项目知识，真正为团队所用。
        </Typography.Paragraph>

        <div className="mt-10.5 flex flex-col gap-3.5 max-[960px]:mt-4.5 max-[960px]:gap-2.5 max-[560px]:hidden">
          {featureItems.map((item) => (
            <div
              key={item}
              className="inline-flex w-fit items-center gap-2.5 rounded-full border border-[#86E3D0]/30 bg-white/15 px-3.5 py-2.5 text-sm leading-[1.45] text-white backdrop-blur-sm"
            >
              <CheckCircleOutlined className="text-body text-[#86E3D0]" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
