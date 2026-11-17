import Constants from 'expo-constants';

const SERVICE_ID = process.env.EXPO_PUBLIC_EMAILJS_SERVICE_ID ?? '';
const TEMPLATE_ID = process.env.EXPO_PUBLIC_EMAILJS_TEMPLATE_ID ?? '';
const PUBLIC_KEY = process.env.EXPO_PUBLIC_EMAILJS_PUBLIC_KEY ?? '';

/** False when the EmailJS keys aren't configured; the feedback screen explains that instead of sending. */
export const feedbackAvailable = SERVICE_ID !== '' && TEMPLATE_ID !== '' && PUBLIC_KEY !== '';

export type FeedbackType = 'bug' | 'feature' | 'feedback';

export const FEEDBACK_TYPES: { value: FeedbackType; label: string; emoji: string }[] = [
  { value: 'bug', label: 'Bug report', emoji: '🐞' },
  { value: 'feature', label: 'Feature request', emoji: '💡' },
  { value: 'feedback', label: 'General feedback', emoji: '💬' },
];

export class FeedbackError extends Error {}

/** Sends through the same EmailJS service and template as the web app. */
export async function sendFeedback(type: FeedbackType, message: string, email: string) {
  const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: SERVICE_ID,
      template_id: TEMPLATE_ID,
      user_id: PUBLIC_KEY,
      template_params: {
        feedback_type: FEEDBACK_TYPES.find((t) => t.value === type)?.label ?? type,
        message: `${message}\n\nSent from SpendTrak for Android v${Constants.expoConfig?.version ?? '?'}`,
        user_email: email || 'Not provided',
      },
    }),
  });
  if (res.ok) return;
  const detail = (await res.text()).trim();
  if (res.status === 403 && /non-browser/i.test(detail)) {
    throw new FeedbackError(
      'EmailJS blocks requests from apps by default. Turn on "Allow EmailJS API for non-browser applications" in the EmailJS dashboard (Account → Security).'
    );
  }
  throw new FeedbackError(detail || `EmailJS returned ${res.status}.`);
}
