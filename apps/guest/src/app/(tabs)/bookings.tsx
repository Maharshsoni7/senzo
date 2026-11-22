import type { BookingSummary } from '@senzo/api-client';
import { formatINR } from '@senzo/schemas';
import {
  ChefFig,
  Icon,
  IconButton,
  initialsOf,
  lookFor,
  OfflineBanner,
  Skeleton,
  StateMessage,
  Text,
  theme,
  Ticket,
  TicketRule,
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

function Avatar({ chef, size }: { chef: BookingSummary['chef']; size: number }) {
  return (
    <View style={[styles.avatar, { width: size, height: size }]}>
      <ChefFig look={lookFor(chef.id)} initials={initialsOf(chef.displayName)} width={size} bust />
    </View>
  );
}

function UpcomingCard({ b }: { b: BookingSummary }) {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => openBooking(b.id)}
      style={({ pressed }) => [styles.item, pressed && styles.pressed]}
    >
      <Ticket>
        <View style={styles.row}>
          <Text variant="label" tone="muted">
            {b.code}
          </Text>
          <Text variant="label" tone="success">
            {t(`booking.stage.${stageOf(b)}`)}
          </Text>
        </View>
        <View style={[styles.row, styles.who]}>
          <Avatar chef={b.chef} size={60} />
          <View style={styles.flex}>
            <Text variant="bodyLarge" weight="bold">
              {b.chef.displayName}
            </Text>
            <Text variant="small" tone="muted">
              {t('bookings.when', {
                day: dayLabel(b.startsAt),
                time: timeLabel(b.startsAt),
                count: b.guests,
              })}
            </Text>
          </View>
        </View>
        <TicketRule />
        <View style={styles.row}>
          {b.otp ? (
            <Text variant="mono">
              {t(b.otp.kind === 'start' ? 'booking.startOtp' : 'booking.finishOtp')}{' '}
              <Text variant="mono" weight="bold" style={styles.otpInline}>
                {b.otp.code}
              </Text>
            </Text>
          ) : (
            <View />
          )}
          <Text variant="mono" weight="semibold">
            {t('bookings.paid', { amount: formatINR(b.totalPaise) })}
          </Text>
        </View>
      </Ticket>
    </Pressable>
  );
}

/** Declined or cancelled before the slot: one compact row. */
function EndedRow({ b }: { b: BookingSummary }) {
  const { t } = useTranslation();
  const declined = stageOf(b) === 'declined';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => openBooking(b.id)}
      style={({ pressed }) => [styles.item, pressed && styles.pressed]}
    >
      <Ticket style={[styles.row, styles.compact]}>
        <View style={styles.flex}>
          <Text variant="label" tone={declined ? 'success' : 'muted'}>
            {t(`booking.stage.${declined ? 'declined' : 'cancelled'}`)}
          </Text>
          <Text weight="bold">
            {b.chef.displayName} · {dayLabel(b.startsAt)}
          </Text>
          <Text variant="small" tone="muted">
            {declined
              ? t('bookings.refunded', { amount: formatINR(b.totalPaise) })
              : t('bookings.cancelled')}
          </Text>
        </View>
        <Icon name="forward" />
      </Ticket>
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
      style={({ pressed }) => [styles.item, pressed && styles.pressed]}
    >
      <Ticket style={[styles.row, styles.compact, styles.past]}>
        <Avatar chef={b.chef} size={48} />
        <View style={styles.flex}>
          <Text weight="bold">{b.chef.displayName}</Text>
          <Text variant="small" tone="muted">
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
          <Text variant="small" weight="bold" tone="primary">
            {t('bookings.bookAgain')}
          </Text>
        </Pressable>
      </Ticket>
    </Pressable>
  );
}

function BookingRow({ b, past }: { b: BookingSummary; past: boolean }) {
  if (past) return <PastCard b={b} />;
  const stage = stageOf(b);
  return stage === 'declined' || stage === 'cancelled' ? (
    <EndedRow b={b} />
  ) : (
    <UpcomingCard b={b} />
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
      <Text variant="titleLarge" accessibilityRole="header">
        {t('bookings.title')}
      </Text>
    </View>
  );

  if (upcoming.isPending || past.isPending) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.pad}>{header}</View>
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
        <View style={styles.pad}>{header}</View>
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
        <View style={styles.pad}>{header}</View>
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
              <Text variant="label" tone="secondary" style={styles.section}>
                {item.title}
              </Text>
            );
          }
          if (item.kind === 'empty') return <Text tone="secondary">{item.title}</Text>;
          return <BookingRow b={item.booking} past={item.past} />;
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.color.backgroundKitchen },
  pad: { paddingHorizontal: 20, paddingTop: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 8 },
  skeleton: { gap: 12, paddingHorizontal: 20, marginTop: 40 },
  list: { paddingHorizontal: 20, paddingBottom: 32 },
  section: { marginTop: 40, marginBottom: 12 },
  item: { marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  who: { marginTop: 12, justifyContent: 'flex-start' },
  compact: { paddingVertical: 12 },
  past: { opacity: 0.92, shadowOpacity: 0, elevation: 0 },
  flex: { flex: 1 },
  pressed: { opacity: 0.85 },
  avatar: {
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: theme.color.primarySoft,
  },
  otpInline: { fontSize: 16, letterSpacing: 1.6 },
});
