import type { BookingSummary } from '@senzo/api-client';
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
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMyBookings } from '../../features/bookings/queries';
import { dayLabel, stageOf, timeLabel } from '../../features/bookings/stage';
import { useOnline } from '../../lib/useOnline';

type Row =
  | { kind: 'header'; key: string; title: string }
  | { kind: 'booking'; key: string; booking: BookingSummary; past: boolean }
  | { kind: 'empty'; key: string; title: string };

const openBooking = (id: string) => router.push({ pathname: '/booking/[id]', params: { id } });

function OtpBox({ otp }: { otp: NonNullable<BookingSummary['otp']> }) {
  const { t } = useTranslation();
  return (
    <View style={styles.otp}>
      <Text variant="label" tone="onDarkMuted">
        {t(otp.kind === 'start' ? 'booking.startOtp' : 'booking.finishOtp')}
      </Text>
      <Text variant="mono" tone="onDark" style={styles.otpCode}>
        {otp.code}
      </Text>
    </View>
  );
}

function UpcomingCard({ b }: { b: BookingSummary }) {
  const { t } = useTranslation();
  const stage = stageOf(b);
  const ended = stage === 'declined' || stage === 'cancelled';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => openBooking(b.id)}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <Card style={[styles.card, ended && styles.cardEnded]}>
        <View style={styles.row}>
          <Text variant="label" tone="muted">
            {b.code}
          </Text>
          <Text variant="label" tone={ended ? 'primary' : 'success'}>
            {t(`booking.stage.${stage}`)}
          </Text>
        </View>
        <View style={styles.row}>
          <ChefFig look={lookFor(b.chef.id)} initials={initialsOf(b.chef.displayName)} width={44} />
          <View style={styles.flex}>
            <Text weight="bold">{b.chef.displayName}</Text>
            <Text variant="small" tone="secondary">
              {t('bookings.when', {
                day: dayLabel(b.startsAt),
                time: timeLabel(b.startsAt),
                count: b.guests,
              })}
            </Text>
          </View>
        </View>
        {b.otp ? <OtpBox otp={b.otp} /> : null}
        <Text variant="small" tone={stage === 'declined' ? 'success' : 'secondary'}>
          {stage === 'declined'
            ? t('bookings.refunded', { amount: formatINR(b.totalPaise) })
            : stage === 'cancelled'
              ? t('bookings.cancelled')
              : t('bookings.paid', { amount: formatINR(b.totalPaise) })}
        </Text>
      </Card>
    </Pressable>
  );
}

function PastCard({ b }: { b: BookingSummary }) {
  const { t } = useTranslation();
  const stage = stageOf(b);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => openBooking(b.id)}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <Card style={[styles.card, styles.row]}>
        <ChefFig look={lookFor(b.chef.id)} initials={initialsOf(b.chef.displayName)} width={36} />
        <View style={styles.flex}>
          <Text weight="bold">{b.chef.displayName}</Text>
          <Text variant="small" tone="secondary">
            {stage === 'finished'
              ? t('bookings.pastLine', {
                  day: dayLabel(b.startsAt),
                  count: b.guests,
                  amount: formatINR(b.totalPaise),
                })
              : `${dayLabel(b.startsAt)} · ${t(`booking.stage.${stage}`)}`}
          </Text>
        </View>
        <Pressable
          accessibilityRole="link"
          hitSlop={12}
          onPress={() => router.push({ pathname: '/chef/[slug]', params: { slug: b.chef.slug } })}
        >
          <Text variant="small" weight="semibold" tone="primary">
            {t('bookings.bookAgain')}
          </Text>
        </Pressable>
      </Card>
    </Pressable>
  );
}

// G11. Chat, change, report and invoice open screens that aren't built yet, so the cards leave them out.
export default function Bookings() {
  const { t } = useTranslation();
  const online = useOnline();
  const upcoming = useMyBookings('upcoming');
  const past = useMyBookings('past');

  const header = (
    <View style={styles.header}>
      <IconButton icon="back" accessibilityLabel={t('common.back')} onPress={() => router.back()} />
      <Text variant="titleLarge" accessibilityRole="header" style={styles.title}>
        {t('bookings.title')}
      </Text>
    </View>
  );

  if (upcoming.isPending || past.isPending) {
    return (
      <SafeAreaView style={styles.screen}>
        {header}
        <View style={styles.skeleton}>
          <Skeleton height={160} />
          <Skeleton height={72} />
        </View>
      </SafeAreaView>
    );
  }
  if (!upcoming.data || !past.data) {
    return (
      <SafeAreaView style={styles.screen}>
        {header}
        <StateMessage
          title={t('common.error')}
          actionLabel={t('common.retry')}
          onAction={() => {
            void upcoming.refetch();
            void past.refetch();
          }}
        />
      </SafeAreaView>
    );
  }

  const coming = upcoming.data.pages.flatMap((p) => p.items);
  const done = past.data.pages.flatMap((p) => p.items);
  if (coming.length === 0 && done.length === 0) {
    return (
      <SafeAreaView style={styles.screen}>
        {header}
        <StateMessage
          title={t('bookings.emptyTitle')}
          body={t('bookings.emptyBody')}
          actionLabel={t('bookings.findChef')}
          onAction={() => router.navigate('/')}
        />
      </SafeAreaView>
    );
  }

  const rows: Row[] = [
    { kind: 'header', key: 'h-up', title: t('bookings.comingUp') },
    ...(coming.length
      ? coming.map((b): Row => ({ kind: 'booking', key: b.id, booking: b, past: false }))
      : [{ kind: 'empty' as const, key: 'e-up', title: t('bookings.nothingComing') }]),
    ...(done.length
      ? [
          { kind: 'header' as const, key: 'h-past', title: t('bookings.past') },
          ...done.map((b): Row => ({ kind: 'booking', key: b.id, booking: b, past: true })),
        ]
      : []),
  ];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {!online ? <OfflineBanner message={t('common.offline')} /> : null}
      <FlashList
        data={rows}
        keyExtractor={(r) => r.key}
        getItemType={(r) => (r.kind === 'booking' ? (r.past ? 'past' : 'upcoming') : r.kind)}
        ListHeaderComponent={header}
        contentContainerStyle={styles.list}
        onRefresh={() => {
          void upcoming.refetch();
          void past.refetch();
        }}
        refreshing={upcoming.isRefetching || past.isRefetching}
        onEndReached={() => {
          if (upcoming.hasNextPage) void upcoming.fetchNextPage();
          else if (past.hasNextPage) void past.fetchNextPage();
        }}
        renderItem={({ item }) => {
          if (item.kind === 'header') {
            return (
              <Text variant="label" tone="muted" style={styles.section}>
                {item.title}
              </Text>
            );
          }
          if (item.kind === 'empty') return <Text tone="secondary">{item.title}</Text>;
          return item.past ? <PastCard b={item.booking} /> : <UpcomingCard b={item.booking} />;
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.color.background },
  header: { gap: 16, marginBottom: 8 },
  title: { marginTop: 8 },
  skeleton: { gap: 12, paddingHorizontal: theme.spacing.screenX, marginTop: 24 },
  list: { paddingHorizontal: theme.spacing.screenX, paddingBottom: 32 },
  section: { marginTop: 20, marginBottom: 8 },
  card: { gap: 10, marginBottom: 12 },
  cardEnded: { backgroundColor: theme.color.surfaceSubtle },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  flex: { flex: 1 },
  pressed: { opacity: 0.85 },
  otp: {
    backgroundColor: theme.color.dark,
    borderRadius: theme.radius.small,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  otpCode: { fontSize: 22, letterSpacing: 6 },
});
