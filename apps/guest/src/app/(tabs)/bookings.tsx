import { IconButton, StateMessage, Text, theme } from '@senzo/ui';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// G11 needs GET /bookings, which comes with booking creation (payments, built last).
export default function Bookings() {
  const { t } = useTranslation();
  return (
    <SafeAreaView style={styles.screen}>
      <IconButton icon="back" accessibilityLabel={t('common.back')} onPress={() => router.back()} />
      <Text variant="titleLarge" accessibilityRole="header" style={styles.title}>
        {t('bookings.title')}
      </Text>
      <StateMessage title={t('bookings.soon')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.color.background, padding: theme.spacing.screenX },
  title: { marginTop: 24 },
});
