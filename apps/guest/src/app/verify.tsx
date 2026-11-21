import { requestOtp, verifyOtp } from '@senzo/api-client';
import { Button, IconButton, Text, theme } from '@senzo/ui';
import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

// G03. The mockup's "New here? Tell us a little" needs /me (not built); isNewUser is kept for it.
export default function Verify() {
  const { t } = useTranslation();
  const { phone, wait } = useLocalSearchParams<{ phone: string; wait?: string }>();
  const [code, setCode] = useState('');
  const [left, setLeft] = useCountdown(Number(wait) || 30);
  const input = useRef<React.ComponentRef<typeof TextInput>>(null);

  const check = useMutation({
    mutationFn: (c: string) =>
      verifyOtp({
        phone,
        code: c,
        device: { platform: Platform.OS === 'ios' ? 'ios' : 'android', app: 'guest' },
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
    <SafeAreaView style={styles.screen}>
      <IconButton icon="back" accessibilityLabel={t('common.back')} onPress={() => router.back()} />
      <View style={styles.head}>
        <Text variant="titleLarge" accessibilityRole="header" style={styles.title}>
          {t('verify.title')}
        </Text>
        <Text variant="bodyLarge" tone="muted">
          {t('verify.sentTo', { phone: pretty(phone) })}{' '}
          <Text
            variant="bodyLarge"
            weight="semibold"
            onPress={() => router.back()}
            accessibilityRole="link"
          >
            {t('verify.change')}
          </Text>
        </Text>
      </View>

      <Pressable onPress={() => input.current?.focus()} accessible={false}>
        <View style={styles.boxes} importantForAccessibility="no-hide-descendants">
          {Array.from({ length: LENGTH }, (_, i) => (
            <View
              key={i}
              style={[
                styles.box,
                i < code.length && styles.filled,
                i === code.length && styles.current,
              ]}
            >
              <Text variant="mono" style={styles.digit}>
                {code[i] ?? ''}
              </Text>
            </View>
          ))}
        </View>
      </Pressable>
      <TextInput
        ref={input}
        value={code}
        onChangeText={onChange}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={LENGTH}
        autoFocus
        accessibilityLabel={t('verify.codeLabel')}
        style={styles.hidden}
      />

      {error ? (
        <Text
          variant="small"
          tone="primary"
          accessibilityLiveRegion="polite"
          style={styles.message}
        >
          {authErrorMessage(error, t)}
        </Text>
      ) : null}

      <View style={styles.message}>
        {left > 0 ? (
          <Text tone="muted">{t('verify.resendIn', { time: clock(left) })}</Text>
        ) : (
          <Text weight="semibold" accessibilityRole="button" onPress={() => resend.mutate()}>
            {t('verify.resend')}
          </Text>
        )}
      </View>

      <Button
        title={t('verify.submit')}
        disabled={code.length < LENGTH}
        loading={check.isPending}
        onPress={() => check.mutate(code)}
        style={styles.cta}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.color.backgroundKitchen,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  head: { marginTop: 52, marginBottom: 28, gap: 8 },
  title: { fontSize: 30, lineHeight: 34 },
  boxes: { flexDirection: 'row', gap: 8 },
  box: {
    flex: 1,
    height: 58,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: theme.color.borderCool,
    backgroundColor: theme.color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filled: { borderColor: theme.color.text },
  current: { borderColor: theme.color.primary, borderWidth: 2 },
  digit: { fontSize: 24, fontFamily: theme.fonts.monoSemibold },
  hidden: { position: 'absolute', opacity: 0, width: 1, height: 1 },
  message: { marginTop: 16 },
  cta: { marginTop: 24 },
});
