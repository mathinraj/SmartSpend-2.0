'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AppProvider, useApp } from '../context/AppContext';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { useReminder } from '../hooks/useReminder';
import { useDriveAutoSync } from '../hooks/useDriveSync';
import { getCurrencySymbol } from '../utils/currencies';
import { LOCK_KEY } from '../utils/appLock';
import { ToastProvider } from '../components/Toast';
import BottomNav from '../components/BottomNav';
import Sidebar from '../components/Sidebar';
import LockScreen from '../components/LockScreen';
import MigrationBanner from '../components/MigrationBanner';
import Welcome from '../views/Welcome';
import NameSetup from '../views/NameSetup';
import CurrencySetup from '../views/CurrencySetup';

// The install offer only appears where someone is actively tracking, not on Home, Feedback or Preferences.
const INSTALL_BANNER_PAGES = ['/add', '/transactions', '/accounts', '/analytics', '/splits', '/planned'];

function InstallBanner() {
  const { state } = useApp();
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (localStorage.getItem('spendtraq_install_dismissed')) return;

    // The root layout captures the browser's prompt (it can fire before this mounts).
    const pick = () => { if (window.__installPrompt) setDeferredPrompt(window.__installPrompt); };
    pick();
    window.addEventListener('spendtrak-installable', pick);
    return () => window.removeEventListener('spendtrak-installable', pick);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    // A prompt can only be shown once.
    window.__installPrompt = null;
    setDeferredPrompt(null);
    if (outcome !== 'accepted') localStorage.setItem('spendtraq_install_dismissed', Date.now().toString());
  }

  function handleDismiss() {
    setDismissed(true);
    localStorage.setItem('spendtraq_install_dismissed', Date.now().toString());
    setDeferredPrompt(null);
  }

  const startedTracking = state.transactions.length > 0;
  if (!deferredPrompt || dismissed || !startedTracking || !INSTALL_BANNER_PAGES.includes(pathname)) return null;

  return (
    <div className="install-banner">
      <div className="install-banner-content">
        <div className="install-banner-icon">
          <i className="fa-solid fa-download" />
        </div>
        <div className="install-banner-text">
          <p className="install-banner-title">Install SpendTrak</p>
          <p className="install-banner-desc">Add to home screen for quick access</p>
        </div>
      </div>
      <div className="install-banner-actions">
        <button className="install-banner-btn primary" onClick={handleInstall}>Install</button>
        <button className="install-banner-btn dismiss" onClick={handleDismiss}>
          <i className="fa-solid fa-xmark" />
        </button>
      </div>
    </div>
  );
}

