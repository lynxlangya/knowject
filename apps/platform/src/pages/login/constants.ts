import type { SupportedLocale } from '@app/providers/locale.storage';

export interface LoginFormValues {
  name?: string;
  username: string;
  password: string;
  confirmPassword?: string;
  remember?: boolean;
}

export type AuthMode = 'login' | 'register';
export interface LoginLocaleOption {
  locale: SupportedLocale;
  label: string;
}

export const REMEMBERED_USERNAME_KEY = 'knowject_remembered_username';

/* ── Flow Mesh Config ────────────────────────────────── */

export interface FlowMeshConfig {
  nodeCount: number;
  nodeRadiusMin: number;
  nodeRadiusMax: number;
  speedMin: number;
  speedMax: number;
  connectionDistance: number;
  connectionOpacityMax: number;
  interactionRadius: number;
  interactionBrightnessBoost: number;
  pulseIntervalMin: number;  // ms，最小脉冲间隔
  pulseIntervalMax: number;  // ms，最大脉冲间隔
  flowFieldScale: number;   // 流场空间尺度，如 0.01
  flowFieldSpeed: number;   // 流场时间偏移速度，如 0.002
  colors: {
    nodeRGB: string;
    connectionRGB: string;
    pulseRGB: string;
    glowRGB: string;
  };
}

export const FLOW_MESH_CONFIG: FlowMeshConfig = {
  nodeCount: 42,
  nodeRadiusMin: 1.1,
  nodeRadiusMax: 2.4,
  speedMin: 0.08,
  speedMax: 0.16,
  connectionDistance: 116,
  connectionOpacityMax: 0.09,
  interactionRadius: 200,
  interactionBrightnessBoost: 0.42,
  pulseIntervalMin: 1500,
  pulseIntervalMax: 3000,
  flowFieldScale: 0.01,
  flowFieldSpeed: 0.002,
  colors: {
    nodeRGB: '40,184,160',
    connectionRGB: '40,184,160',
    pulseRGB: '134,227,208',
    glowRGB: '134,227,208',
  },
};

export const LOGIN_PAGE_BACKGROUND =
  'linear-gradient(180deg, #EEF7F5 0%, #F7FBFA 46%, #EDF5F3 100%)';

export const FLOW_MASK_IMAGE =
  'linear-gradient(90deg, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 1) 22%, rgba(0, 0, 0, 0.08) 34%, rgba(0, 0, 0, 0.08) 66%, rgba(0, 0, 0, 1) 78%, rgba(0, 0, 0, 1) 100%)';

export const LOGIN_FORM_CLASS_NAME = [
  'w-full',
  '[&_.ant-form-item]:mb-[17px]',
  '[&_.ant-form-item-label>label]:text-label',
  '[&_.ant-form-item-label>label]:font-semibold',
  '[&_.ant-form-item-label>label]:text-[#243635]',
  '[&_.ant-form-item-explain-error]:text-xs',
  '[&_.ant-input-affix-wrapper]:h-[50px]',
  '[&_.ant-input-affix-wrapper]:rounded-panel',
  '[&_.ant-input-affix-wrapper]:border-[#D7E4E1]',
  '[&_.ant-input-affix-wrapper]:bg-[#FBFDFC]',
  '[&_.ant-input-affix-wrapper]:shadow-none',
  '[&_.ant-input-affix-wrapper]:transition-[border-color,box-shadow,background-color]',
  '[&_.ant-input-affix-wrapper]:duration-150',
  '[&_.ant-input-affix-wrapper:hover]:border-[#B8D9D3]',
  '[&_.ant-input-affix-wrapper:focus-within]:border-[#28B8A0]',
  '[&_.ant-input-affix-wrapper:focus-within]:bg-white',
  '[&_.ant-input-affix-wrapper:focus-within]:shadow-[0_0_0_3px_rgba(40,184,160,0.14)]',
  '[&_.ant-input-affix-wrapper_.anticon]:text-[#8AA8A4]',
  '[&_.ant-input]:bg-transparent',
  '[&_.ant-input::placeholder]:text-slate-400',
].join(' ');

export const LOGIN_LOCALE_OPTIONS: LoginLocaleOption[] = [
  {
    locale: 'en',
    label: 'English',
  },
  {
    locale: 'zh-CN',
    label: '简体中文',
  },
];

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
