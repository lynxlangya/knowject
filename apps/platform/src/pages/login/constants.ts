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

/* ── Particle Network Config ─────────────────────────── */

export interface ParticleNetworkConfig {
  particleCount: number;
  particleRadiusMin: number;
  particleRadiusMax: number;
  speedMin: number;
  speedMax: number;
  connectionDistance: number;
  connectionOpacityMax: number;
  interactionRadius: number;
  interactionConnectionScale: number;
  interactionBrightnessBoost: number;
  colors: {
    particleRGB: string;
    particleActiveRGB: string;
    connectionRGB: string;
    connectionActiveRGB: string;
    glowRGB: string;
  };
}

export const PARTICLE_NETWORK_CONFIG: ParticleNetworkConfig = {
  particleCount: 65,
  particleRadiusMin: 1.2,
  particleRadiusMax: 2.8,
  speedMin: 0.15,
  speedMax: 0.45,
  connectionDistance: 150,
  connectionOpacityMax: 0.18,
  interactionRadius: 180,
  interactionConnectionScale: 1.6,
  interactionBrightnessBoost: 0.55,
  colors: {
    particleRGB: '40,184,160',
    particleActiveRGB: '40,184,160',
    connectionRGB: '40,184,160',
    connectionActiveRGB: '134,227,208',
    glowRGB: '134,227,208',
  },
};

export const LOGIN_PAGE_BACKGROUND =
  'radial-gradient(circle at 12% 18%, rgba(40, 184, 160, 0.18) 0%, transparent 35%), radial-gradient(circle at 88% 82%, rgba(40, 184, 160, 0.10) 0%, transparent 40%), linear-gradient(180deg, #F0F8F6 0%, #F6FBFA 100%)';

export const FLOW_MASK_IMAGE =
  'linear-gradient(90deg, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 1) 22%, rgba(0, 0, 0, 0.08) 34%, rgba(0, 0, 0, 0.08) 66%, rgba(0, 0, 0, 1) 78%, rgba(0, 0, 0, 1) 100%)';

export const LOGIN_FORM_CLASS_NAME = [
  'w-full',
  '[&_.ant-form-item]:mb-[18px]',
  '[&_.ant-form-item-label>label]:text-label',
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
