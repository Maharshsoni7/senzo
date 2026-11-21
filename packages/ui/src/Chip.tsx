import { Pressable, StyleSheet } from 'react-native';
import { Text } from './Text';
import { theme } from './theme';

export function Chip({
  label,
  selected = false,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      hitSlop={6}
      style={[styles.chip, selected && styles.selected]}
    >
      <Text
        variant="small"
        weight="semibold"
        style={{ color: selected ? theme.color.onDark : theme.color.text }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: theme.radius.chip,
    borderWidth: 1,
    borderColor: theme.color.border,
    backgroundColor: theme.color.surface,
    justifyContent: 'center',
  },
  selected: { backgroundColor: theme.color.dark, borderColor: theme.color.dark },
});
