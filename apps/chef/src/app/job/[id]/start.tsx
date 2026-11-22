import type { PartnerBookingDetail } from '@senzo/api-client';
import { Text } from '@senzo/ui';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { CodeEntry } from '../../../features/jobs/CodeEntry';
import { jobErrorMessage } from '../../../features/jobs/format';
import { JobScreen, jobStyles } from '../../../features/jobs/JobScreen';
import { useStart } from '../../../features/jobs/queries';

/** The one location read per job (business rules §3): foreground, at the door, never stored on the phone. */
async function readLocationOnce() {
  const { granted } = await Location.requestForegroundPermissionsAsync();
  if (!granted) return null;
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return { lat: pos.coords.latitude, lng: pos.coords.longitude };
}

function Start({ b }: { b: PartnerBookingDetail }) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [locating, setLocating] = useState(false);
  const [noLocation, setNoLocation] = useState(false);
  const start = useStart(b.id);

  const submit = async (otp: string) => {
    setNoLocation(false);
    setLocating(true);
    const at = await readLocationOnce().catch(() => null);
    setLocating(false);
    if (!at) {
      setNoLocation(true);
      return;
    }
    start.mutate(
      { otp, ...at },
      {
        onSuccess: () => router.replace({ pathname: '/job/[id]/cooking', params: { id: b.id } }),
        onError: () => setCode(''),
      },
    );
  };

  const onChange = (next: string) => {
    if (start.error) start.reset();
    setCode(next);
    if (next.length === 4) void submit(next);
  };

  const message = locating
    ? t('job.locating')
    : noLocation
      ? t('job.locationNeeded')
      : start.error
        ? jobErrorMessage(start.error, t)
        : '';

  return (
    <>
      <View style={styles.head}>
        <Text variant="titleLarge" accessibilityRole="header" style={jobStyles.center}>
          {t('job.startTitle')}
        </Text>
        <Text tone="secondary" style={jobStyles.center}>
          {t('job.startBody', { name: b.guestName })}
        </Text>
      </View>
      <CodeEntry
        value={code}
        onChange={onChange}
        state={start.error ? 'bad' : 'idle'}
        disabled={locating || start.isPending}
      />
      <Text
        variant="small"
        weight="bold"
        tone={locating ? 'secondary' : 'primary'}
        style={jobStyles.error}
        accessibilityLiveRegion="polite"
      >
        {message}
      </Text>
    </>
  );
}

// C06.
export default function StartScreen() {
  return <JobScreen>{(b) => <Start b={b} />}</JobScreen>;
}

const styles = StyleSheet.create({
  head: { marginTop: 24, gap: 6 },
});
