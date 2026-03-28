'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import './Welcome.css';

const heroHighlights = [
  { icon: '⚡', text: 'Instant setup — no sign-up needed' },
  { icon: '☁️', text: 'Sync across devices with Google Drive' },
  { icon: '📴', text: 'Works 100% offline, always' },
  { icon: '🔐', text: 'Your data never leaves your device' },
];

const features = [
  {
    icon: '📊',
    title: 'Smart Analytics',
    desc: 'Daily spend trends, savings rate, top expenses, category breakdowns, and credit card utilization — all in beautiful charts.',
  },
  {
    icon: '☁️',
    title: 'Google Drive Sync',
    desc: 'Push and pull your data to your own Google Drive. Access your finances across devices — private, encrypted, under your control.',
  },
  {
    icon: '🏦',
    title: 'All Your Accounts',
    desc: 'Bank accounts, credit cards, cash, UPI wallets — manage them all in one place with real-time balance tracking.',
  },
  {
    icon: '🤝',
    title: 'Split with Friends',
    desc: 'Track shared expenses, edit entries anytime, settle up, and keep friendships drama-free.',
  },
  {
    icon: '📅',
    title: 'Planned Payments',
    desc: 'Never miss a bill again. Track subscriptions, EMIs, and recurring expenses with smart due-date reminders.',
  },
  {
    icon: '📤',
    title: 'Export Anywhere',
    desc: 'Export your data as JSON, CSV, PDF reports, or Excel workbooks — with embedded charts and formatted tables.',
  },
  {
    icon: '🔔',
    title: 'Gentle Reminders',
    desc: 'Customizable daily or weekly nudges so logging expenses becomes second nature, not a chore.',
  },
  {
    icon: '🔒',
    title: 'Privacy First',
    desc: 'PIN or password lock, hide balances with one tap, and a profile that stays on your device. Your finances are yours alone.',
  },
];

const howItWorks = [
  { step: '1', title: 'Add your accounts', desc: 'Set up your bank, cards, cash, or wallets in seconds.' },
  { step: '2', title: 'Log as you spend', desc: 'Quick-add expenses and income — takes under 5 seconds.' },
  { step: '3', title: 'Watch the insights', desc: 'Analytics, trends, and balances update automatically.' },
  { step: '4', title: 'Sync & back up', desc: 'Push to Google Drive or export as PDF, Excel, or JSON anytime.' },
];

const whyPoints = [
  { icon: '💸', title: 'Completely Free', desc: 'No premium tier, no ads, no hidden costs. Ever.' },
  { icon: '🌐', title: 'Works Offline', desc: 'No internet? No problem. Everything runs locally in your browser.' },
  { icon: '🛡️', title: 'No Sign-up', desc: 'Open it and start tracking. No email, no password, no accounts to create.' },
  { icon: '📲', title: 'Install as App', desc: 'Add to your home screen for a native app experience — fast, fullscreen, always ready.' },
  { icon: '☁️', title: 'Sync with Drive', desc: 'Optionally back up to your Google Drive. Your data, your cloud, your choice.' },
  { icon: '📦', title: 'Export Anytime', desc: 'JSON, CSV, PDF, or Excel — your data belongs to you, in the format you want.' },
];

function Reveal({ children, delay = 0, className = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('revealed');
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`reveal ${className}`} style={delay ? { transitionDelay: `${delay}s` } : undefined}>
      {children}
    </div>
  );
}

