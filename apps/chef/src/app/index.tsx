import { theme } from '@senzo/ui/theme';
import { StyleSheet, Text, View } from 'react-native';

export default function Home() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Senzo Partner</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.background,
  },
  title: { fontSize: theme.fontSize.titleLarge, fontWeight: '800', color: theme.color.text },
});
