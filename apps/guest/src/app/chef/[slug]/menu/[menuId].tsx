import { ApiError, type ChefMenu, type QuoteRequest } from '@senzo/api-client';
import { formatINR } from '@senzo/schemas';
import { Button, Card, Chip, IconButton, Skeleton, StateMessage, Text, theme } from '@senzo/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDraft, type FoodRule, type Kitchen } from '../../../../features/booking/draft';
import { useChefMenus, useQuote } from '../../../../features/chef/queries';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="label" tone="muted">
        {title}
      </Text>
      {children}
    </View>
  );
}

function OptionRow({
  label,
  price,
  note,
  selected,
  disabled,
  onPress,
}: {
  label: string;
  price: string;
  note?: string | null;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled: !!disabled }}
      style={[styles.option, selected && styles.optionOn, disabled && styles.optionOff]}
    >
      <View style={[styles.dot, selected && styles.dotOn]} />
      <View style={styles.flex}>
        <Text weight={selected ? 'bold' : undefined}>{label}</Text>
        {note ? (
          <Text variant="small" tone="warning">
            {note}
          </Text>
        ) : null}
      </View>
      <Text variant="small" weight="semibold" tone={price.startsWith('+') ? 'primary' : 'success'}>
        {price}
      </Text>
    </Pressable>
  );
}

