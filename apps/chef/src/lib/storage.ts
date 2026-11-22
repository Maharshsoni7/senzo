/**
 * Key-value storage for the query cache. MMKV needs a dev build; in Expo Go it can't load,
 * so we fall back to memory (no offline cache there).
 */
import type * as MMKV from 'react-native-mmkv';

export interface KeyValue {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  remove(key: string): void;
}

function memory(): KeyValue {
  const map = new Map<string, string>();
  return {
    getString: (k) => map.get(k),
    set: (k, v) => void map.set(k, v),
    remove: (k) => void map.delete(k),
  };
}

function load(): KeyValue {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createMMKV } = require('react-native-mmkv') as typeof MMKV;
    const mmkv = createMMKV({ id: 'senzo-partner' });
    return {
      getString: (k) => mmkv.getString(k),
      set: (k, v) => mmkv.set(k, v),
      remove: (k) => void mmkv.remove(k),
    };
  } catch {
    return memory();
  }
}

export const storage = load();
