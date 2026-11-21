import { Text as RNText, type TextProps } from 'react-native';
import { fonts, theme } from './theme';

const variants = {
  hero: { fontSize: theme.fontSize.hero, fontFamily: fonts.extrabold, lineHeight: 48 },
  titleLarge: { fontSize: theme.fontSize.titleLarge, fontFamily: fonts.extrabold, lineHeight: 30 },
  title: { fontSize: theme.fontSize.title, fontFamily: fonts.bold, lineHeight: 28 },
  bodyLarge: { fontSize: theme.fontSize.bodyLarge, fontFamily: fonts.regular, lineHeight: 22 },
  body: { fontSize: theme.fontSize.body, fontFamily: fonts.regular, lineHeight: 20 },
  small: { fontSize: theme.fontSize.small, fontFamily: fonts.regular, lineHeight: 17 },
  label: {
    fontSize: theme.fontSize.label,
    fontFamily: fonts.monoSemibold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  mono: { fontSize: theme.fontSize.body, fontFamily: fonts.monoMedium },
} as const;

const tones = {
  default: theme.color.text,
  secondary: theme.color.textSecondary,
  muted: theme.color.textMuted,
  primary: theme.color.primary,
  success: theme.color.successText,
  warning: theme.color.warningText,
  onDark: theme.color.onDark,
  onDarkMuted: theme.color.onDarkMuted,
} as const;

export type TextVariant = keyof typeof variants;
export type TextTone = keyof typeof tones;

export function Text({
  variant = 'body',
  tone = 'default',
  weight,
  style,
  ...rest
}: TextProps & {
  variant?: TextVariant;
  tone?: TextTone;
  weight?: 'medium' | 'semibold' | 'bold' | 'extrabold';
}) {
  return (
    <RNText
      maxFontSizeMultiplier={1.6}
      style={[
        variants[variant],
        { color: tones[tone] },
        weight ? { fontFamily: fonts[weight] } : null,
        style,
      ]}
      {...rest}
    />
  );
}
