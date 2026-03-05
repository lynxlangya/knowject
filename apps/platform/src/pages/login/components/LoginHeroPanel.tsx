import { CheckCircleOutlined } from '@ant-design/icons';
import { Typography } from 'antd';
import { LOGIN_FEATURE_ITEMS } from '../constants';

export const LoginHeroPanel = () => {
  return (
    <section className="relative flex flex-col justify-center border-r border-slate-400/25 bg-linear-to-br from-[#f2f6ff] to-[#edf3ff] p-[clamp(36px,4vw,56px)] max-[960px]:border-r-0 max-[960px]:border-b max-[960px]:px-5.5 max-[960px]:py-7">
      <div className="relative z-2">
        <div className="grid h-21.5 w-21.5 place-items-center rounded-[22px] bg-linear-to-b from-blue-100 to-[#c7ddff] shadow-[0_8px_22px_rgba(59,130,246,0.2)] max-[560px]:h-16 max-[560px]:w-16 max-[560px]:rounded-2xl">
          <img
            src="/favicon.png"
            alt=""
            className="h-11 w-11 max-[560px]:h-8.5 max-[560px]:w-8.5"
          />
        </div>

        <Typography.Title
          level={1}
          className="mb-0! mt-7! text-[clamp(42px,4.4vw,64px)]! font-[780]! leading-[1.04]! tracking-[-0.02em]! text-slate-900! max-[960px]:mt-4! max-[960px]:text-[42px]! max-[560px]:text-[30px]!"
        >
          知项 · Knowject
        </Typography.Title>

        <Typography.Paragraph className="mb-0! mt-3.5! max-w-130 text-[19px]! leading-relaxed! text-slate-600! max-[960px]:mt-2! max-[960px]:text-base! max-[560px]:text-sm!">
          让项目知识，真正为团队所用。
        </Typography.Paragraph>

        <div className="mt-10.5 flex flex-col gap-3.5 max-[960px]:mt-4.5 max-[960px]:gap-2.5 max-[560px]:hidden">
          {LOGIN_FEATURE_ITEMS.map((item) => (
            <div
              key={item}
              className="inline-flex w-fit items-center gap-2.5 rounded-full border border-blue-500/15 bg-white/85 px-3.5 py-2.5 text-sm leading-[1.45] text-blue-900"
            >
              <CheckCircleOutlined className="text-[15px]" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
