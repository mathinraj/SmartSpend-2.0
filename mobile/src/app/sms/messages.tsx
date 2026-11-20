import { router } from 'expo-router';

import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { listSmsLog, type SmsMessage } from '@/db/sms';
import { useDbQuery } from '@/hooks/use-db-query';
import { useSettings } from '@/hooks/use-settings';
import { showDialog } from '@/lib/dialog';
import { formatCurrency, formatShortDate } from '@/lib/format';

const REASONS: Record<string, string> = {
  promotion: 'promotion',
  'not-financial': 'not from a bank',
  otp: 'OTP',
  scam: 'looks like a scam',
  request: 'payment request',
  failed: 'failed payment',
  'future-debit': 'upcoming debit',
  'mandate-setup': 'AutoPay set up',
  blocked: 'amount blocked',
  statement: 'statement or bill',
  offer: 'offer',
  balance: 'balance only',
  'not-transaction': 'not a transaction',
  'ignored-sender': 'sender ignored',
};

function statusText(m: SmsMessage): string {
  switch (m.status) {
    case 'added':
      return 'Added';
    case 'auto_added':
      return 'Added automatically';
    case 'pending':
      return m.result === 'unparsed' ? "Couldn't read · waiting" : 'Waiting for review';
    case 'dismissed':
      return 'Dismissed';
    case 'duplicate':
      return 'Same as another message';
    case 'ignored':
      return `Ignored: ${REASONS[m.reason ?? ''] ?? m.reason ?? 'not a transaction'}`;
  }
}

/** Every bank message SpendTrak read, and what it did with it. */
export default function SmsMessagesScreen() {
  const settings = useSettings();
  const log = useDbQuery(listSmsLog, ['sms_messages']);
  if (!settings || !log) return null;

  if (log.length === 0) {
    return (
      <Screen variant="stack">
        <EmptyState emoji="📭" title="No messages yet" message="Bank messages SpendTrak reads will be listed here, with what it did with each one." />
      </Screen>
    );
  }

  function open(m: SmsMessage) {
    const parts = [
      statusText(m),
      m.parsed ? `${formatCurrency(m.parsed.amountMinor / 100, settings!.currency)} · ${m.parsed.merchant ?? m.parsed.kind}` : null,
      m.body ?? (m.smsId !== null ? 'The text is no longer kept here, but it can still be read from your inbox to report it.' : null),
    ].filter(Boolean);
    showDialog(m.senderCode ?? m.sender, parts.join('\n\n'), [
      { text: 'Close', style: 'cancel' },
      { text: 'Report a problem', onPress: () => router.push({ pathname: '/sms/report', params: { id: m.id } }) },
    ]);
  }

  return (
    <Screen variant="stack">
      <Text variant="caption" tone="secondary">
        The last {log.length} bank messages. Tap one if SpendTrak got it wrong.
      </Text>
      <Card flush>
        {log.map((m, i) => (
          <ListRow
            key={m.id}
            divider={i > 0}
            title={m.parsed ? `${formatCurrency(m.parsed.amountMinor / 100, settings.currency)} · ${m.parsed.merchant ?? m.parsed.institution ?? m.senderCode}` : (m.senderCode ?? m.sender)}
            subtitle={`${statusText(m)} · ${m.senderCode ?? m.sender} · ${formatShortDate(dateKey(m.receivedAt))}`}
            onPress={() => open(m)}
          />
        ))}
      </Card>
    </Screen>
  );
}

function dateKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}