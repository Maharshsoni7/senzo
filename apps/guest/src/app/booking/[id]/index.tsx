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

        {stepIndex(stage) >= 0 ? <Progress stage={stage} /> : null}

        <View style={styles.hero}>
          <ChefFig
            look={lookFor(b.chef.id)}
            initials={initialsOf(b.chef.displayName)}
            width={144}
          />
          <View style={styles.shadow} />
        </View>

        <View style={styles.status}>
          <Text
            variant="titleLarge"
            accessibilityRole="header"
            accessibilityLiveRegion="polite"
            style={styles.center}
          >
            {t(`booking.title.${stage}`, args)}
          </Text>
          <Text tone="secondary" style={styles.center}>
            {t(`booking.sub.${stage}`, args)}
          </Text>
          {b.otp ? (
            <View
              style={styles.otp}
              accessible
              accessibilityLabel={t('booking.otpA11y', { code: b.otp.code.split('').join(' ') })}
            >
              <Text variant="label" tone="muted">
                {t(b.otp.kind === 'start' ? 'booking.startOtp' : 'booking.finishOtp')}
              </Text>
              <Text variant="mono" weight="semibold" style={styles.otpCode}>
                {b.otp.code}
              </Text>
            </View>
          ) : null}
          {b.otp?.kind === 'finish' ? (
            <View style={styles.warn}>
              <Text variant="small" weight="bold" style={styles.warnText}>
                {t('booking.dontShare')}
              </Text>
            </View>
          ) : null}
        </View>

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
  screen: { flex: 1, backgroundColor: theme.color.backgroundKitchen },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  skeleton: { gap: 12, padding: 20 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  spacer: { width: theme.size.buttonHeight },
  steps: { flexDirection: 'row', gap: 6, paddingHorizontal: 4 },
  step: { flex: 1, gap: 6 },
  bar: { height: 5, borderRadius: 9, backgroundColor: theme.color.borderCool },
  barOn: { backgroundColor: theme.color.success },
  hero: { alignItems: 'center', marginTop: 8 },
  shadow: {
    width: 160,
    height: 20,
    borderRadius: 80,
    backgroundColor: 'rgba(0,0,0,0.12)',
    marginTop: -14,
  },
  status: { alignItems: 'center', gap: 10 },
  center: { textAlign: 'center' },
  otp: {
    backgroundColor: theme.color.surfaceTicket,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: theme.color.textMuted,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  otpCode: { fontSize: 34, lineHeight: 42, letterSpacing: 10, paddingLeft: 10 },
  warn: {
    backgroundColor: theme.color.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 14,
    minHeight: 40,
    justifyContent: 'center',
  },
  warnText: { color: theme.color.primaryOnSoft },
  card: { gap: 8 },
  items: { gap: 2, marginTop: 4 },
  line: { flexDirection: 'row', justifyContent: 'space-between' },
});
