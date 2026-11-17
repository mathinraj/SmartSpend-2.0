import { router } from 'expo-router';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Chip, ChipGroup } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { FormScreen } from '@/components/ui/form-screen';
import { Screen } from '@/components/ui/screen';
import { Field, TextField } from '@/components/ui/text-field';
import { showDialog } from '@/lib/dialog';
import { FEEDBACK_TYPES, feedbackAvailable, sendFeedback, type FeedbackType } from '@/lib/feedback';

const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export default function FeedbackScreen() {
  const [type, setType] = useState<FeedbackType>('feedback');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);

  if (!feedbackAvailable) {
    return (
      <Screen variant="stack">
        <EmptyState emoji="✉️" title="Feedback isn't set up" message="This build doesn't include the EmailJS keys needed to send feedback." />
      </Screen>
    );
  }

  const problem = !message.trim()
    ? 'Write your message'
    : email.trim() && !EMAIL_RE.test(email.trim())
      ? 'Check your email address'
      : null;

  async function send() {
    if (problem || sending) return;
    setSending(true);
    try {
      await sendFeedback(type, message.trim(), email.trim());
      showDialog('Thank you!', 'Your feedback has been sent.');
      router.back();
    } catch (error) {
      setSending(false);
      showDialog('Could not send', error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <FormScreen
      footer={
        <Button
          label={problem ?? (sending ? 'Sending…' : 'Send feedback')}
          icon={problem ? undefined : 'check'}
          disabled={!!problem || sending}
          onPress={send}
        />
      }>
      <Field label="What's this about?">
        <ChipGroup>
          {FEEDBACK_TYPES.map((t) => (
            <Chip key={t.value} label={t.label} emoji={t.emoji} selected={t.value === type} onPress={() => setType(t.value)} />
          ))}
        </ChipGroup>
      </Field>
      <TextField
        label="Message"
        value={message}
        onChangeText={setMessage}
        placeholder={type === 'bug' ? 'What happened, and what did you expect?' : 'Tell us what you think'}
        multiline
        style={{ minHeight: 140, textAlignVertical: 'top' }}
        maxLength={2000}
        autoFocus
      />
      <TextField
        label="Your email"
        hint="Optional, if you'd like a reply. Your financial data is never sent."
        value={email}
        onChangeText={setEmail}
        placeholder="name@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />
    </FormScreen>
  );
}
