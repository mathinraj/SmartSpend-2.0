'use client';

import { useApp } from '../context/AppContext';
import './Welcome.css';

const features = [
  { icon: '📊', title: 'Smart Analytics', desc: 'Visualize where your money goes' },
  { icon: '🏦', title: 'Multi-Account', desc: 'Bank, cards, cash & wallets' },
  { icon: '🔔', title: 'Reminders', desc: 'Daily or weekly expense logging nudges' },
  { icon: '🔒', title: 'Privacy Mode', desc: 'Hide balances with one toggle' },
];

export default function Welcome() {
  const { dispatch } = useApp();

  return (
    <div className="welcome-page">
      <div className="welcome-bg-shapes">
        <div className="shape shape-1" />
        <div className="shape shape-2" />
        <div className="shape shape-3" />
      </div>

      <div className="welcome-content">
        <div className="welcome-hero">
          <div className="welcome-logo-ring">
            <span className="welcome-logo">🪙</span>
          </div>
          <h1 className="welcome-title">SpendTraq</h1>
          <p className="welcome-tagline">Your money, your rules.</p>
          <p className="welcome-desc">
            The smartest way to track expenses, manage accounts, and take control of your finances.
          </p>
        </div>

        <div className="welcome-features">
          {features.map((f, i) => (
            <div key={i} className="welcome-feature" style={{ animationDelay: `${0.2 + i * 0.1}s` }}>
              <span className="welcome-feature-icon">{f.icon}</span>
              <div>
                <p className="welcome-feature-title">{f.title}</p>
                <p className="welcome-feature-desc">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          className="welcome-cta"
          onClick={() => dispatch({ type: 'NEXT_ONBOARD_STEP' })}
        >
          Get Started
          <span className="cta-arrow">→</span>
        </button>

        <p className="welcome-footer">Free & offline. Your data stays on your device.</p>
      </div>
    </div>
  );
}
