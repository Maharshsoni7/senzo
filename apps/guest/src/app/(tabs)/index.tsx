import { formatINR } from '@senzo/schemas';
import {
  Button,
  Chip,
  Icon,
  IconButton,
  OfflineBanner,
  Skeleton,
  StateMessage,
  Text,
  theme,
} from '@senzo/ui';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineUp } from '../../features/discovery/LineUp';
import { useChefs, useDebounced } from '../../features/discovery/useChefs';
import { useOnline } from '../../lib/useOnline';

const LOGO_RATIO = 2400 / 646;

// G04. "View & book" opens the profile (G07) instead of the mockup's preview sheet.
export default function Home() {
  const { t } = useTranslation();
  const online = useOnline();
  const [q, setQ] = useState('');
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(0);
  const query = useDebounced(q.trim());
  const isJain = query.toLowerCase() === 'jain';
  const chefs = useChefs({ ...(isJain ? { rule: 'jain' } : query ? { q: query } : {}), limit: 50 });

  const items = chefs.data?.items ?? [];
  const index = Math.min(active, Math.max(0, items.length - 1));
  const current = items[index];
  const words = t('home.words', { returnObjects: true }) as string[];
  const openChef = (slug: string) => router.push({ pathname: '/chef/[slug]', params: { slug } });

  return (
    <SafeAreaView style={styles.screen}>
      {!online ? <OfflineBanner message={t('common.offline')} /> : null}
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.top}>
          <IconButton
            icon="calendar"
            accessibilityLabel={t('home.bookings')}
            onPress={() => router.push('/bookings')}
          />
          <IconButton
            icon="search"
            accessibilityLabel={t('search.label')}
            onPress={() => router.push('/search')}
          />
          <View style={styles.spacer} />
          <IconButton
            icon="user"
            accessibilityLabel={t('home.account')}
            onPress={() => router.push('/account')}
          />
        </View>

        <View style={styles.sign}>
          <Text variant="label" tone="muted">
            {t('home.kicker')}
          </Text>
          <Image
            source={require('../../../assets/images/logo.png')}
            style={styles.logo}
            contentFit="contain"
            accessibilityLabel="Senzo"
          />
        </View>

        <View style={styles.pill}>
          <Icon name="search" color={theme.color.textMuted} />
          <TextInput
            value={q}
            onChangeText={(text) => {
              setQ(text);
              setActive(0);
            }}
            onFocus={() => setFocused(true)}
            placeholder={t('home.searchPlaceholder')}
            placeholderTextColor={theme.color.textMuted}
            accessibilityLabel={t('home.searchLabel')}
            returnKeyType="search"
            style={styles.input}
          />
          {q ? (
            <Pressable
              onPress={() => setQ('')}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Clear"
            >
              <Icon name="close" color={theme.color.textMuted} />
            </Pressable>
          ) : null}
        </View>
        {focused || q ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.words}
          >
            {words.map((w) => (
              <Chip
                key={w}
                label={w}
                selected={q.toLowerCase() === w.toLowerCase()}
                onPress={() => {
                  setQ(q.toLowerCase() === w.toLowerCase() ? '' : w);
                  setActive(0);
                }}
              />
            ))}
          </ScrollView>
        ) : null}

        {chefs.isPending ? (
          <View style={styles.loading}>
            <Skeleton width={150} height={300} radius={75} />
          </View>
        ) : chefs.isError && items.length === 0 ? (
          <StateMessage
            title={t('common.error')}
            body={t('common.errorBody')}
            actionLabel={t('common.retry')}
            onAction={() => void chefs.refetch()}
          />
        ) : items.length === 0 ? (
          <StateMessage
            title={query ? t('home.empty', { q: query }) : t('home.noChefs')}
            {...(query ? { body: t('home.askChefs') } : {})}
          />
        ) : (
          <>
            <LineUp
              chefs={items}
              active={index}
              onChange={setActive}
              onOpen={(c) => openChef(c.slug)}
            />
            {current ? (
              <View style={styles.caption} accessibilityLiveRegion="polite">
                <Text variant="title">{current.displayName}</Text>
                <Text tone="secondary">
                  {t('home.caption', {
                    cuisine: current.cuisines[0] ?? current.headline ?? '',
                    price: formatINR(current.fromPricePaise),
                  })}
                  {current.ratingAvg !== null
                    ? ` · ${t('home.rating', { rating: current.ratingAvg })}`
                    : ''}
                </Text>
              </View>
            ) : null}
            <View style={styles.controls}>
              <IconButton
                icon="back"
                accessibilityLabel={t('home.prev')}
                onPress={() => setActive((index - 1 + items.length) % items.length)}
              />
              <Button
                title={t('home.viewBook')}
                style={styles.cta}
                onPress={() => current && openChef(current.slug)}
              />
              <IconButton
                icon="forward"
                accessibilityLabel={t('home.next')}
                onPress={() => setActive((index + 1) % items.length)}
              />
            </View>
            <Text variant="small" tone="muted" style={styles.counter}>
              {t('home.counter', { n: index + 1, total: items.length })}
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.color.backgroundKitchen },
  content: { paddingHorizontal: theme.spacing.screenX, paddingBottom: 32 },
  top: { flexDirection: 'row', gap: 8, paddingTop: 8 },
  spacer: { flex: 1 },
  sign: { alignItems: 'center', marginTop: 8, gap: 4 },
  logo: { width: 160, height: 160 / LOGO_RATIO },
  pill: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 50,
    paddingHorizontal: 16,
    borderRadius: theme.radius.chip,
    backgroundColor: theme.color.surface,
    borderWidth: 1,
    borderColor: theme.color.borderCool,
  },
  input: { flex: 1, fontFamily: theme.fonts.regular, fontSize: 15, color: theme.color.text },
  words: { gap: 8, paddingVertical: 10 },
  loading: { alignItems: 'center', paddingVertical: 40 },
  caption: { alignItems: 'center', gap: 2, marginTop: 8 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  cta: { flex: 1 },
  counter: { textAlign: 'center', marginTop: 10 },
});
