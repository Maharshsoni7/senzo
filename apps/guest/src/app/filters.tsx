import { Button, Chip, IconButton, Text, theme } from '@senzo/ui';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CUISINES,
  dateChoices,
  GUEST_BUCKETS,
  prettyDate,
  useFilters,
  type FoodRule,
  type Meal,
} from '../features/discovery/filters';

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.group} accessibilityRole="radiogroup" accessibilityLabel={title}>
      <Text variant="label" tone="muted">
        {title}
      </Text>
      <View style={styles.chips}>{children}</View>
    </View>
  );
}

// G06. Breakfast, rating, price, "chef speaks", police-verified and vegan/eggless/non-veg
// aren't in the spec or API yet (docs/screens.md → Known gaps).
export default function Filters() {
  const { t } = useTranslation();
  const f = useFilters();
  const toggle = <T,>(current: T | null, value: T) => (current === value ? null : value);
  const dates = dateChoices();
  const dateLabel = (d: string, i: number) =>
    i === 0 ? t('filters.today') : i === 1 ? t('filters.tomorrow') : prettyDate(d);
  const meals: [Meal, string][] = [
    ['lunch', t('filters.lunch')],
    ['dinner', t('filters.dinner')],
    ['late', t('filters.late')],
  ];
  const rules: [FoodRule, string][] = [
    ['jain', t('filters.jain')],
    ['no_onion_garlic', t('filters.noOnionGarlic')],
  ];

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <View style={styles.head}>
        <Text variant="title" accessibilityRole="header">
          {t('filters.title')}
        </Text>
        <IconButton
          icon="close"
          accessibilityLabel={t('filters.close')}
          onPress={() => router.back()}
        />
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Group title={t('filters.date')}>
          {dates.map((d, i) => (
            <Chip
              key={d}
              label={dateLabel(d, i)}
              selected={f.date === d}
              onPress={() => f.set({ date: toggle(f.date, d) })}
            />
          ))}
        </Group>
        <Group title={t('filters.meal')}>
          {meals.map(([m, label]) => (
            <Chip
              key={m}
              label={label}
              selected={f.meal === m}
              onPress={() => f.set({ meal: toggle(f.meal, m) })}
            />
          ))}
        </Group>
        {f.date && !f.meal ? (
          <Text variant="small" tone="warning">
            {t('filters.dateNeedsMeal')}
          </Text>
        ) : null}
        <Group title={t('filters.guests')}>
          {GUEST_BUCKETS.map((b) => (
            <Chip
              key={b.label}
              label={b.label}
              selected={f.guests === b.guests}
              onPress={() => f.set({ guests: toggle(f.guests, b.guests) })}
            />
          ))}
        </Group>
        <Group title={t('filters.cuisine')}>
          {CUISINES.map((c) => (
            <Chip
              key={c}
              label={c}
              selected={f.cuisines.includes(c)}
              onPress={() =>
                f.set({
                  cuisines: f.cuisines.includes(c)
                    ? f.cuisines.filter((x) => x !== c)
                    : [...f.cuisines, c],
                })
              }
            />
          ))}
        </Group>
        <Group title={t('filters.foodRule')}>
          {rules.map(([r, label]) => (
            <Chip
              key={r}
              label={label}
              selected={f.rule === r}
              onPress={() => f.set({ rule: toggle(f.rule, r) })}
            />
          ))}
        </Group>
      </ScrollView>
      <View style={styles.footer}>
        <Button
          title={t('filters.clear')}
          variant="secondary"
          style={styles.flex}
          onPress={f.clear}
        />
        <Button title={t('filters.show')} style={styles.flex2} onPress={() => router.back()} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.color.background },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.screenX,
  },
  body: { paddingHorizontal: theme.spacing.screenX, gap: 20, paddingBottom: 24 },
  group: { gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: theme.spacing.screenX,
    borderTopWidth: 1,
    borderTopColor: theme.color.borderSoft,
  },
  flex: { flex: 1 },
  flex2: { flex: 2 },
});
