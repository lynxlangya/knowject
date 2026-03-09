// export const KNOWJECT_BRAND = {
//   primary: '#1B50B7',
//   primaryHover: '#255BC1',
//   primaryActive: '#11357E',
//   primaryText: '#11357E',
//   primarySurface: '#EEF4FF',
//   primarySurfaceStrong: '#E1EAFE',
//   primaryBorder: '#D5E2FA',
//   primaryGlow: 'rgba(27,80,183,0.16)',
//   textStrong: '#1E293B',
//   textBody: '#475569',
//   textMuted: '#64748B',
//   shellBg: '#EEF3FA',
//   shellBorder: '#D8E1ED',
//   shellSurface: 'rgba(255,255,255,0.68)',
//   shellSurfaceStrong: 'rgba(255,255,255,0.88)',
//   canvasBg: '#F5F7FB',
//   cardShadow: 'rgba(15,23,42,0.035)',
//   cardShadowStrong: 'rgba(15,23,42,0.055)',
//   heroGradient:
//     'linear-gradient(145deg, #0F2A57 0%, #173D8B 58%, #2D58C3 100%)',
//   navGradient:
//     'linear-gradient(135deg, #11357E 0%, #1B50B7 60%, #255BC1 100%)',
// } as const;

export const KNOWJECT_BRAND = {
  // 蓝调薄荷绿，和 Logo 蓝有色相衔接
  primary:              '#28B8A0',   // 蓝绿 mint，清透不腻
  primaryHover:         '#35C4AC',
  primaryActive:        '#1FA08A',
  primaryText:          '#1A8A77',   // 深一档，文字可读性好

  // Surface 极浅，隐约薄荷感
  primarySurface:       '#F2FDFB',   // 几乎是白
  primarySurfaceStrong: '#E3F8F4',
  primaryBorder:        '#C2EDE6',
  primaryGlow:          'rgba(40,184,160,0.12)',

  // 文字保持中性，不偏绿
  textStrong:           '#1C2B2A',   // 极深，微绿调
  textBody:             '#4A6260',
  textMuted:            '#8AA8A4',

  shellBg:              '#F0F8F6',   // 整体底色带一点薄荷感
  shellBorder:          '#D2E8E4',
  shellSurface:         'rgba(255,255,255,0.80)',
  shellSurfaceStrong:   'rgba(255,255,255,0.95)',

  canvasBg:             '#F6FBFA',
  cardShadow:           'rgba(15,42,38,0.020)',
  cardShadowStrong:     'rgba(15,42,38,0.040)',

  // Gradient 用蓝→蓝绿→薄荷，自然桥接 Logo 蓝色
  heroGradient: 'linear-gradient(145deg, #1E3580 0%, #1A7A8A 55%, #28B8A0 100%)',
  navGradient:  'linear-gradient(135deg, #1E3580 0%, #28B8A0 100%)',

  // 保留天青 accent，天然和薄荷+蓝都兼容
  accent:               '#5EC8E8',
  accentSurface:        '#EDF9FD',
} as const;
