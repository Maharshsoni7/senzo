import type { PartnerBookingDetail } from '@senzo/api-client';
import { IconButton, OfflineBanner, Skeleton, StateMessage, Text, theme } from '@senzo/ui';
import { router, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOnline } from '../../lib/useOnline';
import { usePartnerBooking } from './queries';

export const addressLine = (b: PartnerBookingDetail) =>
  b.address.unlocked && b.address.line1
    ? [b.address.line1, b.address.area, b.address.pincode].filter(Boolean).join(', ')
    : `${b.address.area}, ${b.address.city}`;

/**
 * Loads the booking for `job/[id]/*` and `request/[id]`. The cached booking renders offline,
 * so a chef at the door can still see it.
 */
export function JobScreen({
  title,
  children,
  footer,
}: {
  title?: (b: PartnerBookingDetail) => string;
  children: (b: PartnerBookingDetail) => ReactNode;
  footer?: (b: PartnerBookingDetail) => ReactNode;
}) {
  const { t } = useTranslation();
  const online = useOnline();
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = usePartnerBooking(id);
  const b = query.data;

  const back = (
    <IconButton icon="back" accessibilityLabel={t('common.back')} onPress={() => router.back()} />
  );

  if (query.isPending) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.content}>
          {back}
          <Skeleton height={200} />
        </View>
      </SafeAreaView>
    );
  }
  if (!b) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.content}>{back}</View>
        <StateMessage
          title={t('common.error')}
          body={t('common.errorBody')}
          actionLabel={t('common.retry')}
          onAction={() => void query.refetch()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      {!online ? <OfflineBanner message={t('common.offline')} /> : null}
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          {back}
          <View style={styles.flex}>
            {title ? (
              <Text variant="title" accessibilityRole="header">
                {title(b)}
              </Text>
            ) : (
              <>
                <Text weight="bold" variant="bodyLarge">
                  {t('job.header', { name: b.guestName, count: b.guests })}
                </Text>
                <Text variant="small" tone="secondary" numberOfLines={1}>
                  {addressLine(b)}
                </Text>
              </>
            )}
          </View>
        </View>
        {children(b)}
      </ScrollView>
      {footer ? <View style={styles.footer}>{footer(b)}</View> : null}
    </SafeAreaView>
  );
}

export const jobStyles = StyleSheet.create({
  center: { textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  allergy: {
    backgroundColor: theme.color.primarySoft,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  allergyText: { color: '#6E2414' },
  error: { textAlign: 'center', minHeight: 20 },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.color.backgroundKitchen },
  content: { padding: 20, gap: 16, paddingBottom: 24, flexGrow: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1 },
  footer: { paddingHorizontal: 20, paddingBottom: 24, gap: 8 },
});
