'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '../context/AppContext';
import { hasSampleData } from '../utils/sampleData';
import { getCurrencySymbol } from '../utils/currencies';
import './Sidebar.css';

const FEEDBACK_LABELS = [
  { icon: 'fa-solid fa-comment-dots', label: 'Feedback' },
  { icon: 'fa-solid fa-lightbulb', label: 'Suggestions' },
  { icon: 'fa-solid fa-bug', label: 'Report Bug' },
];

const baseNavItems = [
  { path: '/', icon: 'fa-solid fa-house', label: 'Dashboard' },
  { path: '/add', icon: 'fa-solid fa-plus-circle', label: 'Add Transaction' },
  { path: '/transactions', icon: 'fa-solid fa-clock-rotate-left', label: 'History' },
  { path: '/planned', icon: 'fa-solid fa-calendar-check', label: 'Planned Payments', requiresPlanned: true },
  { path: '/splits', icon: 'fa-solid fa-people-arrows', label: 'Split Tracker', requiresSplit: true },
  { path: '/accounts', icon: 'fa-solid fa-wallet', label: 'Accounts' },
  { path: '/analytics', icon: 'fa-solid fa-chart-pie', label: 'Analytics' },
];

export default function Sidebar() {
  const { state, dispatch } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const sampleLoaded = hasSampleData(state.accounts);

  const feedbackLabel = useMemo(() => {
    const idx = Math.floor(Date.now() / 86400000) % FEEDBACK_LABELS.length;
    return FEEDBACK_LABELS[idx];
  }, []);

  function handleRemoveSample() {
    if (window.confirm('Remove all sample data? Your own data will be kept.')) {
      dispatch({ type: 'REMOVE_SAMPLE_DATA' });
    }
  }

  function isActive(path) {
    if (path === '/') return pathname === '/';
    return pathname === path;
  }

  function handleNav(e, path) {
    e.preventDefault();
    if (path === pathname) return;
    if (path === '/' || pathname === '/') {
      router.push(path);
    } else {
      router.replace(path);
    }
  }

  return (
    <aside className="sidebar">
      <Link href="/" className="sidebar-brand">
        <span className="sidebar-logo">{getCurrencySymbol(state.settings.currency)}</span>
        <h2 className="sidebar-title">SpendTrak</h2>
      </Link>

      <nav className="sidebar-nav">
        {baseNavItems.filter((item) => {
          if (item.requiresSplit && !state.settings.splitEnabled) return false;
          if (item.requiresPlanned && !state.settings.plannedEnabled) return false;
          return true;
        }).map((item) => (
          <a
            key={item.path}
            href={item.path}
            className={`sidebar-link ${isActive(item.path) ? 'active' : ''}`}
            onClick={(e) => handleNav(e, item.path)}
          >
            <i className={`${item.icon} sidebar-link-icon`} />
            <span className="sidebar-link-label">{item.label}</span>
          </a>
        ))}
      </nav>

      {sampleLoaded && (
        <button className="sidebar-remove-sample" onClick={handleRemoveSample}>
          <i className="fa-solid fa-flask-vial" />
          <span>Remove Sample Data</span>
        </button>
      )}

      <a
        href="/feedback"
        className={`sidebar-link sidebar-prefs-link ${isActive('/feedback') ? 'active' : ''}`}
        onClick={(e) => handleNav(e, '/feedback')}
      >
        <i className={`${feedbackLabel.icon} sidebar-link-icon`} />
        <span className="sidebar-link-label">{feedbackLabel.label}</span>
      </a>

      <a
        href="/preferences"
        className={`sidebar-link sidebar-prefs-link ${isActive('/preferences') ? 'active' : ''}`}
        onClick={(e) => handleNav(e, '/preferences')}
      >
        <i className="fa-solid fa-gear sidebar-link-icon" />
        <span className="sidebar-link-label">Preferences</span>
      </a>

      <div className="sidebar-footer">
        <p className="sidebar-footer-text">SpendTrak v2.0</p>
        <p className="sidebar-footer-sub">Data stored locally</p>
        <p className="sidebar-footer-sub sidebar-footer-credit">Made by <span className="sidebar-dev-name">Mathinraj</span> 💚</p>
      </div>
    </aside>
  );
}
