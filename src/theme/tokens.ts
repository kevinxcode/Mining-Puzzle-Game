/**
 * MINING FLOW — design system tokens.
 * Single source of truth for colors, spacing, radius, typography, shadows,
 * animation durations and icon sizes. Avoid random style values in screens.
 */

export const colors = {
  // Warm neutral background + dark graphite surfaces
  background: '#F4F1EC',
  surface: '#1C1F24',
  surfaceElevated: '#262A31',
  surfaceMuted: '#EAE6E3',
  card: '#FFFFFF',

  // Accents
  primary: '#FF7A1A', // safety orange
  primaryDark: '#E05E00',
  secondary: '#FFC93C', // mining yellow
  info: '#3EC1D3', // cool cyan
  success: '#37B26C',
  warning: '#E8912D',
  danger: '#D64545',

  // Text
  text: '#22262B',
  textOnDark: '#F5F3EF',
  textMuted: '#8A8F98',
  textOnDarkMuted: '#A9AEB8',

  // Map palette
  mapGround: '#E8DCC8',
  mapRoad: '#C9B896',
  mapRoadActive: '#8A7550',
  mapWater: '#9FD3E0',
  mapRock: '#B0A896',
  mapTree: '#7FA86B',
  mapWall: '#D8C9AE',

  // Material colors
  ore: '#C97A3D',
  overburden: '#8D7B6A',
  coal: '#3A3F46',
  gravel: '#A8A29A',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 34, fontWeight: '800' as const },
  title: { fontSize: 24, fontWeight: '800' as const },
  heading: { fontSize: 18, fontWeight: '700' as const },
  body: { fontSize: 15, fontWeight: '500' as const },
  label: { fontSize: 12, fontWeight: '700' as const, letterSpacing: 0.8 },
  caption: { fontSize: 12, fontWeight: '500' as const },
  tiny: { fontSize: 10, fontWeight: '700' as const, letterSpacing: 0.5 },
};

export const shadows = {
  soft: {
    shadowColor: '#1C1F24',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  raised: {
    shadowColor: '#1C1F24',
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
};

export const animation = {
  fast: 120,
  normal: 220,
  slow: 380,
  starPop: 500,
} as const;

export const iconSizes = {
  xs: 14,
  sm: 18,
  md: 22,
  lg: 28,
  xl: 36,
} as const;

/** Large accessible touch target (iOS HIG + Android guidance). */
export const minTouchTarget = 48;
