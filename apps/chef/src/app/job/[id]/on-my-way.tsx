import type { PartnerBookingDetail } from '@senzo/api-client';
import { Button, Chip, Icon, Text, theme } from '@senzo/ui';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { jobErrorMessage, timeLabel } from '../../../features/jobs/format';
import { addressLine, JobScreen, jobStyles } from '../../../features/jobs/JobScreen';
import { useOnMyWay } from '../../../features/jobs/queries';

const ETAS = [15, 30, 45] as const;

/** Opens the phone's Maps app on the address; nothing is tracked (D11). */
const openMaps = (b: PartnerBookingDetail) => {
  const { lat, lng } = b.address;
  const query = lat !== null && lng !== null ? `${lat},${lng}` : addressLine(b);
  void Linking.openURL(
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
  );
};

function AddressCard({ b }: { b: PartnerBookingDetail }) {
  const { t } = useTranslation();
  return (
    <View style={styles.card}>
      <View style={jobStyles.row}>
        <Text weight="bold" variant="bodyLarge">
          {t('job.header', { name: b.guestName, count: b.guests })}
        </Text>
        <Text variant="mono" style={styles.small}>
          {t('job.reachBy', { time: timeLabel(b.arriveBy) })}
        </Text>
      </View>
      <Text variant="small" tone="secondary">
        {addressLine(b)}
      </Text>
      {!b.address.unlocked ? (
        <Text variant="small" tone="muted">
          {t('job.addressLocked')}
        </Text>
      ) : null}
    </View>
  );
}

function Actions({ b }: { b: PartnerBookingDetail }) {
  const { t } = useTranslation();
  const [eta, setEta] = useState<(typeof ETAS)[number]>(30);
  const onMyWay = useOnMyWay(b.id);
  const travelling = b.subStatus === 'on_the_way';

  if (travelling) {
    return (
      <Button
        title={t('job.arrived')}
        onPress={() => router.replace({ pathname: '/job/[id]/start', params: { id: b.id } })}
        style={styles.go}
      />
    );
  }
  return (
    <>
      <Text variant="small" weight="semibold">
        {t('job.eta')}
      </Text>
      <View style={styles.chips} accessibilityRole="radiogroup">
        {ETAS.map((m) => (
          <Chip
            key={m}
            label={t('job.etaMinutes', { count: m })}
            selected={eta === m}
            onPress={() => setEta(m)}
          />
        ))}
      </View>
      {onMyWay.error ? (
        <Text
          variant="small"
          tone="primary"
          style={jobStyles.error}
          accessibilityLiveRegion="polite"
        >
          {jobErrorMessage(onMyWay.error, t)}
        </Text>
      ) : null}
      <Button
        title={t('job.sendOnMyWay')}
        onPress={() => onMyWay.mutate(eta)}
        loading={onMyWay.isPending}
      />
    </>
  );
}

// C13. No map, route or live location (D11); the mockup's call and "running late" need Exotel and chat.
export default function OnMyWay() {
  const { t } = useTranslation();
  return (
    <JobScreen footer={(b) => <Actions b={b} />}>
      {(b) => (
        <>
          {b.subStatus === 'on_the_way' ? (
            <View style={styles.notice} accessibilityLiveRegion="polite">
              <Text variant="small" style={styles.noticeText}>
                {t('job.onTheWay', { name: b.guestName, eta: b.etaMinutes ?? '' })}
              </Text>
            </View>
          ) : null}
          <AddressCard b={b} />
          {b.address.unlocked ? (
            <Pressable
              accessibilityRole="link"
              onPress={() => openMaps(b)}
              style={({ pressed }) => [styles.maps, pressed && styles.pressed]}
            >
              <Icon name="pin" size={18} />
              <Text variant="small" weight="bold">
                {t('job.openMaps')}
              </Text>
            </Pressable>
          ) : null}
        </>
      )}
    </JobScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.color.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.color.borderSoft,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 6,
  },
  small: { fontSize: 12 },
  maps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: theme.color.surface,
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  pressed: { opacity: 0.85 },
  notice: { backgroundColor: theme.color.successSoft, borderRadius: 12, padding: 12 },
  noticeText: { color: '#1E4D2E' },
  chips: { flexDirection: 'row', gap: 8 },
  go: { backgroundColor: theme.color.success },
});
