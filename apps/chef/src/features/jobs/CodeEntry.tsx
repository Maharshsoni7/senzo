import { Text, theme } from '@senzo/ui';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'delete'] as const;

/** Four boxes and a keypad (C06); avoids the system keyboard covering the boxes. */
export function CodeEntry({
  value,
  onChange,
  state = 'idle',
  disabled = false,
}: {
  value: string;
  onChange: (next: string) => void;
  state?: 'idle' | 'ok' | 'bad';
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const press = (k: (typeof KEYS)[number]) => {
    if (k === 'delete') onChange(value.slice(0, -1));
    else if (k === 'clear') onChange('');
    else if (value.length < 4) onChange(value + k);
  };
  return (
    <View style={styles.wrap}>
      <View
        style={styles.boxes}
        accessible
        accessibilityLabel={`${t('job.codeLabel')}: ${value.split('').join(' ')}`}
      >
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              styles.box,
              i === value.length && styles.current,
              state === 'ok' && styles.ok,
              state === 'bad' && styles.bad,
            ]}
          >
            <Text variant="mono" weight="semibold" style={styles.digit}>
              {value[i] ?? ''}
            </Text>
          </View>
        ))}
      </View>
      <View style={styles.keys}>
        {KEYS.map((k) => (
          <Pressable
            key={k}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={
              k === 'delete' ? t('job.keyDelete') : k === 'clear' ? t('job.keyClear') : k
            }
            onPress={() => press(k)}
            style={({ pressed }) => [
              styles.key,
              (k === 'delete' || k === 'clear') && styles.keyPlain,
              pressed && styles.pressed,
            ]}
          >
            <Text variant="title">{k === 'delete' ? '⌫' : k === 'clear' ? 'C' : k}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 24 },
  boxes: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  box: {
    width: 60,
    height: 68,
    borderRadius: 14,
    backgroundColor: theme.color.surface,
    borderWidth: 2,
    borderColor: '#D5D8DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  current: { borderColor: theme.color.text },
  ok: { borderColor: theme.color.success },
  bad: { borderColor: theme.color.primary },
  digit: { fontSize: 30, lineHeight: 38 },
  keys: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8, justifyContent: 'space-between' },
  key: {
    width: '31.5%',
    minHeight: 54,
    borderRadius: 12,
    backgroundColor: theme.color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyPlain: { backgroundColor: 'transparent' },
  pressed: { opacity: 0.6 },
});
