import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from 'react-native';
import { Text } from './Text';
import { fonts, theme } from './theme';

type Variant = 'primary' | 'secondary' | 'dark' | 'light';

export function Button({
  title,
  variant = 'primary',
  loading = false,
  disabled,
  style,
  ...rest
}: Omit<PressableProps, 'children'> & { title: string; variant?: Variant; loading?: boolean }) {
  const off = !!disabled || loading;
  const dark = variant === 'secondary' || variant === 'light';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy: loading }}
      disabled={off}
      style={(state) => [
        styles.base,
        styles[variant],
        off && styles.off,
        state.pressed && !off && styles.pressed,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={dark ? theme.color.text : theme.color.primaryText} />
      ) : (
        <Text style={[styles.label, dark && { color: theme.color.text }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: theme.size.buttonHeight,
    borderRadius: theme.radius.button,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: theme.color.primary },
  dark: { backgroundColor: theme.color.dark },
  light: { backgroundColor: theme.color.surface },
  secondary: {
    borderWidth: 1.5,
    borderColor: theme.color.text,
    backgroundColor: theme.color.surface,
  },
  off: { opacity: 0.45 },
  pressed: { opacity: 0.85 },
  label: {
    color: theme.color.primaryText,
    fontSize: theme.fontSize.button,
    fontFamily: fonts.bold,
  },
});
