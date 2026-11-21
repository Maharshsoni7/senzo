import tokens from '../../../design/tokens.json';

/** Names registered by @expo-google-fonts in the apps' root layout. */
export const fonts = {
  regular: 'Archivo_400Regular',
  medium: 'Archivo_500Medium',
  semibold: 'Archivo_600SemiBold',
  bold: 'Archivo_700Bold',
  extrabold: 'Archivo_800ExtraBold',
  mono: 'IBMPlexMono_400Regular',
  monoMedium: 'IBMPlexMono_500Medium',
  monoSemibold: 'IBMPlexMono_600SemiBold',
} as const;

export const theme = {
  brand: { ink: tokens.brand.ink, paper: tokens.brand.paper, flame: tokens.brand.flame },
  color: tokens.color,
  fonts,
  fontSize: tokens.fontSize,
  radius: tokens.radius,
  spacing: tokens.spacing,
  size: tokens.size,
} as const;

export type Theme = typeof theme;
