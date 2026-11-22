import { requestOtp } from '@senzo/api-client';
import { PhoneIN } from '@senzo/schemas';
import { Button, ChefFig, lookFor, Text, theme } from '@senzo/ui';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { darkAuth } from '../features/auth/dark';
import { authErrorMessage } from '../features/auth/errors';
import { turnstileToken } from '../lib/api';

// C11, phone step.
export default function Login() {
  const { t } = useTranslation();
  const [raw, setRaw] = useState('');
  const [touched, setTouched] = useState(false);
  const parsed = PhoneIN.safeParse(raw);

  const send = useMutation({
    mutationFn: async (phone: string) =>
      requestOtp({ phone, turnstileToken: await turnstileToken(), channel: 'sms' }),
    onSuccess: (out, phone) =>
      router.push({ pathname: '/verify', params: { phone, wait: String(out.retryAfterSec) } }),
  });

  const submit = () => {
    setTouched(true);
    if (parsed.success) send.mutate(parsed.data);
  };
  const error = send.error
    ? authErrorMessage(send.error, t)
    : touched && !parsed.success
      ? t('login.invalid')
      : null;

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.fig}>
          <ChefFig look={lookFor('chef_ananya')} initials="" width={96} bust />
        </View>
        <View style={styles.head}>
          <Text variant="label" tone="onDarkMuted" style={styles.center}>
            {t('login.kicker')}
          </Text>
          <Text variant="titleLarge" tone="onDark" accessibilityRole="header" style={styles.center}>
            {t('login.title')}
          </Text>
          <Text tone="onDarkMuted" style={styles.center}>
            {t('login.body')}
          </Text>
        </View>

        <Text variant="small" weight="semibold" tone="onDark" nativeID="phoneLabel">
          {t('login.label')}
        </Text>
        <View style={[styles.field, error ? styles.fieldError : null]}>
          <Text weight="bold" tone="onDark" style={styles.prefix}>
            +91
          </Text>
          <View style={styles.divider} />
          <TextInput
            accessibilityLabelledBy="phoneLabel"
            accessibilityLabel={t('login.label')}
            value={raw}
            onChangeText={setRaw}
            onSubmitEditing={submit}
            placeholder={t('login.placeholder')}
            placeholderTextColor={theme.color.onDarkMuted}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            autoComplete="tel"
            maxLength={14}
            autoFocus
            style={styles.input}
          />
        </View>
        {error ? (
          <Text variant="small" accessibilityLiveRegion="polite" style={styles.error}>
            {error}
          </Text>
        ) : null}

        <Button
          title={t('login.send')}
          onPress={submit}
          loading={send.isPending}
          style={styles.cta}
        />
        <Text variant="small" tone="onDarkMuted" style={styles.footer}>
          {t('login.footer')}
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  ...darkAuth,
  flex: { flex: 1, paddingTop: 24 },
  fig: { alignItems: 'center' },
  head: { marginTop: 16, marginBottom: 28, gap: 8 },
  center: { textAlign: 'center' },
  fieldError: { borderColor: '#F3C9BF' },
  prefix: { fontSize: 16 },
  divider: { width: 1, height: 24, backgroundColor: '#4A5056', marginHorizontal: 10 },
  input: {
    flex: 1,
    fontFamily: theme.fonts.medium,
    fontSize: 18,
    letterSpacing: 0.7,
    color: theme.color.onDark,
  },
  cta: { marginTop: 20 },
  footer: { marginTop: 'auto', marginBottom: 12, textAlign: 'center' },
});