function AppShell({ children }) {
  const { state } = useApp();
  const isDesktop = useIsDesktop();
  const [mounted, setMounted] = useState(false);
  const [locked, setLocked] = useState(false);
  useReminder();

  const hasLock = typeof window !== 'undefined' && !!localStorage.getItem(LOCK_KEY);

  useEffect(() => {
    setMounted(true);
    // Lock when the app opens; setting a PIN in Preferences shouldn't lock you out on the spot.
    if (localStorage.getItem(LOCK_KEY)) setLocked(true);
  }, []);

  useEffect(() => {
    const theme = state.settings.theme || 'light';
    document.documentElement.setAttribute('data-theme', theme);
  }, [state.settings.theme]);

  useEffect(() => {
    if (state.settings.onboardStep < 3) return;
    const symbol = getCurrencySymbol(state.settings.currency);
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const r = 14;
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#33227A');
    gradient.addColorStop(1, '#120A2E');
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(size - r, 0);
    ctx.quadraticCurveTo(size, 0, size, r);
    ctx.lineTo(size, size - r);
    ctx.quadraticCurveTo(size, size, size - r, size);
    ctx.lineTo(r, size);
    ctx.quadraticCurveTo(0, size, 0, size - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.fillStyle = '#52F5CB';
    ctx.font = `bold ${Math.round(size * 0.52)}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(symbol, size / 2, size / 2 + 1);

    let link = document.querySelector("link[rel='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = canvas.toDataURL('image/png');
  }, [state.settings.currency, state.settings.onboardStep]);

  useEffect(() => {
    if (!state.settings.appLockEnabled || !hasLock) return;
    let hiddenAt = null;
    const timeout = (state.settings.appLockTimeout ?? 30) * 1000;

    function handleVisibility() {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
        if (timeout === 0) setLocked(true);
      } else if (document.visibilityState === 'visible' && hiddenAt !== null) {
        if (timeout > 0 && Date.now() - hiddenAt >= timeout) {
          setLocked(true);
        }
        hiddenAt = null;
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [state.settings.appLockEnabled, state.settings.appLockTimeout, hasLock]);

  useEffect(() => {
    if (state.settings.onboardStep < 3) return;
    const BACKUP_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
    const STORAGE_KEY = 'spendtraq_last_backup_reminder';

    function checkBackupReminder() {
      const lastReminder = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
      if (Date.now() - lastReminder < BACKUP_INTERVAL_MS) return;

      localStorage.setItem(STORAGE_KEY, Date.now().toString());

      if (!('Notification' in window) || Notification.permission !== 'granted') return;

      const options = {
        body: 'Your data is stored locally and can be lost if site data is cleared. Export a backup in Preferences → Backup & Sync.',
        tag: 'spendtraq-backup-reminder',
      };
      try {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then((reg) =>
            reg.showNotification('Back up your SpendTrak data', options)
          ).catch(() => {});
        } else {
          new Notification('Back up your SpendTrak data', options);
        }
      } catch { /* ignore */ }
    }

    const timer = setTimeout(checkBackupReminder, 5000);
    return () => clearTimeout(timer);
  }, [state.settings.onboardStep]);

  useEffect(() => {
    if (state.settings.onboardStep < 3) return;
    if (!state.settings.plannedEnabled || !state.plannedPayments?.length) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const NOTIF_KEY = 'spendtraq_due_payment_notif';
    const lastNotif = localStorage.getItem(NOTIF_KEY);
    const todayStr = new Date().toISOString().slice(0, 10);
    if (lastNotif === todayStr) return;

    function checkDuePayments() {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const overdue = [];
      const dueToday = [];
      state.plannedPayments.filter((p) => p.enabled).forEach((p) => {
        const d = new Date(p.nextDate);
        d.setHours(0, 0, 0, 0);
        const diff = Math.ceil((d - now) / 86400000);
        if (diff < 0) overdue.push(p);
        else if (diff === 0) dueToday.push(p);
      });

      if (overdue.length === 0 && dueToday.length === 0) return;
      localStorage.setItem(NOTIF_KEY, todayStr);

      let title, body;
      if (overdue.length > 0 && dueToday.length > 0) {
        title = `${overdue.length + dueToday.length} payments need attention`;
        body = `${overdue.length} overdue and ${dueToday.length} due today. Open SpendTrak to review.`;
      } else if (overdue.length > 0) {
        title = overdue.length === 1 ? `${overdue[0].name} is overdue` : `${overdue.length} payments are overdue`;
        body = 'Open SpendTrak to pay or update your planned payments.';
      } else {
        title = dueToday.length === 1 ? `${dueToday[0].name} is due today` : `${dueToday.length} payments due today`;
        body = 'Tap to review and mark as paid.';
      }

      const options = { body, tag: 'spendtraq-due-payments' };
      try {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then((reg) => reg.showNotification(title, options)).catch(() => {});
        } else {
          new Notification(title, options);
        }
      } catch { /* ignore */ }
    }

    const timer = setTimeout(checkDuePayments, 3000);
    return () => clearTimeout(timer);
  }, [state.settings.onboardStep, state.settings.plannedEnabled, state.plannedPayments]);

  // Finishing onboarding always lands on Home, whatever URL it started from (e.g. after a reset in Preferences).
  const router = useRouter();
  const pathname = usePathname();
  const prevOnboardStep = useRef(state.settings.onboardStep);
  useEffect(() => {
    const prev = prevOnboardStep.current;
    prevOnboardStep.current = state.settings.onboardStep;
    if (prev < 3 && state.settings.onboardStep >= 3 && pathname !== '/') router.replace('/');
  }, [state.settings.onboardStep, pathname, router]);

  const handleUnlock = useCallback(() => setLocked(false), []);
  useDriveAutoSync();

  // Before mount (and on the server) the landing page is rendered so first-time visitors and crawlers get
  // real HTML. The inline script in the root layout marks returning visitors, and `.lp-prerender` hides it
  // for them until the app takes over. Both branches render the same tree so React keeps it on mount.
  if (!mounted || (state.settings.onboardStep === 0 && !(locked && hasLock))) {
    return <main className={mounted ? undefined : 'lp-prerender'}><Welcome /></main>;
  }

  if (locked && hasLock) {
    return <LockScreen onUnlock={handleUnlock} />;
  }

  if (state.settings.onboardStep === 1) {
    return <main><NameSetup /></main>;
  }

  if (state.settings.onboardStep === 2) {
    return <main><CurrencySetup /></main>;
  }

  return (
    <div className={`app-layout ${isDesktop ? 'desktop' : 'mobile'}`}>
      {isDesktop && <Sidebar />}
      <main className={`app-main ${isDesktop ? 'with-sidebar' : ''}`}>
        <MigrationBanner />
        <InstallBanner />
        {children}
      </main>
      {!isDesktop && <BottomNav />}
    </div>
  );
}

export default function ClientApp({ children }) {
  return (
    <AppProvider>
      <ToastProvider>
        <AppShell>{children}</AppShell>
      </ToastProvider>
    </AppProvider>
  );
}
