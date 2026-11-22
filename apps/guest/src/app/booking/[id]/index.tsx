import type { BookingDetail } from '@senzo/api-client';
import { formatINR } from '@senzo/schemas';
import {
  Card,
  ChefFig,
  IconButton,
  initialsOf,
  lookFor,
  OfflineBanner,
  Skeleton,
  StateMessage,
  Text,
  theme,
} from '@senzo/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBooking } from '../../../features/bookings/queries';
import {
  dayLabel,
  stageOf,
  STEPS,
  stepIndex,
  timeLabel,
  type Stage,
} from '../../../features/bookings/stage';
import { useOnline } from '../../../lib/useOnline';

function subtitleArgs(b: BookingDetail) {
  const arriveAt =
    b.onTheWayAt && b.etaMinutes !== null
      ? timeLabel(Date.parse(b.onTheWayAt) + b.etaMinutes * 60_000)
      : null;
  return {
    name: b.chef.displayName,
    day: dayLabel(b.startsAt),
    time: timeLabel(b.startsAt),
    arriveAt: arriveAt ?? timeLabel(b.startsAt),
    startedAt: b.startedAt ? timeLabel(b.startedAt) : '',
    amount: formatINR(b.totalPaise),
  };
}

function Progress({ stage }: { stage: Stage }) {
  const { t } = useTranslation();
  const at = stepIndex(stage);
  return (
    <View style={styles.steps} accessibilityRole="progressbar">
      {STEPS.map((step, i) => (
        <View key={step} style={styles.step}>
          <View style={[styles.bar, i <= at && styles.barOn]} />
          <Text variant="label" tone={i <= at ? 'default' : 'muted'}>
            {t(`booking.stage.${step}`)}
          </Text>
        </View>
      ))}
    </View>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.line}>
      <Text tone={strong ? 'default' : 'secondary'} weight={strong ? 'bold' : undefined}>
        {label}
      </Text>
      <Text variant="mono" weight={strong ? 'semibold' : undefined}>
        {value}
      </Text>
    </View>
  );
}

// G12. Report (G19), chat, calls and rate & tip (G13) aren't built yet.
export default function LiveBooking() {
  const { t } = useTranslation();
  const online = useOnline();
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useBooking(id);
  const b = query.data;

  const back = (
    <IconButton icon="back" accessibilityLabel={t('common.back')} onPress={() => router.back()} />
  );

  if (query.isPending) {
    return (
      <SafeAreaView style={styles.screen}>
        {back}
        <View style={styles.skeleton}>
          <Skeleton width="50%" />
          <Skeleton height={220} />
          <Skeleton height={140} />
        </View>
      </SafeAreaView>
    );
  }
  if (!b) {
    return (
      <SafeAreaView style={styles.screen}>
        {back}
        <StateMessage
          title={t('common.error')}
          actionLabel={t('common.retry')}
          onAction={() => void query.refetch()}
        />
      </SafeAreaView>
    );
  }

  const stage = stageOf(b);
  const args = subtitleArgs(b);
  const p = b.price;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {!online ? <OfflineBanner message={t('common.offline')} /> : null}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          {back}
          <Text variant="label" tone="muted">
            {t('booking.header', { code: b.code, day: args.day })}
          </Text>
          <View style={styles.spacer} />
        </View>

        <Card style={styles.hero}>
          <ChefFig look={lookFor(b.chef.id)} initials={initialsOf(b.chef.displayName)} width={90} />
          {stepIndex(stage) >= 0 ? <Progress stage={stage} /> : null}
          <Text variant="title" accessibilityRole="header" accessibilityLiveRegion="polite">
            {t(`booking.title.${stage}`, args)}
          </Text>
          <Text tone="secondary">{t(`booking.sub.${stage}`, args)}</Text>
          {b.otp ? (
            <View
              style={styles.otp}
              accessibilityLabel={t('booking.otpA11y', { code: b.otp.code.split('').join(' ') })}
            >
              <Text variant="label" tone="onDarkMuted">
                {t(b.otp.kind === 'start' ? 'booking.startOtp' : 'booking.finishOtp')}
              </Text>
              <Text variant="mono" tone="onDark" style={styles.otpCode}>
                {b.otp.code}
              </Text>
            </View>
          ) : null}
          {b.otp?.kind === 'finish' ? (
            <Text variant="small" tone="warning">
              {t('booking.dontShare')}
            </Text>
          ) : null}
        </Card>

        <Card style={styles.card}>
          <Text variant="label" tone="muted">
            {t('booking.details')}
          </Text>
          <Text weight="bold">{b.menuName ?? t('booking.customMenu')}</Text>
          <Text tone="secondary">
            {t('bookings.when', { day: args.day, time: args.time, count: b.guests })}
          </Text>
          <Text tone="secondary">{b.address.area ?? b.address.line1}</Text>
          {b.items.length > 0 ? (
            <View style={styles.items}>
              {b.items.map((item) => (
                <Text key={`${item.course}-${item.dishName}`} variant="small" tone="secondary">
                  {item.course ? `${item.course} · ${item.dishName}` : item.dishName}
                </Text>
              ))}
            </View>
          ) : null}
        </Card>

        <Card style={styles.card}>
          <Text variant="label" tone="muted">
            {t('booking.payment')}
          </Text>
          <Line label={t('booking.menuTotal')} value={formatINR(p.menuTotalPaise)} />
          <Line
            label={t('booking.convenienceFee')}
            value={formatINR(p.convenienceFeePaise + p.feeGstPaise)}
          />
          {p.promoPaise > 0 ? (
            <Line label={t('booking.promo')} value={`−${formatINR(p.promoPaise)}`} />
          ) : null}
          {p.walletPaise > 0 ? (
            <Line label={t('booking.wallet')} value={`−${formatINR(p.walletPaise)}`} />
          ) : null}
          <Line label={t('booking.total')} value={formatINR(p.totalPaise)} strong />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.color.background },
  content: { padding: theme.spacing.screenX, gap: 16, paddingBottom: 40 },
  skeleton: { gap: 12, padding: theme.spacing.screenX },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  spacer: { width: theme.size.buttonHeight },
  hero: { gap: 12, alignItems: 'stretch' },
  steps: { flexDirection: 'row', gap: 8 },
  step: { flex: 1, gap: 6 },
  bar: { height: 4, borderRadius: 2, backgroundColor: theme.color.borderCool },
  barOn: { backgroundColor: theme.color.success },
  otp: {
    backgroundColor: theme.color.dark,
    borderRadius: theme.radius.small,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  otpCode: { fontSize: 36, lineHeight: 44, letterSpacing: 12 },
  card: { gap: 8 },
  items: { gap: 2, marginTop: 4 },
  line: { flexDirection: 'row', justifyContent: 'space-between' },
});
