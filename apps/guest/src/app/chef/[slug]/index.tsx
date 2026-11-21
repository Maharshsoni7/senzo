import type { ChefMenu, ChefProfile } from '@senzo/api-client';
import { formatINR } from '@senzo/schemas';
import {
  Button,
  Card,
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
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDraft } from '../../../features/booking/draft';
import { useChefMenus, useChefProfile, useChefReviews } from '../../../features/chef/queries';
import { useOnline } from '../../../lib/useOnline';

type Tab = 'menus' | 'experience' | 'reviews';

const reviewDate = (iso: string) =>
  new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' }).format(new Date(iso));

function Pill({ label, tone = 'default' }: { label: string; tone?: 'default' | 'success' }) {
  return (
    <View style={[styles.pill, tone === 'success' && styles.pillSuccess]}>
      <Text variant="small" weight="semibold" tone={tone === 'success' ? 'success' : 'secondary'}>
        {label}
      </Text>
    </View>
  );
}

function MenuCard({ chef, menu }: { chef: ChefProfile; menu: ChefMenu }) {
  const { t } = useTranslation();
  const startMenu = useDraft((d) => d.startMenu);
  const minGuests = Math.min(...menu.bands.map((b) => b.minGuests));
  return (
    <Card style={styles.menu}>
      <Text variant="title">{menu.name}</Text>
      {menu.summary ? <Text tone="secondary">{menu.summary}</Text> : null}
      <View style={styles.bands}>
        {menu.bands.map((b) => (
          <View key={b.minGuests} style={styles.band}>
            <Text variant="small" tone="muted">
              {t('chef.guestsBand', { min: b.minGuests, max: b.maxGuests })}
            </Text>
            <Text variant="mono" weight="semibold">
              {formatINR(b.pricePerGuestPaise)}
            </Text>
          </View>
        ))}
      </View>
      <Text variant="small" tone="muted">
        {t('chef.minimum', { price: formatINR(menu.minBookingPaise) })}
      </Text>
      <Button
        title={t('chef.customise')}
        variant="dark"
        onPress={() => {
          startMenu({ id: chef.id, slug: chef.slug, name: chef.displayName }, menu.id, minGuests);
          router.push({
            pathname: '/chef/[slug]/menu/[menuId]',
            params: { slug: chef.slug, menuId: menu.id },
          });
        }}
      />
    </Card>
  );
}

