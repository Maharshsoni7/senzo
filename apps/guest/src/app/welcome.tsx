import { Button, ChefFig, Text, theme } from '@senzo/ui';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const LOGO_RATIO = 2400 / 646;
const PARTNER_APP_URL = 'senzo-partner://';

// G01. The mockup's three chefs: Rohan, Ananya (front), Meera.
const TRIO = [
  {
    skin: '#B67A4E',
    hair: '#1B1714',
    apron: '#2F6B4F',
    longHair: false,
    beard: true,
    initials: 'RK',
    width: 110,
  },
  {
    skin: '#D9A273',
    hair: '#1E1612',
    apron: '#B8361F',
    longHair: true,
    beard: false,
    initials: 'AM',
    width: 150,
  },
  {
    skin: '#9C6440',
    hair: '#120E0C',
    apron: '#2D4E86',
    longHair: true,
    beard: false,
    initials: 'MI',
    width: 110,
  },
] as const;

export default function Welcome() {
  const { t } = useTranslation();
  return (
    <SafeAreaView style={styles.screen}>
      <Text variant="label" tone="onDarkMuted" style={styles.kicker}>
        {t('welcome.kicker')}
      </Text>
      <Image
        source={require('../../assets/images/logo-on-dark.png')}
        style={styles.logo}
        contentFit="contain"
        accessibilityLabel="Senzo"
      />
      <Text variant="bodyLarge" tone="onDarkMuted" style={styles.pitch}>
        {t('welcome.pitch')}
      </Text>

      <View style={styles.trio}>
        {TRIO.map(({ initials, width, ...look }, i) => (
          <View
            key={initials}
            style={i === 1 ? styles.front : i === 0 ? styles.left : styles.right}
          >
            <ChefFig look={look} initials={initials} width={width} />
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <Button title={t('welcome.book')} onPress={() => router.push('/login')} />
        <Button
          title={t('welcome.join')}
          variant="dark"
          style={styles.join}
          onPress={() => void Linking.openURL(PARTNER_APP_URL).catch(() => {})}
        />
        <Text variant="small" tone="onDarkMuted" style={styles.legal}>
          {t('welcome.legal')}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.color.dark,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 24,
  },
  kicker: { letterSpacing: 3 },
  logo: { width: 220, height: 220 / LOGO_RATIO, marginTop: 14 },
  pitch: { marginTop: 14, fontSize: 17, lineHeight: 25 },
  trio: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center' },
  front: { zIndex: 2 },
  left: { marginRight: -30, opacity: 0.85 },
  right: { marginLeft: -30, opacity: 0.85 },
  actions: { gap: 10, marginTop: 24 },
  join: { borderWidth: 1.5, borderColor: '#6F757B' },
  legal: { textAlign: 'center', marginTop: 6 },
});
