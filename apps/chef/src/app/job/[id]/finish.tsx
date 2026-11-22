import type { PartnerBookingDetail } from '@senzo/api-client';
import { formatINR } from '@senzo/schemas';
import { Button, Icon, Text, theme, Ticket, TicketRule } from '@senzo/ui';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, View } from 'react-native';
import { jobErrorMessage } from '../../../features/jobs/format';
import { JobScreen, jobStyles } from '../../../features/jobs/JobScreen';
import { useFinish } from '../../../features/jobs/queries';

function EnterCode({ b }: { b: PartnerBookingDetail }) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const finish = useFinish(b.id);
  return (
    <>
      <Text tone="secondary" style={styles.body}>
        {t('job.finishBody', { name: b.guestName })}
      </Text>
      <Text variant="small" weight="bold" nativeID="finishLabel">
        {t('job.finishLabel')}
      </Text>
      <TextInput
        value={code}
        onChangeText={(v) => {
          if (finish.error) finish.reset();
          setCode(v.replace(/\D/g, '').slice(0, 4));
        }}
        keyboardType="number-pad"
        maxLength={4}
        placeholder="• • • •"
        placeholderTextColor={theme.color.textMuted}
        accessibilityLabelledBy="finishLabel"
        accessibilityLabel={t('job.finishLabel')}
        style={[styles.input, finish.error ? styles.inputBad : null]}
      />
      <Text variant="small" weight="bold" tone="primary" accessibilityLiveRegion="polite">
        {finish.error ? jobErrorMessage(finish.error, t) : ''}
      </Text>
      <Button
        title={t('job.finishSubmit')}
        disabled={code.length < 4}
        loading={finish.isPending}
        onPress={() => finish.mutate(code, { onError: () => setCode('') })}
      />
      <Text variant="small" tone="secondary" style={[jobStyles.center, styles.auto]}>
        {t('job.autoComplete')}
      </Text>
    </>
  );
}

function Complete({ b }: { b: PartnerBookingDetail }) {
  const { t } = useTranslation();
  return (
    <>
      <View style={styles.done}>
        <View style={styles.tick}>
          <Icon name="check" color={theme.color.primaryText} size={30} />
        </View>
        <Text variant="titleLarge" accessibilityRole="header" accessibilityLiveRegion="polite">
          {t('job.complete')}
        </Text>
        <Text tone="secondary" style={jobStyles.center}>
          {t('job.completeBody')}
        </Text>
      </View>
      <Ticket style={styles.receipt}>
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
        <TicketRule />
        <View style={jobStyles.row}>
          <Text variant="mono" weight="semibold" style={styles.total}>
            {t('job.youGet')}
          </Text>
          <Text variant="mono" weight="semibold" style={styles.total}>
            {formatINR(b.earningsPaise)}
          </Text>
        </View>
      </Ticket>
      <Button
        title={t('job.home')}
        variant="dark"
        onPress={() => router.navigate('/')}
        style={styles.home}
      />
    </>
  );
}

// C08. Payout is released 24 h after completion, not at once (screens.md, G13 gap). Tip, bank and
// "Rate guest" wait for payments and C15.
export default function FinishScreen() {
  const { t } = useTranslation();
  return (
    <JobScreen
      title={(b) =>
        b.state === 'in_progress'
          ? t('job.finishTitle')
          : t('job.header', { name: b.guestName, count: b.guests })
      }
    >
      {(b) => (b.state === 'in_progress' ? <EnterCode b={b} /> : <Complete b={b} />)}
    </JobScreen>
  );
}

const styles = StyleSheet.create({
  body: { marginTop: 24 },
  input: {
    height: 72,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: theme.color.text,
    backgroundColor: theme.color.surface,
    textAlign: 'center',
    fontFamily: theme.fonts.monoMedium,
    fontSize: 34,
    letterSpacing: 16,
    color: theme.color.text,
  },
  inputBad: { borderColor: theme.color.primary },
  auto: { marginTop: 'auto' },
  done: { alignItems: 'center', gap: 6, marginTop: 32 },
  tick: {
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: theme.color.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  receipt: { gap: 8, padding: 18 },
  total: { fontSize: 20 },
  home: { marginTop: 'auto' },
});
