export interface LoginFormValues {
  name?: string;
  username: string;
  password: string;
  confirmPassword?: string;
  remember?: boolean;
}

export type AuthMode = 'login' | 'register';

export interface FlowPoint {
  x: number;
  y: number;
}

export interface FlowSegment {
  d: string;
  duration: string;
  delay: string;
}

export interface SparkPoint {
  left: string;
  top: string;
  animation: string;
}

export const REMEMBERED_USERNAME_KEY = 'knowject_remembered_username';

export const FLOW_VIEWBOX_WIDTH = 1920;
export const FLOW_VIEWBOX_HEIGHT = 1080;

export const LEFT_HUB: FlowPoint = { x: 250, y: 170 };
export const RIGHT_HUB: FlowPoint = { x: 1360, y: 962 };

export const FLOW_SEGMENTS: FlowSegment[] = [
  { d: `M -120 60 C 20 90 130 120 ${LEFT_HUB.x} ${LEFT_HUB.y}`, duration: '8.8s', delay: '-1.2s' },
  { d: `M -130 130 C 20 145 140 160 ${LEFT_HUB.x} ${LEFT_HUB.y}`, duration: '9.6s', delay: '-4.4s' },
  { d: `M -120 220 C 20 210 130 190 ${LEFT_HUB.x} ${LEFT_HUB.y}`, duration: '7.9s', delay: '-2.7s' },
  { d: `M -110 320 C 20 280 140 220 ${LEFT_HUB.x} ${LEFT_HUB.y}`, duration: '10.4s', delay: '-3.1s' },
  { d: `M -120 470 C 20 360 150 250 ${LEFT_HUB.x} ${LEFT_HUB.y}`, duration: '8.3s', delay: '-5.6s' },
  { d: `M -130 650 C 30 470 160 300 ${LEFT_HUB.x} ${LEFT_HUB.y}`, duration: '9.1s', delay: '-6.3s' },
  { d: `M -140 900 C 40 620 170 360 ${LEFT_HUB.x} ${LEFT_HUB.y}`, duration: '10.8s', delay: '-1.8s' },
  { d: `M 2060 80 C 1890 180 1720 380 ${RIGHT_HUB.x} ${RIGHT_HUB.y}`, duration: '9s', delay: '-2.2s' },
  { d: `M 2050 170 C 1890 250 1710 430 ${RIGHT_HUB.x} ${RIGHT_HUB.y}`, duration: '8.4s', delay: '-4.9s' },
  { d: `M 2040 300 C 1880 350 1700 500 ${RIGHT_HUB.x} ${RIGHT_HUB.y}`, duration: '9.8s', delay: '-3.5s' },
  { d: `M 2030 450 C 1880 470 1690 570 ${RIGHT_HUB.x} ${RIGHT_HUB.y}`, duration: '8.6s', delay: '-5.8s' },
  { d: `M 2040 620 C 1880 600 1680 650 ${RIGHT_HUB.x} ${RIGHT_HUB.y}`, duration: '10.1s', delay: '-1.1s' },
  { d: `M 2050 800 C 1890 730 1680 760 ${RIGHT_HUB.x} ${RIGHT_HUB.y}`, duration: '9.3s', delay: '-6.1s' },
  { d: `M 2060 980 C 1890 900 1680 900 ${RIGHT_HUB.x} ${RIGHT_HUB.y}`, duration: '10.6s', delay: '-2.9s' },
];

export const FLOW_SPARK_POINTS: SparkPoint[] = [
  { left: '9.4%', top: '13.4%', animation: 'sparkFloatA_2.7s_ease-in-out_infinite' },
  { left: '17.1%', top: '20.4%', animation: 'sparkFloatB_3.2s_ease-in-out_infinite' },
  { left: '67.2%', top: '87.4%', animation: 'sparkFloatC_2.3s_ease-in-out_infinite' },
  { left: '74.8%', top: '91.6%', animation: 'sparkFloatA_2.9s_ease-in-out_infinite' },
];

export const LOGIN_PAGE_BACKGROUND =
  'radial-gradient(circle at 14% 20%, rgba(191, 219, 254, 0.42) 0, rgba(191, 219, 254, 0) 38%), radial-gradient(circle at 86% 78%, rgba(219, 234, 254, 0.38) 0, rgba(219, 234, 254, 0) 42%), linear-gradient(180deg, #f4f7fc 0%, #edf2fb 100%)';

export const FLOW_MASK_IMAGE =
  'linear-gradient(90deg, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 1) 22%, rgba(0, 0, 0, 0.08) 34%, rgba(0, 0, 0, 0.08) 66%, rgba(0, 0, 0, 1) 78%, rgba(0, 0, 0, 1) 100%)';

export const LOGIN_FORM_CLASS_NAME = [
  'w-full',
  '[&_.ant-form-item]:mb-[18px]',
  '[&_.ant-form-item-label>label]:text-[13px]',
  '[&_.ant-form-item-label>label]:font-semibold',
  '[&_.ant-form-item-label>label]:text-slate-700',
  '[&_.ant-form-item-explain-error]:text-xs',
  '[&_.ant-input-affix-wrapper]:h-12',
  '[&_.ant-input-affix-wrapper]:rounded-[14px]',
  '[&_.ant-input-affix-wrapper]:border-[#d6deea]',
  '[&_.ant-input-affix-wrapper]:bg-white/90',
  '[&_.ant-input-affix-wrapper]:shadow-none',
  '[&_.ant-input-affix-wrapper]:transition-all',
  '[&_.ant-input-affix-wrapper]:duration-150',
  '[&_.ant-input-affix-wrapper:hover]:border-[#bfd0ec]',
  '[&_.ant-input-affix-wrapper:focus-within]:border-[#1b50b7]',
  '[&_.ant-input-affix-wrapper:focus-within]:shadow-[0_0_0_3px_rgba(27,80,183,0.16)]',
  '[&_.ant-input-affix-wrapper_.anticon]:text-slate-400',
  '[&_.ant-input]:bg-transparent',
  '[&_.ant-input::placeholder]:text-slate-400',
].join(' ');

export const LOGIN_FEATURE_ITEMS = [
  '提升项目交付效率达 40%',
  '在真实语境中快速理解项目上下文',
] as const;

export const toPercent = (value: number, total: number): string =>
  `${(value / total) * 100}%`;

export const getRememberedUsername = (): string => {
  if (typeof window === 'undefined') {
    return '';
  }

  return localStorage.getItem(REMEMBERED_USERNAME_KEY) ?? '';
};

export const persistRememberedUsername = (
  username: string,
  remember: boolean | undefined
): void => {
  if (!remember) {
    localStorage.removeItem(REMEMBERED_USERNAME_KEY);
    return;
  }

  localStorage.setItem(REMEMBERED_USERNAME_KEY, username);
};
