import { StyleSheet, View, type ViewProps } from 'react-native';
import { theme } from './theme';

export function Card({ style, ...rest }: ViewProps) {
  return <View style={[styles.card, style]} {...rest} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.color.borderSoft,
    padding: theme.spacing.gapLarge,
  },
});
