import { theme } from '@senzo/ui';
import { StyleSheet } from 'react-native';

/** C11 is a dark screen; the shared kit is light-first. */
export const darkAuth = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.color.dark, paddingHorizontal: 24 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    minHeight: 56,
    borderRadius: theme.radius.input,
    borderWidth: 1.5,
    borderColor: '#6F757B',
    backgroundColor: '#2E3338',
    paddingHorizontal: 14,
  },
  error: { marginTop: 8, color: '#F3C9BF' },
  link: { color: '#F3C9BF' },
});
