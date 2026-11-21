import { StyleSheet, View, type DimensionValue } from 'react-native';
import { Button } from './Button';
import { Text } from './Text';
import { theme } from './theme';

export function Skeleton({
  width = '100%',
  height = 16,
  radius = 8,
}: {
  width?: DimensionValue;
  height?: number;
  radius?: number;
}) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width, height, borderRadius: radius, backgroundColor: theme.color.surfaceSubtle }}
    />
  );
}

export function StateMessage({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.state} accessibilityLiveRegion="polite">
      <Text variant="title" style={styles.center}>
        {title}
      </Text>
      {body ? (
        <Text tone="secondary" style={styles.center}>
          {body}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button title={actionLabel} variant="secondary" onPress={onAction} />
      ) : null}
    </View>
  );
}

export function OfflineBanner({ message }: { message: string }) {
  return (
    <View style={styles.offline} accessibilityRole="alert">
      <Text variant="small" weight="semibold" tone="warning">
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  state: { padding: theme.spacing.section, gap: theme.spacing.gap },
  center: { textAlign: 'center' },
  offline: {
    backgroundColor: theme.color.warningSoft,
    paddingVertical: 8,
    paddingHorizontal: theme.spacing.screenX,
  },
});
