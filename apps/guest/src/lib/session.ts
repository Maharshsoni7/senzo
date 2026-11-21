import { refreshSession, type TokenPair } from '@senzo/api-client';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

const KEY = 'senzo.session';
/** Refresh this long before the access token expires. */
const EARLY_MS = 60_000;

type SessionState = {
  status: 'loading' | 'signedOut' | 'signedIn';
  tokens: TokenPair | null;
  isNewUser: boolean;
};

export const useSession = create<SessionState>(() => ({
  status: 'loading',
  tokens: null,
  isNewUser: false,
}));

export async function hydrateSession() {
  const raw = await SecureStore.getItemAsync(KEY);
  const tokens = raw ? (JSON.parse(raw) as TokenPair) : null;
  const usable = tokens && Date.parse(tokens.refreshExpiresAt) > Date.now();
  useSession.setState({
    status: usable ? 'signedIn' : 'signedOut',
    tokens: usable ? tokens : null,
  });
}

export async function signIn(tokens: TokenPair, isNewUser: boolean) {
  await SecureStore.setItemAsync(KEY, JSON.stringify(tokens));
  useSession.setState({ status: 'signedIn', tokens, isNewUser });
}

export async function signOut() {
  await SecureStore.deleteItemAsync(KEY);
  useSession.setState({ status: 'signedOut', tokens: null, isNewUser: false });
}

let refreshing: Promise<string | null> | null = null;

/** Valid access token, refreshing once if it's about to expire; null when signed out. */
export async function accessToken(): Promise<string | null> {
  const { tokens } = useSession.getState();
  if (!tokens) return null;
  if (Date.parse(tokens.accessExpiresAt) - EARLY_MS > Date.now()) return tokens.accessToken;

  // Concurrent callers share one refresh; a second refresh with the same token would revoke everything.
  refreshing ??= (async () => {
    try {
      const next = await refreshSession({ refreshToken: tokens.refreshToken });
      await signIn(next, false);
      return next.accessToken;
    } catch {
      await signOut();
      return null;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}
