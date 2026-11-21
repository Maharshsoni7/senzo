import { logout } from '@senzo/api-client';
import { Button, IconButton, Text, theme } from '@senzo/ui';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { queryClient } from '../../lib/query';
import { signOut } from '../../lib/session';

// G14 proper (addresses, allergies, wallet) needs /me — Phase 4.
export default function Account() {
  const { t } = useTranslation();
  const out = useMutation({
    // Sign out locally even if the server call fails (offline, expired token).
    mutationFn: () => logout().catch(() => undefined),
    onSettled: async () => {
      queryClient.clear();
      await signOut();
    },
  });

  return (
    <SafeAreaView style={styles.screen}>
      <IconButton icon="back" accessibilityLabel={t('common.back')} onPress={() => router.back()} />
      <Text variant="titleLarge" accessibilityRole="header" style={styles.title}>
        {t('account.title')}
      </Text>
      <Text tone="secondary">{t('account.soon')}</Text>
      <View style={styles.bottom}>
        <Button
          title={t('account.signOut')}
          variant="secondary"
          loading={out.isPending}
          onPress={() => out.mutate()}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.color.background,
    padding: theme.spacing.screenX,
    gap: 8,
  },
  title: { marginTop: 24 },
  bottom: { marginTop: 'auto' },
});
