import { requestOtp } from '@senzo/api-client';
import { PhoneIN } from '@senzo/schemas';
import { Button, IconButton, Text, theme } from '@senzo/ui';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authErrorMessage } from '../../features/auth/errors';
import { turnstileToken } from '../../lib/api';

// G02. Google/Apple sign-in in the mockup isn't in the spec (E1 is phone OTP only).
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
        <IconButton
          icon="back"
          accessibilityLabel={t('common.back')}
          onPress={() => router.back()}
        />
        <View style={styles.head}>
          <Text variant="titleLarge" accessibilityRole="header">
            {t('login.title')}
          </Text>
          <Text variant="bodyLarge" tone="muted">
            {t('login.body')}
          </Text>
        </View>

        <Text variant="small" weight="semibold" nativeID="phoneLabel">
          {t('login.label')}
        </Text>
        <View style={[styles.field, error ? styles.fieldError : null]}>
          <Text variant="mono" style={styles.prefix}>
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
            placeholderTextColor={theme.color.textMuted}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            autoComplete="tel"
            maxLength={14}
            autoFocus
            style={styles.input}
          />
        </View>
        {error ? (
          <Text
            variant="small"
            tone="primary"
            accessibilityLiveRegion="polite"
            style={styles.error}
          >
            {error}
          </Text>
        ) : null}

        <Button
          title={t('login.send')}
          onPress={submit}
          loading={send.isPending}
          style={styles.cta}
        />
        <Text variant="small" tone="muted" style={styles.privacy}>
          {t('login.privacy')}
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.color.backgroundKitchen, paddingHorizontal: 24 },
  flex: { flex: 1, paddingTop: 12 },
  head: { marginTop: 52, marginBottom: 28, gap: 8 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    minHeight: 58,
    borderRadius: theme.radius.input,
    borderWidth: 1.5,
    borderColor: theme.color.text,
    backgroundColor: theme.color.surface,
    paddingHorizontal: 16,
  },
  fieldError: { borderColor: theme.color.primary },
  prefix: { fontSize: 17 },
  divider: { width: 1, height: 24, backgroundColor: theme.color.borderCool, marginHorizontal: 12 },
  input: { flex: 1, fontFamily: theme.fonts.monoMedium, fontSize: 17, color: theme.color.text },
  error: { marginTop: 8 },
  cta: { marginTop: 20 },
  privacy: { marginTop: 'auto', marginBottom: 12, textAlign: 'center' },
});
