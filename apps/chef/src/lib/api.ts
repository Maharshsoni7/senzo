import { configureApiClient } from '@senzo/api-client';
import { accessToken } from './session';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://senzo-api.senzo-api.workers.dev';

configureApiClient({ baseUrl: API_URL, getAccessToken: accessToken });

/**
 * Turnstile needs a WebView widget in the native app (not built yet). The dev API uses
 * Cloudflare's always-pass test secret, so any token works there; production will not.
 */
export const turnstileToken = async () => 'dev-turnstile-token';
