import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { FormScreen } from '@/components/ui/form-screen';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { getSmsMessage } from '@/db/sms';
import { useDbQuery } from '@/hooks/use-db-query';
import { showDialog } from '@/lib/dialog';
import { feedbackAvailable, sendFeedback } from '@/lib/feedback';
import { SmsReader } from '@/lib/sms/native';
import { SMS_PARSER_VERSION } from '@/lib/sms/parser';
import { redactSms } from '@/lib/sms/redact';

/** "Report a message we got wrong": a redacted copy, shown and editable before anything is sent. */
export default function SmsReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const message = useDbQuery(getSmsMessage, [], id);
  const [text, setText] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!message) return;
    let active = true;
    // The text isn't kept for ignored or handled messages; read it from the inbox again.
    const load = message.body ? Promise.resolve(message.body) : message.smsId !== null && SmsReader ? SmsReader.readMessage(message.smsId) : Promise.resolve(null);
    load
      .catch(() => null)
      .then((body) => {
        if (active) setText(body ? redactSms(body) : '');
      });
    return () => {
      active = false;
    };
  }, [message]);

  if (message === undefined || text === null) return null;

  if (!feedbackAvailable) {
    return (
      <Screen variant="stack">
        <EmptyState emoji="✉️" title="Reporting isn't set up" message="This build doesn't include the keys needed to send reports." />
      </Screen>
    );
  }
  if (!message || text === '') {
    return (
      <Screen variant="stack">
        <EmptyState emoji="📭" title="Message not available" message="The message is no longer on this phone, so it can't be reported." />
      </Screen>
    );
  }

  const outcome = message.parsed
    ? `Read as: ${message.parsed.kind}, ${(message.parsed.amountMinor / 100).toFixed(2)}, merchant ${message.parsed.merchant ?? '-'}, account ${message.parsed.accountHint ? 'yes' : 'no'}`
    : `Result: ${message.result}${message.reason ? ` (${message.reason})` : ''}`;
  const problem = !text.trim() ? 'The message is empty' : !note.trim() ? 'Say what went wrong' : null;

  async function send() {
    if (problem || sending) return;
    setSending(true);
    try {
      const report = [
        'SMS format report',
        `Sender: ${message!.senderCode ?? 'unknown'}`,
        outcome,
        `Parser version: ${SMS_PARSER_VERSION}`,
        `What went wrong: ${note.trim()}`,
        '',
        text!.trim(),
      ].join('\n');
      await sendFeedback('bug', report, '');
      showDialog('Thank you!', 'The report was sent. Fixes come with app updates.');
      router.back();
    } catch (error) {
      setSending(false);
      showDialog('Could not send', error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <FormScreen
      footer={<Button label={problem ?? (sending ? 'Sending…' : 'Send report')} icon={problem ? undefined : 'flag'} disabled={!!problem || sending} onPress={send} />}>
      <Card>
        <Text variant="caption" tone="secondary">
          Amounts, account numbers, references, dates, UPI IDs and payee names are replaced with placeholders like {'{amount}'}. Check the text below
          and remove anything else personal before sending. Only this text, the sender code ({message.senderCode ?? 'unknown'}) and your note are sent.
        </Text>
      </Card>
      <TextField label="Message (redacted)" value={text} onChangeText={setText} multiline style={{ minHeight: 140, textAlignVertical: 'top' }} maxLength={1000} />
      <TextField
        label="What went wrong?"
        value={note}
        onChangeText={setNote}
        placeholder="e.g. It was a refund, not a payment · wrong amount · it's not a transaction"
        multiline
        style={{ minHeight: 80, textAlignVertical: 'top' }}
        maxLength={500}
      />
    </FormScreen>
  );
}