// G22. Dish art and the KitchenBg header come with the illustration port.
export default function MenuDetail() {
  const { t } = useTranslation();
  const { menuId } = useLocalSearchParams<{ slug: string; menuId: string }>();
  const draft = useDraft();
  const menus = useChefMenus(draft.chefId ?? undefined);
  const menu: ChefMenu | undefined = menus.data?.items.find((m) => m.id === menuId);

  const minGuests = menu ? Math.min(...menu.bands.map((b) => b.minGuests)) : 2;
  const maxGuests = menu ? Math.max(...menu.bands.map((b) => b.maxGuests)) : 20;

  const request = useMemo<QuoteRequest | null>(
    () =>
      menu
        ? {
            menuId: menu.id,
            guests: draft.guests,
            foodRule: draft.foodRule,
            options: Object.values(draft.options),
            addons: draft.addons,
            groceriesBy: draft.groceriesBy,
            kitchen: draft.kitchen,
          }
        : null,
    [
      menu,
      draft.guests,
      draft.foodRule,
      draft.options,
      draft.addons,
      draft.groceriesBy,
      draft.kitchen,
    ],
  );
  const quote = useQuote(request);
  const q = quote.data;
  const chosen = new Set(q?.items.map((i) => i.optionId));

  if (menus.isPending) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.pad}>
          <Skeleton height={32} width="60%" />
          <Skeleton height={300} radius={16} />
        </View>
      </SafeAreaView>
    );
  }
  if (!menu) {
    return (
      <SafeAreaView style={styles.screen}>
        <IconButton
          icon="back"
          accessibilityLabel={t('common.back')}
          onPress={() => router.back()}
        />
        <StateMessage title={t('chef.noMenus')} />
      </SafeAreaView>
    );
  }

  const rules: [FoodRule, string, boolean][] = [
    ['regular', t('menu.regular'), true],
    ['jain', t('menu.jain'), menu.offersJain],
    ['no_onion_garlic', t('menu.noOnionGarlic'), menu.offersNog],
  ];
  const kitchenKeys: (keyof Kitchen)[] = ['gas', 'oven', 'mixer', 'fridge'];
  const quoteError = quote.error instanceof ApiError ? quote.error.message : null;

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
            {menu.name}
          </Text>
          <Text variant="small" tone="muted">
            {draft.chefName}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Section title={t('menu.guests')}>
          <View style={styles.stepper}>
            <IconButton
              icon="minus"
              accessibilityLabel={t('menu.fewer')}
              onPress={() => draft.set({ guests: Math.max(minGuests, draft.guests - 1) })}
            />
            <Text variant="title" style={styles.count} accessibilityLiveRegion="polite">
              {t('menu.guestsCount', { count: draft.guests })}
            </Text>
            <IconButton
              icon="plus"
              accessibilityLabel={t('menu.more')}
              onPress={() => draft.set({ guests: Math.min(maxGuests, draft.guests + 1) })}
            />
          </View>
        </Section>

        <Section title={t('menu.foodRule')}>
          <View style={styles.chips}>
            {rules
              .filter(([, , offered]) => offered)
              .map(([rule, label]) => (
                <Chip
                  key={rule}
                  label={label}
                  selected={draft.foodRule === rule}
                  onPress={() => draft.set({ foodRule: rule })}
                />
              ))}
          </View>
        </Section>

        {menu.courses.map((course) => {
          const item = q?.items.find((i) => i.course === course.name);
          return (
            <Section key={course.id} title={t('menu.chooseOne', { course: course.name })}>
              {course.options.map((o) => {
                const selected = chosen.size
                  ? chosen.has(o.id)
                  : (draft.options[course.id] ?? course.options[0]?.id) === o.id;
                const jainOff = draft.foodRule === 'jain' && o.jainFlag === 'not_jain';
                const note = jainOff
                  ? t('menu.notJain')
                  : selected && item?.servedAs
                    ? item.servedAs
                    : draft.foodRule === 'jain' && o.jainFlag === 'jain_version'
                      ? t('menu.jainVersion')
                      : null;
                return (
                  <OptionRow
                    key={o.id}
                    label={o.dishName}
                    price={
                      o.extraPaise
                        ? t('menu.extra', { price: formatINR(o.extraPaise) })
                        : t('menu.included')
                    }
                    note={note}
                    selected={selected}
                    disabled={jainOff}
                    onPress={() => draft.pickOption(course.id, o.id)}
                  />
                );
              })}
            </Section>
          );
        })}

        {menu.addons.length > 0 ? (
          <Section title={t('menu.addOns')}>
            {menu.addons.map((a) => {
              const on = draft.addons.includes(a.id);
              return (
                <Pressable
                  key={a.id}
                  onPress={() => draft.toggleAddon(a.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  style={[styles.option, on && styles.optionOn]}
                >
                  <View style={styles.flex}>
                    <Text weight="semibold">{a.name}</Text>
                    <Text variant="small" tone="muted">
                      {t('menu.addonPrice', { price: formatINR(a.pricePerGuestPaise) })}
                      {a.note ? ` · ${a.note}` : ''}
                    </Text>
                  </View>
                  <Text variant="small" weight="bold" tone={on ? 'success' : 'default'}>
                    {on ? t('menu.added') : t('menu.add')}
                  </Text>
                </Pressable>
              );
            })}
          </Section>
        ) : null}

        <Section title={t('menu.groceries')}>
          <View style={styles.chips}>
            <Chip
              label={t('menu.chefBuys')}
              selected={draft.groceriesBy === 'chef'}
              onPress={() => draft.set({ groceriesBy: 'chef' })}
            />
            {menu.grocerySavingPaise > 0 ? (
              <Chip
                label={t('menu.iBuy', { price: formatINR(menu.grocerySavingPaise) })}
                selected={draft.groceriesBy === 'guest'}
                onPress={() => draft.set({ groceriesBy: 'guest' })}
              />
            ) : null}
          </View>
        </Section>

        <Section title={t('menu.kitchen')}>
          <View style={styles.chips}>
            {kitchenKeys.map((k) => (
              <Chip
                key={k}
                label={t(`menu.${k}`)}
                selected={draft.kitchen[k]}
                onPress={() => draft.set({ kitchen: { ...draft.kitchen, [k]: !draft.kitchen[k] } })}
              />
            ))}
          </View>
        </Section>

        {q?.warnings.length ? (
          <Card style={styles.warnings} accessibilityLiveRegion="polite">
            {q.warnings.map((w) => (
              <Text key={w.code} variant="small" tone="warning">
                {w.code === 'BELOW_CHEF_MINIMUM'
                  ? t('menu.belowMin', { price: formatINR(q.minimumPaise) })
                  : w.message}
              </Text>
            ))}
          </Card>
        ) : null}
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <View style={styles.flex} accessibilityLiveRegion="polite">
          {quoteError ? (
            <Text variant="small" tone="primary">
              {quoteError}
            </Text>
          ) : q ? (
            <>
              <Text variant="mono" weight="semibold">
                {t('menu.perGuest', { price: formatINR(q.perGuestPaise) })}
              </Text>
              <Text variant="small" tone="muted">
                {quote.isFetching
                  ? t('menu.pricing')
                  : t('menu.total', { price: formatINR(q.totalPaise) })}
              </Text>
            </>
          ) : (
            <Skeleton width={120} />
          )}
        </View>
        <Button
          title={t('menu.pickDate')}
          disabled={!q?.bookable || quote.isFetching || !!quoteError}
          onPress={() => router.push('/book/when')}
        />
      </SafeAreaView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.color.background },
  flex: { flex: 1 },
  pad: { padding: theme.spacing.screenX, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: theme.spacing.screenX },
  body: { paddingHorizontal: theme.spacing.screenX, paddingBottom: 32, gap: 20 },
  section: { gap: 8 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  count: { flex: 1, textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: theme.size.touchTarget,
    padding: 12,
    borderRadius: theme.radius.small,
    borderWidth: 1,
    borderColor: theme.color.borderSoft,
    backgroundColor: theme.color.surface,
  },
  optionOn: { borderColor: theme.color.text, backgroundColor: theme.color.surfaceTicket },
  optionOff: { opacity: 0.45 },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: theme.color.borderCool,
  },
  dotOn: { borderColor: theme.color.success, backgroundColor: theme.color.success },
  warnings: {
    gap: 6,
    backgroundColor: theme.color.warningSoft,
    borderColor: theme.color.warningSoft,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: theme.spacing.screenX,
    paddingTop: 12,
    backgroundColor: theme.color.surface,
    borderTopWidth: 1,
    borderTopColor: theme.color.borderSoft,
  },
});
