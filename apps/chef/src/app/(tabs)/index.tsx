import { ApiError, type PartnerBookingSummary } from '@senzo/api-client';
import { formatINR } from '@senzo/schemas';
import {
  Button,
  ChefFig,
  lookFor,
  OfflineBanner,
  Skeleton,
  StateMessage,
  Text,
  theme,
  Ticket,
  TicketRule,
} from '@senzo/ui';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { dayLabel, screenFor, timeLabel, timeLeft } from '../../features/jobs/format';
import { usePartnerBookings } from '../../features/jobs/queries';
import { signOut } from '../../lib/session';
import { useOnline } from '../../lib/useOnline';

function greeting() {
  const hour = Number(
    new Intl.DateTimeFormat('en-IN', { hour: 'numeric', hour12: false, timeZone: 'Asia/Kolkata' })
      .format(new Date())
      .replace(/\D/g, ''),
  );
  return hour < 12 ? 'home.morning' : hour < 17 ? 'home.afternoon' : 'home.evening';
}

function RequestTicket({ b }: { b: PartnerBookingSummary }) {
  const { t } = useTranslation();
  const left = b.acceptBy ? timeLeft(b.acceptBy) : null;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(screenFor(b))}
      style={({ pressed }) => [styles.item, pressed && styles.pressed]}
    >
      <Ticket style={styles.request}>
        <View style={styles.row}>
          <Text variant="label" tone="muted">
            {b.code}
          </Text>
          <Text variant="label" tone="primary">
            {left ? t('home.replyIn', { time: left }) : t('home.replyOverdue')}
          </Text>
        </View>
        <Text variant="bodyLarge" weight="bold" style={styles.gapTop}>
          {b.guestName} · {dayLabel(b.startsAt)}
        </Text>
        <Text variant="small" tone="muted">
          {t('home.requestLine', {
            slot: t(`slot.${b.slot}`),
            time: timeLabel(b.startsAt),
            count: b.guests,
            area: b.area,
          })}
        </Text>
        <TicketRule />
        <View style={styles.row}>
          <Text variant="mono">{t('home.youEarn')}</Text>
          <Text variant="mono" weight="semibold">
            {formatINR(b.earningsPaise)}
          </Text>
        </View>
      </Ticket>
    </Pressable>
  );
}

const ACTION: Record<string, string> = {
  confirmed: 'action.onMyWay',
  on_the_way: 'action.enterStart',
  in_progress: 'action.cooking',
  awaiting_finish: 'action.finish',
};

function JobCard({ b }: { b: PartnerBookingSummary }) {
  const { t } = useTranslation();
  const action = ACTION[b.subStatus ?? b.state] ?? 'action.review';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(screenFor(b))}
      style={({ pressed }) => [styles.job, styles.item, pressed && styles.pressed]}
    >
      <View style={styles.flex}>
        <Text weight="bold" tone="onDark">
          {dayLabel(b.startsAt)} · {b.guestName}
        </Text>
        <Text variant="small" tone="onDarkMuted">
          {t('home.reachBy', { time: timeLabel(b.arriveBy), area: b.area, count: b.guests })}
        </Text>
      </View>
      <Text variant="small" weight="bold" style={styles.jobAction}>
        {t(action)} →
      </Text>
    </Pressable>
  );
}

// C04. The online toggle, earnings and menu requests wait for their APIs (C09, C19, C21).
export default function Home() {
  const { t } = useTranslation();
  const online = useOnline();
  const requests = usePartnerBookings('requests');
  const upcoming = usePartnerBookings('upcoming');
  const refetch = () => {
    void requests.refetch();
    void upcoming.refetch();
  };

  const header = (
    <View style={styles.header}>
      <View style={styles.avatar}>
        <ChefFig look={lookFor('chef')} initials="" width={52} bust />
      </View>
      <View style={styles.flex}>
        <Text variant="small" tone="secondary">
          {t(greeting())}
        </Text>
        <Text variant="title" accessibilityRole="header">
          {t('home.chef')}
        </Text>
      </View>
    </View>
  );

  const notPartner = [requests.error, upcoming.error].some(
    (e) => e instanceof ApiError && e.status === 403,
  );
  if (notPartner) {
    return (
      <SafeAreaView style={styles.screen}>
        <StateMessage
          title={t('home.notPartner')}
          body={t('home.notPartnerBody')}
          actionLabel={t('common.signOut')}
          onAction={() => void signOut()}
        />
      </SafeAreaView>
    );
  }
  if (requests.isPending || upcoming.isPending) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.content}>
          {header}
          <Skeleton height={150} />
          <Skeleton height={72} />
        </View>
      </SafeAreaView>
    );
  }
  if (!requests.data || !upcoming.data) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.content}>{header}</View>
        <StateMessage
          title={t('common.error')}
          body={t('common.errorBody')}
          actionLabel={t('common.retry')}
          onAction={refetch}
        />
      </SafeAreaView>
    );
  }

  const asks = requests.data.items;
  const [next, ...later] = upcoming.data.items;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {!online ? <OfflineBanner message={t('common.offline')} /> : null}
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={requests.isRefetching || upcoming.isRefetching}
            onRefresh={refetch}
          />
        }
      >
        {header}

        {asks.length > 0 ? (
          <>
            <Text variant="label" tone="secondary" style={styles.section}>
              {t('home.newRequest', { count: asks.length })}
            </Text>
            {asks.map((b) => (
              <RequestTicket key={b.id} b={b} />
            ))}
          </>
        ) : null}

        {next ? (
          <>
            <Text variant="label" tone="secondary" style={styles.section}>
              {t('home.nextJob')}
            </Text>
            <JobCard b={next} />
          </>
        ) : null}
        {later.length > 0 ? (
          <>
            <Text variant="label" tone="secondary" style={styles.section}>
              {t('home.upcoming')}
            </Text>
            {later.map((b) => (
              <JobCard key={b.id} b={b} />
            ))}
          </>
        ) : null}

        {asks.length === 0 && !next ? (
          <StateMessage title={t('home.nothing')} body={t('home.nothingBody')} />
        ) : null}

        <Button
          title={t('common.signOut')}
          variant="secondary"
          onPress={() => void signOut()}
          style={styles.signOut}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.color.backgroundKitchen },
  content: { padding: 20, gap: 4, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: theme.color.primarySoft,
  },
  section: { marginTop: 16, marginBottom: 8 },
  item: { marginBottom: 10 },
  request: { borderLeftWidth: 3, borderLeftColor: theme.color.primary },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gapTop: { marginTop: 8 },
  job: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.color.dark,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 64,
  },
  jobAction: { color: '#9FE0B4' },
  flex: { flex: 1 },
  pressed: { opacity: 0.85 },
  signOut: { marginTop: 24 },
});
