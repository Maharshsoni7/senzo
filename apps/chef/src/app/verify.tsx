import { requestOtp, verifyOtp } from '@senzo/api-client';
import { ChefFig, lookFor, Text, theme } from '@senzo/ui';
import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { darkAuth } from '../features/auth/dark';
import { authErrorMessage } from '../features/auth/errors';
import { turnstileToken } from '../lib/api';
import { signIn } from '../lib/session';

const LENGTH = 6;

/** +919825041234 → +91 98250 41234 */
const pretty = (e164: string) => `+91 ${e164.slice(3, 8)} ${e164.slice(8)}`;
const clock = (s: number) => `00:${String(s).padStart(2, '0')}`;

function useCountdown(seconds: number) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);
  return [left, setLeft] as const;
}

// C11, code step. The mockup's "set up my chef profile" choice waits for onboarding (C01).
export default function Verify() {
  const { t } = useTranslation();
  const { phone, wait } = useLocalSearchParams<{ phone: string; wait?: string }>();
  const [code, setCode] = useState('');
  const [left, setLeft] = useCountdown(Number(wait) || 30);

  const check = useMutation({
    mutationFn: (c: string) =>
      verifyOtp({
        phone,
        code: c,
        device: { platform: Platform.OS === 'ios' ? 'ios' : 'android', app: 'partner' },
      }),
    onSuccess: ({ isNewUser, roles: _roles, ...tokens }) => signIn(tokens, isNewUser),
    onError: () => setCode(''),
  });

  const resend = useMutation({
    mutationFn: async () =>
      requestOtp({ phone, turnstileToken: await turnstileToken(), channel: 'sms' }),
    onSuccess: (out) => {
      check.reset();
      setLeft(out.retryAfterSec);
    },
  });

  const onChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, LENGTH);
    setCode(digits);
    if (digits.length === LENGTH) check.mutate(digits);
  };
  const error = check.error ?? resend.error;

  return (
    <SafeAreaView style={darkAuth.screen}>
      <View style={styles.fig}>
        <ChefFig look={lookFor('chef_ananya')} initials="" width={96} bust />
      </View>
      <View style={styles.head}>
        <Text variant="titleLarge" tone="onDark" accessibilityRole="header" style={styles.center}>
          {t('verify.title')}
        </Text>
        <Text tone="onDarkMuted" style={styles.center}>
          {t('verify.sentTo', { phone: pretty(phone) })}
        </Text>
      </View>

      <TextInput
        value={code}
        onChangeText={onChange}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={LENGTH}
        autoFocus
        placeholder="• • • • • •"
        placeholderTextColor={theme.color.onDarkMuted}
        accessibilityLabel={t('verify.codeLabel')}
        editable={!check.isPending}
        style={[styles.code, code.length === LENGTH && styles.codeFull]}
      />
      {error ? (
        <Text variant="small" accessibilityLiveRegion="polite" style={darkAuth.error}>
          {authErrorMessage(error, t)}
        </Text>
      ) : null}

      <View style={styles.row}>
        {left > 0 ? (
          <Text variant="small" tone="onDarkMuted">
            {t('verify.resendIn', { time: clock(left) })}
          </Text>
        ) : (
          <Text
            variant="small"
            weight="bold"
            accessibilityRole="button"
            onPress={() => resend.mutate()}
            style={darkAuth.link}
          >
            {t('verify.resend')}
          </Text>
        )}
        <Text
          variant="small"
          weight="bold"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={darkAuth.link}
        >
          {t('verify.change')}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fig: { alignItems: 'center', marginTop: 24 },
  head: { marginTop: 16, marginBottom: 28, gap: 8 },
  center: { textAlign: 'center' },
  code: {
    height: 64,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#6F757B',
    backgroundColor: '#2E3338',
    textAlign: 'center',
    fontFamily: theme.fonts.monoMedium,
    fontSize: 28,
    letterSpacing: 14,
    color: theme.color.onDark,
  },
  codeFull: { borderColor: theme.color.success },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, minHeight: 44 },
});
