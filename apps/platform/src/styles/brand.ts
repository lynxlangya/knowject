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
  // 小图标徽章专用：左上光源 → 薄荷绿，比 heroGradient 透亮
  iconGradient:
    'linear-gradient(145deg, rgba(255,255,255,0.92) 0%, #5DDDCF 30%, #28B8A0 100%)',

  // 内容区卡片/面板背景渐变（标准 slate→white 换 brand mint 白）
  cardSurfaceGradient:
    'linear-gradient(180deg, rgba(242,253,251,0.96) 0%, rgba(232,248,245,0.92) 100%)',
  // Shell 内容区背景渐变
  shellContentGradient:
    'linear-gradient(180deg, rgba(246,251,250,0.98) 0%, rgba(240,248,246,0.98) 56%, rgba(238,243,240,0.9) 100%)',
  // 卡片内嵌光晕渐变（mint radial，用于 chat 输入区等）
  cardGlowGradient:
    'radial-gradient(circle at bottom, rgba(40,184,160,0.08), transparent 34%)',

  // 保留天青 accent，天然和薄荷+蓝都兼容
  accent:               '#5EC8E8',
  accentSurface:        '#EDF9FD',

  // Typography
  displayFont:          "'Syne', sans-serif",
  bodyFont:             "'Plus Jakarta Sans', 'Noto Sans SC', sans-serif",
} as const;
