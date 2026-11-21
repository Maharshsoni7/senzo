import tokens from '../../../design/tokens.json';

export const theme = {
  brand: { ink: tokens.brand.ink, paper: tokens.brand.paper, flame: tokens.brand.flame },
  color: tokens.color,
  font: { ui: tokens.font.ui, mono: tokens.font.mono },
  fontSize: tokens.fontSize,
  radius: tokens.radius,
  spacing: tokens.spacing,
  size: tokens.size,
} as const;

export type Theme = typeof theme;
