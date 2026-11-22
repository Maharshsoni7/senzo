import type { PartnerBookingDetail } from '@senzo/api-client';
import { Button, Text, Ticket } from '@senzo/ui';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { foodRulesLine, jobErrorMessage, timeLabel } from '../../../features/jobs/format';
import { JobScreen, jobStyles } from '../../../features/jobs/JobScreen';
import { useMarkDone } from '../../../features/jobs/queries';

const pad = (n: number) => String(n).padStart(2, '0');

function useElapsed(since: string | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!since) return '00:00:00';
  const s = Math.max(0, Math.floor((now - Date.parse(since)) / 1000));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
}

function Cooking({ b }: { b: PartnerBookingDetail }) {
  const { t } = useTranslation();
  const elapsed = useElapsed(b.startedAt);
  const rules = foodRulesLine(b, t);
  return (
    <>
      <View style={styles.timer}>
        <Text variant="label" tone="success">
          {t('job.cookingLabel', { name: b.guestName })}
        </Text>
        <Text variant="mono" weight="semibold" style={styles.clock} accessibilityRole="timer">
          {elapsed}
        </Text>
        <Text variant="small" tone="secondary">
          {t('job.started', {
            time: b.startedAt ? timeLabel(b.startedAt) : '—',
            slot: t(`slot.${b.slot}`).toLowerCase(),
            serve: timeLabel(b.startsAt),
          })}
        </Text>
      </View>
      {rules || b.foodProfile.notes ? (
        <View style={jobStyles.allergy}>
          <Text variant="small" style={jobStyles.allergyText}>
            <Text variant="small" weight="bold" style={jobStyles.allergyText}>
              {t('job.remember')}
            </Text>{' '}
            {[rules, b.foodProfile.notes].filter(Boolean).join(' · ')}
          </Text>
        </View>
      ) : null}
      {b.items.length > 0 ? (
        <Ticket style={styles.dishes}>
          <Text variant="label" tone="muted">
            {t('job.dishes')}
          </Text>
          {b.items.map((item) => (
            <View key={`${item.course}-${item.dishName}`} style={styles.dish}>
              <Text>{item.dishName}</Text>
              {item.course ? (
                <Text variant="small" tone="muted">
                  {item.course}
                </Text>
              ) : null}
            </View>
          ))}
        </Ticket>
      ) : null}
    </>
  );
}

function MarkDone({ b }: { b: PartnerBookingDetail }) {
  const { t } = useTranslation();
  const done = useMarkDone(b.id);
  return (
    <>
      {done.error ? (
        <Text
          variant="small"
          tone="primary"
          style={jobStyles.error}
          accessibilityLiveRegion="polite"
        >
          {jobErrorMessage(done.error, t)}
        </Text>
      ) : null}
      <Button
        title={t('job.markDone')}
        loading={done.isPending}
        onPress={() =>
          done.mutate(undefined, {
            onSuccess: () => router.replace({ pathname: '/job/[id]/finish', params: { id: b.id } }),
          })
        }
      />
    </>
  );
}

// C07. The mockup's tick-off checklist is shown as the booked dishes; there's no checklist API.
export default function CookingScreen() {
  return <JobScreen footer={(b) => <MarkDone b={b} />}>{(b) => <Cooking b={b} />}</JobScreen>;
}

const styles = StyleSheet.create({
  timer: { alignItems: 'center', gap: 4, marginTop: 8 },
  clock: { fontSize: 52, lineHeight: 62 },
  dishes: { gap: 0, paddingVertical: 10 },
  dish: {
    minHeight: 48,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#D5D8DB',
  },
});
