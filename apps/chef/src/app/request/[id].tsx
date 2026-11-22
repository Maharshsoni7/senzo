import type { PartnerBookingDetail } from '@senzo/api-client';
import { formatINR } from '@senzo/schemas';
import { Button, Icon, Text, theme, Ticket, TicketRule } from '@senzo/ui';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  foodRulesLine,
  jobErrorMessage,
  timeLabel,
  timeLeft,
  dayLabel,
} from '../../features/jobs/format';
import { JobScreen, jobStyles } from '../../features/jobs/JobScreen';
import { useAccept, useDecline } from '../../features/jobs/queries';

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text variant="small" weight="bold" tone="muted">
        {label.toUpperCase()}
      </Text>
      <Text variant="small">{value}</Text>
    </View>
  );
}

function RequestTicket({ b }: { b: PartnerBookingDetail }) {
  const { t } = useTranslation();
  const rules = foodRulesLine(b, t);
  return (
    <Ticket style={styles.ticket}>
      <View style={jobStyles.row}>
        <Text variant="label" tone="muted">
          {b.code}
        </Text>
      </View>
      <View>
        <Text variant="titleLarge">
          {t('request.when', { day: dayLabel(b.startsAt), slot: t(`slot.${b.slot}`) })}
        </Text>
        <Text tone="secondary">
          {t('request.reach', { arrive: timeLabel(b.arriveBy), serve: timeLabel(b.startsAt) })}
        </Text>
      </View>
      <View style={styles.facts}>
        <Fact label={t('request.guest')} value={b.guestName} />
        <Fact label={t('request.guests')} value={t('request.guestsCount', { count: b.guests })} />
        <Fact label={t('request.area')} value={b.address.area} />
        <Fact label={t('request.menu')} value={b.menuName ?? '—'} />
      </View>
      {rules || b.foodProfile.notes ? (
        <View style={jobStyles.allergy}>
          <Text variant="small" style={jobStyles.allergyText}>
            {rules}
            {b.foodProfile.notes ? (
              <>
                {rules ? '\n' : ''}
                <Text variant="small" weight="bold" style={jobStyles.allergyText}>
                  {t('request.notes')}
                </Text>{' '}
                {b.foodProfile.notes}
              </>
            ) : null}
          </Text>
        </View>
      ) : null}
      <View>
        <TicketRule />
        <View style={jobStyles.row}>
          <Text variant="mono">{t('job.booking')}</Text>
          <Text variant="mono">{formatINR(b.menuTotalPaise)}</Text>
        </View>
        <View style={jobStyles.row}>
          <Text variant="mono" tone="muted">
            {t('job.fees')}
          </Text>
          <Text variant="mono" tone="muted">
            −{formatINR(b.feesPaise)}
          </Text>
        </View>
        <View style={jobStyles.row}>
          <Text variant="mono" weight="semibold" style={styles.earn}>
            {t('request.youEarn')}
          </Text>
          <Text variant="mono" weight="semibold" style={styles.earn}>
            {formatINR(b.earningsPaise)}
          </Text>
        </View>
      </View>
    </Ticket>
  );
}

function Decide({ b }: { b: PartnerBookingDetail }) {
  const { t } = useTranslation();
  const [ack, setAck] = useState(false);
  const accept = useAccept(b.id);
  const decline = useDecline(b.id);
  const left = b.acceptBy ? timeLeft(b.acceptBy) : null;
  const rules = foodRulesLine(b, t);
  const error = accept.error ?? decline.error;

  return (
    <>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: ack }}
        onPress={() => setAck(!ack)}
        style={[styles.ack, ack && styles.ackOn]}
      >
        <View style={[styles.box, ack && styles.boxOn]}>
          {ack ? <Icon name="check" color={theme.color.primaryText} size={14} /> : null}
        </View>
        <Text variant="small" style={styles.flex}>
          <Text variant="small" weight="bold">
            {t('request.ack')}
          </Text>
          {'\n'}
          {rules ? `${rules} · ${t('request.ackBody')}` : t('request.ackNone')}
        </Text>
      </Pressable>
      <Text variant="small" tone="secondary" style={jobStyles.center}>
        {left ? t('request.paid', { time: left }) : t('request.paidOverdue')}
      </Text>
      {error ? (
        <Text
          variant="small"
          tone="primary"
          style={jobStyles.error}
          accessibilityLiveRegion="polite"
        >
          {jobErrorMessage(error, t)}
        </Text>
      ) : null}
      <View style={styles.buttons}>
        <Button
          title={t('request.decline')}
          variant="secondary"
          onPress={() => decline.mutate(undefined)}
          loading={decline.isPending}
          disabled={accept.isPending}
          style={styles.decline}
        />
        <Button
          title={t('request.accept')}
          onPress={() => accept.mutate(undefined)}
          loading={accept.isPending}
          disabled={!ack || decline.isPending}
          style={[styles.accept, ack && styles.acceptOn]}
        />
      </View>
    </>
  );
}

function Outcome({ b }: { b: PartnerBookingDetail }) {
  const { t } = useTranslation();
  const declined = b.state === 'declined' || b.state === 'cancelled';
  return (
    <>
      <Text
        variant="bodyLarge"
        weight="extrabold"
        tone={declined ? 'primary' : 'success'}
        style={jobStyles.center}
        accessibilityLiveRegion="polite"
      >
        {t(declined ? 'request.declined' : 'request.accepted')}
      </Text>
      <Text variant="small" tone="secondary" style={jobStyles.center}>
        {t(declined ? 'request.declinedBody' : 'request.acceptedBody')}
      </Text>
      <Button title={t('request.home')} variant="dark" onPress={() => router.navigate('/')} />
    </>
  );
}

// C05. Guest rating and booking count from the mockup need guest reviews (C15).
export default function Request() {
  const { t } = useTranslation();
  return (
    <JobScreen
      title={() => t('request.title')}
      footer={(b) => (b.state === 'requested' ? <Decide b={b} /> : <Outcome b={b} />)}
    >
      {(b) => <RequestTicket b={b} />}
    </JobScreen>
  );
}

const styles = StyleSheet.create({
  ticket: { gap: 12, padding: 18 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10 },
  fact: { width: '50%', gap: 2 },
  earn: { fontSize: 16 },
  ack: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    backgroundColor: theme.color.surfaceTicket,
    borderWidth: 1.5,
    borderColor: theme.color.primary,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  ackOn: { backgroundColor: theme.color.successSoft, borderColor: theme.color.success },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.color.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.surface,
  },
  boxOn: { backgroundColor: theme.color.success, borderColor: theme.color.success },
  flex: { flex: 1 },
  buttons: { flexDirection: 'row', gap: 10 },
  decline: { flex: 1 },
  accept: { flex: 2, backgroundColor: '#9EB5A6' },
  acceptOn: { backgroundColor: theme.color.success },
});
