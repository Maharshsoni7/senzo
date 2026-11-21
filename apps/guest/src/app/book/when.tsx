import { ApiError, type QuoteRequest } from '@senzo/api-client';
import { formatINR } from '@senzo/schemas';
import { Button, IconButton, Skeleton, StateMessage, Text, theme } from '@senzo/ui';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDraft, type Slot } from '../../features/booking/draft';
import { useAvailability, useQuote } from '../../features/chef/queries';
import { prettyDate } from '../../features/discovery/filters';

const SLOTS: [Slot, string][] = [
  ['lunch', '12:30 PM'],
  ['dinner', '7:30 PM'],
  ['late', '9:30 PM'],
];
const WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const istMonth = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
  }).format(new Date());
const shiftMonth = (month: string, by: number) => {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};
const monthTitle = (month: string) =>
  new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${month}-01T00:00:00Z`),
  );

// G08. Checkout (G09) is payment work, built last.
export default function When() {
  const { t } = useTranslation();
  const draft = useDraft();
  const thisMonth = istMonth();
  const [month, setMonth] = useState(draft.date?.slice(0, 7) ?? thisMonth);
  const availability = useAvailability(draft.chefId, month);
  const days = availability.data?.days ?? [];
  const day = days.find((d) => d.date === draft.date);

  const request = useMemo<QuoteRequest | null>(
    () =>
      draft.menuId && draft.date && draft.slot
        ? {
            menuId: draft.menuId,
            guests: draft.guests,
            foodRule: draft.foodRule,
            options: Object.values(draft.options),
            addons: draft.addons,
            groceriesBy: draft.groceriesBy,
            kitchen: draft.kitchen,
            date: draft.date,
            slot: draft.slot,
          }
        : null,
    [draft],
  );
  const quote = useQuote(request);
  const slotGone =
    quote.error instanceof ApiError &&
    (quote.error.code === 'SLOT_TAKEN' || quote.error.code === 'SLOT_UNAVAILABLE');

  if (!draft.chefId || !draft.menuId) {
    return (
      <SafeAreaView style={styles.screen}>
        <StateMessage
          title={t('chef.noMenus')}
          actionLabel={t('common.back')}
          onAction={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  const leading = days[0] ? new Date(`${days[0].date}T00:00:00Z`).getUTCDay() : 0;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <IconButton
          icon="back"
          accessibilityLabel={t('common.back')}
          onPress={() => router.back()}
        />
        <View style={styles.flex}>
          <Text variant="title" accessibilityRole="header">
            {t('when.title')}
          </Text>
          <Text variant="small" tone="muted">
            {t('when.subtitle', { chef: draft.chefName, guests: draft.guests })}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.monthBar}>
          <IconButton
            icon="back"
            accessibilityLabel={t('when.prevMonth')}
            onPress={() => month > thisMonth && setMonth(shiftMonth(month, -1))}
          />
          <Text weight="bold" style={styles.monthTitle}>
            {monthTitle(month)}
          </Text>
          <IconButton
            icon="forward"
            accessibilityLabel={t('when.nextMonth')}
            onPress={() => setMonth(shiftMonth(month, 1))}
          />
        </View>

        <View style={styles.grid}>
          {WEEK.map((w, i) => (
            <Text key={`${w}${i}`} variant="small" tone="muted" style={styles.weekday}>
              {w}
            </Text>
          ))}
          {Array.from({ length: leading }, (_, i) => (
            <View key={`pad${i}`} style={styles.cell} />
          ))}
          {availability.isPending
            ? Array.from({ length: 30 }, (_, i) => (
                <View key={i} style={styles.cell}>
                  <Skeleton width={36} height={36} radius={18} />
                </View>
              ))
            : days.map((d) => {
                const selected = d.date === draft.date;
                return (
                  <Pressable
                    key={d.date}
                    disabled={!d.open}
                    onPress={() => draft.set({ date: d.date, slot: null })}
                    accessibilityRole="button"
                    accessibilityState={{ selected, disabled: !d.open }}
                    accessibilityLabel={t(d.open ? 'when.dayOpen' : 'when.dayOff', {
                      date: prettyDate(d.date),
                    })}
                    style={styles.cell}
                  >
                    <View
                      style={[styles.day, d.open && styles.dayOpen, selected && styles.daySelected]}
                    >
                      <Text
                        weight={d.open ? 'semibold' : undefined}
                        tone={selected ? 'onDark' : d.open ? 'default' : 'muted'}
                        style={!d.open ? styles.struck : undefined}
                      >
                        {Number(d.date.slice(8))}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
        </View>
        {availability.isError ? (
          <StateMessage
            title={t('common.error')}
            actionLabel={t('common.retry')}
            onAction={() => void availability.refetch()}
          />
        ) : null}

        <Text variant="label" tone="muted">
          {t('when.slots')}
        </Text>
        {day ? (
          <View style={styles.slots}>
            {SLOTS.map(([slot, time]) => {
              const status = day.slots[slot];
              const selected = draft.slot === slot;
              return (
                <Pressable
                  key={slot}
                  disabled={status !== 'open'}
                  onPress={() => draft.set({ slot })}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected, disabled: status !== 'open' }}
                  style={[
                    styles.slot,
                    selected && styles.slotSelected,
                    status !== 'open' && styles.slotOff,
                  ]}
                >
                  <Text weight="bold" tone={selected ? 'onDark' : 'default'}>
                    {t(`when.${slot}`)}
                  </Text>
                  <Text variant="small" tone={selected ? 'onDarkMuted' : 'muted'}>
                    {status === 'open' ? time : t(`when.${status}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <Text tone="muted">{t('when.pickDay')}</Text>
        )}
        <Text variant="small" tone="muted">
          {t('when.arrive')}
        </Text>
        {slotGone ? (
          <Text tone="primary" accessibilityLiveRegion="polite">
            {t('when.slotGone')}
          </Text>
        ) : null}
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <Button
          title={
            quote.data
              ? t('when.continue', { price: formatINR(quote.data.totalPaise) })
              : t('menu.pickDate')
          }
          disabled
        />
        <Text variant="small" tone="muted" style={styles.center}>
          {t('when.paymentsSoon')}
        </Text>
      </SafeAreaView>
    </SafeAreaView>
  );
}

const CELL = `${100 / 7}%` as const;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.color.background },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: theme.spacing.screenX },
  body: { paddingHorizontal: theme.spacing.screenX, paddingBottom: 32, gap: 14 },
  monthBar: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  monthTitle: { flex: 1, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: { width: CELL, textAlign: 'center', marginBottom: 6 },
  cell: { width: CELL, alignItems: 'center', paddingVertical: 3 },
  day: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  dayOpen: { backgroundColor: theme.color.successSoft },
  daySelected: { backgroundColor: theme.color.dark },
  struck: { textDecorationLine: 'line-through' },
  slots: { flexDirection: 'row', gap: 8 },
  slot: {
    flex: 1,
    minHeight: 64,
    borderRadius: theme.radius.small,
    borderWidth: 1,
    borderColor: theme.color.border,
    backgroundColor: theme.color.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  slotSelected: { backgroundColor: theme.color.dark, borderColor: theme.color.dark },
  slotOff: { opacity: 0.45 },
  footer: {
    paddingHorizontal: theme.spacing.screenX,
    paddingTop: 12,
    gap: 6,
    backgroundColor: theme.color.surface,
    borderTopWidth: 1,
    borderTopColor: theme.color.borderSoft,
  },
});
