import type { ChefCard } from '@senzo/api-client';
import { formatINR } from '@senzo/schemas';
import {
  ChefFig,
  Chip,
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
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { activeCount, prettyDate, toParams, useFilters } from '../features/discovery/filters';
import { useChefs, useDebounced } from '../features/discovery/useChefs';
import { storage } from '../lib/storage';
import { useOnline } from '../lib/useOnline';

const RECENT_KEY = 'search.recent';
const readRecent = (): string[] => JSON.parse(storage.getString(RECENT_KEY) ?? '[]') as string[];
const remember = (q: string) =>
  storage.set(RECENT_KEY, JSON.stringify([q, ...readRecent().filter((r) => r !== q)].slice(0, 6)));

function Row({ chef, freeOn }: { chef: ChefCard; freeOn: string | null }) {
  const { t } = useTranslation();
  const meta = [
    chef.cuisines[0],
    chef.distanceKm !== null ? t('search.distance', { km: chef.distanceKm }) : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/chef/[slug]', params: { slug: chef.slug } })}
      accessibilityRole="button"
      style={styles.row}
    >
      <View style={styles.avatar}>
        <ChefFig look={lookFor(chef.id)} initials={initialsOf(chef.displayName)} width={64} bust />
      </View>
      <View style={styles.rowText}>
        <View style={styles.rowHead}>
          <Text weight="bold" style={styles.flex} numberOfLines={1}>
            {chef.displayName}
          </Text>
          {chef.ratingAvg !== null ? <Text variant="mono">★ {chef.ratingAvg}</Text> : null}
        </View>
        <Text variant="small" tone="secondary" numberOfLines={1}>
          {meta}
        </Text>
        <Text variant="small" weight="semibold">
          {t('search.fromPrice', { price: formatINR(chef.fromPricePaise) })}
        </Text>
        {freeOn ? (
          <View style={styles.free}>
            <Text variant="small" tone="success" weight="semibold">
              {t('search.free', { date: freeOn })}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

// G05. Sort is "recommended" only (API ranking); the mockup's sort menu isn't in the spec.
export default function Search() {
  const { t } = useTranslation();
  const online = useOnline();
  const filters = useFilters();
  const [q, setQ] = useState('');
  const query = useDebounced(q.trim());
  const [recent, setRecent] = useState(readRecent);
  const chefs = useChefs(toParams(filters, query || undefined));
  const items = chefs.data?.items ?? [];
  const filtersOn = activeCount(filters);
  const freeOn = filters.date && filters.meal ? prettyDate(filters.date) : null;

  const pick = (term: string) => {
    setQ(term);
    remember(term);
    setRecent(readRecent());
  };

  return (
    <SafeAreaView style={styles.screen}>
      {!online ? <OfflineBanner message={t('common.offline')} /> : null}
      <View style={styles.bar}>
        <IconButton
          icon="back"
          accessibilityLabel={t('common.back')}
          onPress={() => router.back()}
        />
        <TextInput
          value={q}
          onChangeText={setQ}
          onSubmitEditing={() => query && pick(query)}
          placeholder={t('search.placeholder')}
          placeholderTextColor={theme.color.textMuted}
          accessibilityLabel={t('search.label')}
          returnKeyType="search"
          autoFocus
          style={styles.input}
        />
        <View>
          <IconButton
            icon="filter"
            accessibilityLabel={
              filtersOn ? t('search.filtersActive', { count: filtersOn }) : t('search.filters')
            }
            onPress={() => router.push('/filters')}
          />
          {filtersOn ? (
            <View style={styles.badge} pointerEvents="none">
              <Text variant="small" style={styles.badgeText}>
                {filtersOn}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {!q && recent.length > 0 ? (
        <View style={styles.recent}>
          <Text variant="label" tone="muted">
            {t('search.recent')}
          </Text>
          <View style={styles.chips}>
            {recent.map((r) => (
              <Chip key={r} label={r} onPress={() => pick(r)} />
            ))}
          </View>
        </View>
      ) : null}

      {chefs.isPending ? (
        <View style={styles.skeletons}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={88} radius={16} />
          ))}
        </View>
      ) : chefs.isError && items.length === 0 ? (
        <StateMessage
          title={t('common.error')}
          body={t('common.errorBody')}
          actionLabel={t('common.retry')}
          onAction={() => void chefs.refetch()}
        />
      ) : (
        <FlashList
          data={items}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => <Row chef={item} freeOn={freeOn} />}
          ListHeaderComponent={
            <Text variant="small" tone="muted" style={styles.count}>
              {t('search.count', { count: items.length })}
            </Text>
          }
          ListEmptyComponent={<StateMessage title={t('search.none')} />}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.color.background },
  flex: { flex: 1 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: theme.spacing.screenX,
    paddingBottom: 8,
  },
  input: {
    flex: 1,
    minHeight: theme.size.touchTarget,
    paddingHorizontal: 16,
    borderRadius: theme.radius.chip,
    backgroundColor: theme.color.surface,
    borderWidth: 1,
    borderColor: theme.color.borderCool,
    fontFamily: theme.fonts.regular,
    fontSize: 15,
    color: theme.color.text,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.color.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: theme.color.primaryText, fontSize: 11, lineHeight: 14 },
  recent: { paddingHorizontal: theme.spacing.screenX, gap: 8, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skeletons: { padding: theme.spacing.screenX, gap: 12 },
  list: { paddingHorizontal: theme.spacing.screenX, paddingBottom: 32 },
  count: { marginVertical: 8 },
  row: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    marginBottom: 10,
    borderRadius: theme.radius.card,
    backgroundColor: theme.color.surface,
    borderWidth: 1,
    borderColor: theme.color.borderSoft,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: theme.color.surfaceSubtle,
  },
  rowText: { flex: 1, gap: 2 },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  free: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: theme.color.successSoft,
  },
});
