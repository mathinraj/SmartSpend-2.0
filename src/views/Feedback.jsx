'use client';

import { useState, useRef } from 'react';
import emailjs from '@emailjs/browser';
import { useToast } from '../components/Toast';
import './Feedback.css';

const EMAILJS_SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

const FEEDBACK_TYPES = [
  { id: 'bug', icon: 'fa-solid fa-bug', label: 'Bug Report', color: '#FF6B6B' },
  { id: 'feature', icon: 'fa-solid fa-lightbulb', label: 'Feature Request', color: '#FDCB6E' },
  { id: 'feedback', icon: 'fa-solid fa-comment-dots', label: 'General Feedback', color: '#6C5CE7' },
];

export default function Feedback() {
  const toast = useToast();
  const formRef = useRef(null);
  const [type, setType] = useState('feedback');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const configured = EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!message.trim()) return;

    if (!configured) {
      toast('EmailJS is not configured. Please add your keys to .env.local', 'error', 5000);
      return;
    }

    setSending(true);
    try {
      const result = await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          feedback_type: FEEDBACK_TYPES.find((t) => t.id === type)?.label || type,
          message: message.trim(),
          user_email: email.trim() || 'Not provided',
        },
        { publicKey: EMAILJS_PUBLIC_KEY },
      );
      if (result.status === 200) {
        setSent(true);
        toast('Thank you! Your feedback has been sent.', 'success');
      } else {
        toast('Something went wrong. Please try again.', 'error');
      }
    } catch (err) {
      console.error('EmailJS error:', err?.text || err?.message || JSON.stringify(err));
      toast(`Failed to send: ${err?.text || 'Please check your EmailJS configuration.'}`, 'error', 5000);
    }
    setSending(false);
  }

  function handleReset() {
    setType('feedback');
    setMessage('');
    setEmail('');
    setSent(false);
  }

  if (sent) {
    return (
      <div className="page">
        <h1 className="page-title">Feedback</h1>
        <div className="feedback-success">
          <div className="feedback-success-icon">
            <i className="fa-solid fa-paper-plane" />
          </div>
          <h2 className="feedback-success-title">Feedback Sent!</h2>
          <p className="feedback-success-desc">
            Thank you for taking the time to share your thoughts. Your feedback helps make SpendTraq better.
          </p>
          <button className="btn btn-primary feedback-success-btn" onClick={handleReset}>
            <i className="fa-solid fa-plus" /> Send Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">Feedback</h1>

      <p className="feedback-intro">
        Found a bug? Have a feature idea? Or just want to say something? We'd love to hear from you.
      </p>

      <form ref={formRef} onSubmit={handleSubmit} className="feedback-form">
        <div className="form-group">
          <label className="form-label">
            <i className="fa-solid fa-tag" style={{ marginRight: 6 }} />What's this about?
          </label>
          <div className="feedback-type-picker">
            {FEEDBACK_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`feedback-type-btn ${type === t.id ? 'selected' : ''}`}
                onClick={() => setType(t.id)}
                style={type === t.id ? { borderColor: t.color, background: t.color + '12' } : undefined}
              >
                <i className={t.icon} style={{ color: t.color }} />
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">
            <i className="fa-solid fa-message" style={{ marginRight: 6 }} />
            {type === 'bug' ? 'Describe the issue' : type === 'feature' ? 'Describe your idea' : 'Your message'}
          </label>
          <textarea
            className="form-input feedback-textarea"
            placeholder={
              type === 'bug'
                ? 'What happened? What did you expect to happen?'
                : type === 'feature'
                ? 'What feature would you like? How would it help you?'
                : 'Tell us what you think...'
            }
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            <i className="fa-solid fa-envelope" style={{ marginRight: 6 }} />Email (optional)
          </label>
          <input
            type="email"
            className="form-input"
            placeholder="your@email.com — only if you'd like a reply"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-full feedback-submit"
          disabled={sending || !message.trim()}
        >
          {sending ? (
            <><i className="fa-solid fa-spinner fa-spin" /> Sending...</>
          ) : (
            <><i className="fa-solid fa-paper-plane" /> Send Feedback</>
          )}
        </button>
      </form>

      {!configured && (
        <div className="feedback-setup-hint">
          <i className="fa-solid fa-circle-info" />
          <div>
            <p>To enable feedback, add these to your <code>.env.local</code>:</p>
            <code className="feedback-env-block">
              NEXT_PUBLIC_EMAILJS_SERVICE_ID=your_service_id<br />
              NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=your_template_id<br />
              NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=your_public_key
            </code>
          </div>
        </div>
      )}
    </div>
  );
}
