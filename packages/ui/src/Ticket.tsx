import { StyleSheet, View, type ViewProps } from 'react-native';
import { theme } from './theme';

/** Paper ticket from the mockups: booking cards, requests, receipts. */
export function Ticket({ style, ...rest }: ViewProps) {
  return <View style={[styles.ticket, style]} {...rest} />;
}

/** The dashed tear line inside a ticket. */
export function TicketRule() {
  return <View style={styles.rule} />;
}

const styles = StyleSheet.create({
  ticket: {
    backgroundColor: theme.color.surfaceTicket,
    borderRadius: theme.radius.ticket,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  rule: {
    borderTopWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: theme.color.borderCool,
    marginVertical: 12,
  },
});