// G07. Favourites and real guest photos need APIs not built yet; DishArt comes later.
export default function ChefProfileScreen() {
  const { t } = useTranslation();
  const online = useOnline();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [tab, setTab] = useState<Tab>('menus');
  const profile = useChefProfile(slug);
  const chef = profile.data;
  const menus = useChefMenus(chef?.id);
  const reviews = useChefReviews(tab === 'reviews' ? chef?.id : undefined);

  if (profile.isPending) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.skeleton}>
          <Skeleton height={240} radius={0} />
          <Skeleton width="60%" height={28} />
          <Skeleton width="40%" />
        </View>
      </SafeAreaView>
    );
  }
  if (!chef) {
    return (
      <SafeAreaView style={styles.screen}>
        <IconButton
          icon="back"
          accessibilityLabel={t('common.back')}
          onPress={() => router.back()}
        />
        <StateMessage
          title={profile.error ? t('common.error') : t('chef.notFound')}
          {...(profile.error
            ? { actionLabel: t('common.retry'), onAction: () => void profile.refetch() }
            : {})}
        />
      </SafeAreaView>
    );
  }

  const share = () =>
    void Share.share({
      message: t('chef.shareText', { name: chef.displayName, url: `senzo://chef/${chef.slug}` }),
    });
  const tabs: [Tab, string][] = [
    ['menus', t('chef.tabMenus')],
    ['experience', t('chef.tabExperience')],
    ['reviews', t('chef.tabReviews')],
  ];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {!online ? <OfflineBanner message={t('common.offline')} /> : null}
      <ScrollView>
        <View style={styles.hero}>
          <View style={styles.heroBar}>
            <IconButton
              icon="back"
              accessibilityLabel={t('common.back')}
              onPress={() => router.back()}
            />
            <IconButton icon="share" accessibilityLabel={t('chef.share')} onPress={share} />
          </View>
          <ChefFig look={lookFor(chef.id)} initials={initialsOf(chef.displayName)} width={110} />
        </View>

        <View style={styles.sheet}>
          <View style={styles.titleRow}>
            <View style={styles.flex}>
              <Text variant="titleLarge" accessibilityRole="header">
                {chef.displayName}
              </Text>
              <Text tone="secondary">
                {chef.yearsCooking
                  ? t('chef.subtitle', { headline: chef.headline ?? '', years: chef.yearsCooking })
                  : (chef.headline ?? '')}
              </Text>
            </View>
            {chef.reviews.ratingAvg !== null ? (
              <View style={styles.rating}>
                <Text variant="mono" weight="semibold">
                  ★ {chef.reviews.ratingAvg}
                </Text>
                <Text variant="small" tone="muted">
                  {t('chef.reviews', { count: chef.reviews.ratingCount })}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.pills}>
            {chef.proofs.length > 0 ? <Pill label={t('chef.verified')} tone="success" /> : null}
            {chef.foodRules.includes('jain') ? <Pill label={t('chef.jainOptions')} /> : null}
            {chef.jobsDone > 0 ? <Pill label={t('chef.cooked', { count: chef.jobsDone })} /> : null}
          </View>

          {chef.specialties.length > 0 ? (
            <>
              <Text variant="label" tone="muted" style={styles.section}>
                {t('chef.specialties')}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dishes}
              >
                {chef.specialties.map((d) => (
                  <Card key={d.name} style={styles.dish}>
                    <Text variant="label" tone="primary">
                      {d.course}
                    </Text>
                    <Text weight="bold">{d.name}</Text>
                    {d.description ? (
                      <Text variant="small" tone="secondary">
                        {d.description}
                      </Text>
                    ) : null}
                  </Card>
                ))}
              </ScrollView>
            </>
          ) : null}

          <View style={styles.tabs} accessibilityRole="tablist">
            {tabs.map(([key, label]) => (
              <Chip key={key} label={label} selected={tab === key} onPress={() => setTab(key)} />
            ))}
          </View>

          {tab === 'menus' ? (
            menus.isPending ? (
              <Skeleton height={220} radius={16} />
            ) : menus.isError ? (
              <StateMessage
                title={t('common.error')}
                actionLabel={t('common.retry')}
                onAction={() => void menus.refetch()}
              />
            ) : menus.data.items.length === 0 ? (
              <StateMessage title={t('chef.noMenus')} />
            ) : (
              <View style={styles.list}>
                {menus.data.items.map((m) => (
                  <MenuCard key={m.id} chef={chef} menu={m} />
                ))}
                <Text variant="small" tone="muted" style={styles.center}>
                  {t('chef.menusNote')}
                </Text>
              </View>
            )
          ) : null}

          {tab === 'experience' ? (
            <View style={styles.list}>
              {chef.proofs.length > 0 ? (
                <Card style={styles.block}>
                  <Text variant="label" tone="muted">
                    {t('chef.verifiedExperience')}
                  </Text>
                  {chef.proofs.map((p) => (
                    <View key={p.title}>
                      <Text weight="semibold">✓ {p.title}</Text>
                      {p.detail ? (
                        <Text variant="small" tone="secondary">
                          {p.detail}
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </Card>
              ) : null}
              <Card style={styles.block}>
                <Text variant="label" tone="muted">
                  {t('chef.cuisines')}
                </Text>
                {chef.cuisines.map((c) => (
                  <View key={c.cuisine} style={styles.cuisine}>
                    <Text style={styles.flex}>{c.cuisine}</Text>
                    <Text variant="small" tone="success" weight="semibold">
                      {t(`chef.level.${c.level}`)}
                    </Text>
                  </View>
                ))}
              </Card>
              {chef.foodRules.length > 0 ? (
                <Card style={styles.block}>
                  <Text variant="label" tone="muted">
                    {t('chef.canCookFor')}
                  </Text>
                  <View style={styles.pills}>
                    {chef.foodRules.map((r) => (
                      <Pill key={r} label={t(`chef.rule.${r}`, { defaultValue: r })} />
                    ))}
                  </View>
                </Card>
              ) : null}
              <Card style={styles.block}>
                <Text variant="label" tone="muted">
                  {t('chef.occasions')}
                </Text>
                <View style={styles.pills}>
                  {chef.occasions.map((o) => (
                    <Pill key={o} label={o} />
                  ))}
                </View>
                {chef.maxGuests ? (
                  <Text variant="small" tone="secondary">
                    {t(chef.hasHelper ? 'chef.capacityHelper' : 'chef.capacity', {
                      count: chef.maxGuests,
                    })}
                  </Text>
                ) : null}
              </Card>
            </View>
          ) : null}

          {tab === 'reviews' ? (
            reviews.isPending ? (
              <Skeleton height={120} radius={16} />
            ) : (
              <View style={styles.list}>
                {(reviews.data?.pages.flatMap((p) => p.items) ?? []).map((r) => (
                  <Card key={r.id} style={styles.block}>
                    <View style={styles.cuisine}>
                      <View style={styles.flex}>
                        <Text weight="bold">{r.author}</Text>
                        <Text variant="small" tone="muted">
                          {t('chef.reviewMeta', {
                            date: reviewDate(r.createdAt),
                            guests: r.guests,
                          })}
                        </Text>
                      </View>
                      <Text variant="mono">★ {r.stars}</Text>
                    </View>
                    {r.text ? <Text tone="secondary">{r.text}</Text> : null}
                  </Card>
                ))}
                {reviews.data?.pages[0]?.items.length === 0 ? (
                  <StateMessage title={t('chef.noReviews')} />
                ) : null}
                {reviews.hasNextPage ? (
                  <Button
                    title={t('chef.moreReviews')}
                    variant="secondary"
                    loading={reviews.isFetchingNextPage}
                    onPress={() => void reviews.fetchNextPage()}
                  />
                ) : null}
              </View>
            )
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.color.background },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  skeleton: { gap: 12, padding: theme.spacing.screenX },
  hero: { backgroundColor: theme.color.backgroundKitchen, alignItems: 'center', paddingBottom: 0 },
  heroBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    padding: theme.spacing.screenX,
  },
  sheet: {
    marginTop: -24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: theme.brand.paper,
    padding: theme.spacing.screenX,
    gap: 12,
    minHeight: 400,
  },
  titleRow: { flexDirection: 'row', gap: 12 },
  rating: { alignItems: 'flex-end' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: theme.color.surfaceSubtle,
  },
  pillSuccess: { backgroundColor: theme.color.successSoft },
  section: { marginTop: 8 },
  dishes: { gap: 10 },
  dish: { width: 200, gap: 4 },
  tabs: { flexDirection: 'row', gap: 8, marginTop: 8 },
  list: { gap: 12 },
  menu: { gap: 10 },
  bands: { flexDirection: 'row', gap: 8 },
  band: {
    flex: 1,
    padding: 10,
    borderRadius: theme.radius.small,
    backgroundColor: theme.color.surfaceSubtle,
    gap: 2,
  },
  block: { gap: 8 },
  cuisine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