export default function Welcome() {
  const { dispatch } = useApp();
  const landingRef = useRef(null);

  const handleGetStarted = useCallback(() => {
    dispatch({ type: 'NEXT_ONBOARD_STEP' });
  }, [dispatch]);

  return (
    <div className="landing" ref={landingRef}>
      {/* ── Hero (viewport height) ── */}
      <section className="landing-hero">
        <div className="landing-bg-shapes">
          <div className="shape shape-1" />
          <div className="shape shape-2" />
          <div className="shape shape-3" />
        </div>

        <div className="landing-hero-content">
          <div className="landing-logo-ring">
            <span className="landing-logo">🪙</span>
          </div>
          <h1 className="landing-title">SpendTrak</h1>
          <p className="landing-tagline">Your money, your rules.</p>
          <p className="landing-desc">
            The smartest way to track expenses, manage accounts, and take full control of your finances — completely free.
          </p>

          <div className="landing-highlights">
            {heroHighlights.map((h, i) => (
              <div key={i} className="landing-highlight" style={{ animationDelay: `${0.3 + i * 0.12}s` }}>
                <span>{h.icon}</span>
                <span>{h.text}</span>
              </div>
            ))}
          </div>

          <button className="landing-cta" onClick={handleGetStarted}>
            Get Started — It's Free
            <span className="cta-arrow">→</span>
          </button>

          <p className="landing-hero-note">No sign-up required. Your data stays on your device.</p>
        </div>

        <div className="landing-scroll-hint">
          <span>Scroll to explore</span>
          <i className="fa-solid fa-chevron-down landing-scroll-icon" />
        </div>
      </section>

      {/* ── Features ── */}
      <section className="landing-section landing-features-section">
        <div className="landing-section-inner">
          <Reveal><p className="landing-section-label">Features</p></Reveal>
          <Reveal delay={0.08}><h2 className="landing-section-title">Everything you need, nothing you don't</h2></Reveal>
          <Reveal delay={0.16}><p className="landing-section-subtitle">Powerful enough for serious budgeting. Simple enough for everyday use.</p></Reveal>

          <div className="landing-features-grid">
            {features.map((f, i) => (
              <Reveal key={i} delay={0.1 + i * 0.08}>
                <div className="landing-feature-card">
                  <span className="landing-feature-icon">{f.icon}</span>
                  <h3 className="landing-feature-title">{f.title}</h3>
                  <p className="landing-feature-desc">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="landing-section landing-how-section">
        <div className="landing-section-inner">
          <Reveal><p className="landing-section-label">How it works</p></Reveal>
          <Reveal delay={0.08}><h2 className="landing-section-title">Up and running in 30 seconds</h2></Reveal>

          <div className="landing-steps">
            {howItWorks.map((s, i) => (
              <Reveal key={i} delay={0.15 + i * 0.12}>
                <div className="landing-step">
                  <div className="landing-step-num">{s.step}</div>
                  <div>
                    <h3 className="landing-step-title">{s.title}</h3>
                    <p className="landing-step-desc">{s.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why SpendTrak ── */}
      <section className="landing-section landing-why-section">
        <div className="landing-section-inner">
          <Reveal><p className="landing-section-label">Why SpendTrak</p></Reveal>
          <Reveal delay={0.08}><h2 className="landing-section-title">Built different, on purpose</h2></Reveal>
          <Reveal delay={0.16}><p className="landing-section-subtitle">No servers, no subscriptions, no tracking. Just a tool that respects your money and your privacy.</p></Reveal>

          <div className="landing-why-grid">
            {whyPoints.map((w, i) => (
              <Reveal key={i} delay={0.1 + i * 0.1}>
                <div className="landing-why-card">
                  <span className="landing-why-icon">{w.icon}</span>
                  <h3 className="landing-why-title">{w.title}</h3>
                  <p className="landing-why-desc">{w.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="landing-section landing-final-section">
        <div className="landing-section-inner landing-final-inner">
          <Reveal><h2 className="landing-final-title">Ready to take control?</h2></Reveal>
          <Reveal delay={0.1}>
            <p className="landing-final-desc">
              Join thousands who track smarter, spend wiser, and save more — without giving up their privacy.
            </p>
          </Reveal>
          <Reveal delay={0.2}>
            <button className="landing-cta landing-cta-final" onClick={handleGetStarted}>
              Start Tracking Now
              <span className="cta-arrow">→</span>
            </button>
          </Reveal>
          <Reveal delay={0.28}><p className="landing-hero-note">Free forever. Works offline. No sign-up.</p></Reveal>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <Reveal>
          <p>SpendTrak — Your money, your rules.</p>
          <p className="landing-footer-sub">
            Made with 💚 by <a href="https://www.linkedin.com/in/mathinraj" target="_blank" rel="noopener noreferrer">Mathinraj</a>
          </p>
        </Reveal>
      </footer>
    </div>
  );
}
