'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppProvider, useApp } from '../context/AppContext';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { useReminder } from '../hooks/useReminder';
import { useToast } from '../components/Toast';
import { getCurrencySymbol } from '../utils/currencies';
import { ToastProvider } from '../components/Toast';
import * as gDrive from '../utils/googleDrive';
import BottomNav from '../components/BottomNav';
import Sidebar from '../components/Sidebar';
import LockScreen from '../components/LockScreen';
import Welcome from '../views/Welcome';
import NameSetup from '../views/NameSetup';
import CurrencySetup from '../views/CurrencySetup';

function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (localStorage.getItem('spendtraq_install_dismissed')) return;

    function handleBeforeInstall(e) {
      e.preventDefault();
      setDeferredPrompt(e);
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  }

  function handleDismiss() {
    setDismissed(true);
    localStorage.setItem('spendtraq_install_dismissed', Date.now().toString());
    setDeferredPrompt(null);
  }

  if (!deferredPrompt || dismissed) return null;

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

  const hasLock = typeof window !== 'undefined' && !!localStorage.getItem('spendtraq_app_lock');

  useEffect(() => {
    setMounted(true);
    if (hasLock) setLocked(true);
  }, [hasLock]);

  useEffect(() => {
    const theme = state.settings.theme || 'light';
    document.documentElement.setAttribute('data-theme', theme);
  }, [state.settings.theme]);

  useEffect(() => {
    const symbol = getCurrencySymbol(state.settings.currency);
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const r = 14;
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#6C5CE7');
    gradient.addColorStop(1, '#A29BFE');
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

    ctx.fillStyle = 'white';
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
  }, [state.settings.currency]);

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

  const handleUnlock = useCallback(() => setLocked(false), []);

  const toast = useToast();
  const { dispatch } = useApp();
  const [syncBanner, setSyncBanner] = useState(null);
  const [pulling, setPulling] = useState(false);

  useEffect(() => {
    if (!mounted || state.settings.onboardStep < 3) return;
    if (!state.settings.gdriveEmail || !gDrive.isConfigured()) return;
    const CHECK_KEY = 'spendtraq_sync_check';
    const lastCheck = parseInt(sessionStorage.getItem(CHECK_KEY) || '0', 10);
    if (Date.now() - lastCheck < 5 * 60 * 1000) return;

    async function checkCloudBackup() {
      sessionStorage.setItem(CHECK_KEY, Date.now().toString());
      try {
        const token = await gDrive.ensureTokenSilently();
        if (!token) return;
        const fileInfo = await gDrive.getSyncFileInfo();
        if (!fileInfo?.modifiedTime) return;
        const cloudTime = new Date(fileInfo.modifiedTime).getTime();
        const localTime = state.settings.gdriveLastSync ? new Date(state.settings.gdriveLastSync).getTime() : 0;
        if (cloudTime > localTime + 30000) {
          const ago = Math.round((Date.now() - cloudTime) / 60000);
          const label = ago < 1 ? 'just now' : ago < 60 ? `${ago}m ago` : `${Math.round(ago / 60)}h ago`;
          setSyncBanner({ label });
        }
      } catch { /* silent */ }
    }

    const timer = setTimeout(checkCloudBackup, 3000);
    return () => clearTimeout(timer);
  }, [mounted, state.settings.gdriveEmail, state.settings.gdriveLastSync, state.settings.onboardStep]);

  async function handleBannerPull() {
    setPulling(true);
    try {
      const token = await gDrive.ensureTokenSilently();
      if (!token) { toast('Session expired. Reconnect in Preferences.', 'warning'); setPulling(false); setSyncBanner(null); return; }
      const data = await gDrive.downloadSyncData();
      if (!data) { toast('No backup found', 'info'); setPulling(false); setSyncBanner(null); return; }
      if (data.settings) {
        const { onboardStep, gdriveEmail, gdriveName, gdrivePhoto, gdriveLastSync, ...restoredSettings } = data.settings;
        dispatch({ type: 'UPDATE_SETTINGS', payload: restoredSettings });
      }
      if (data.profilePhoto) {
        localStorage.setItem('spendtraq_profile_photo', data.profilePhoto);
        dispatch({ type: 'UPDATE_SETTINGS', payload: { hasProfilePhoto: true } });
      }
      dispatch({ type: 'MERGE_IMPORT_DATA', payload: data });
      dispatch({ type: 'UPDATE_SETTINGS', payload: { gdriveLastSync: new Date().toISOString() } });
      toast('Data synced from Google Drive!', 'success');
    } catch (err) {
      if (err.message === 'AUTH_EXPIRED') toast('Session expired. Reconnect in Preferences.', 'warning');
      else toast('Sync failed', 'error');
    }
    setPulling(false);
    setSyncBanner(null);
  }

  if (!mounted) {
    return null;
  }

  if (locked && hasLock) {
    return <LockScreen onUnlock={handleUnlock} />;
  }

  if (state.settings.onboardStep === 0) {
    return <Welcome />;
  }

  if (state.settings.onboardStep === 1) {
    return <NameSetup />;
  }

  if (state.settings.onboardStep === 2) {
    return <CurrencySetup />;
  }

  return (
    <div className={`app-layout ${isDesktop ? 'desktop' : 'mobile'}`}>
      {isDesktop && <Sidebar />}
      <main className={`app-main ${isDesktop ? 'with-sidebar' : ''}`}>
        <InstallBanner />
        {syncBanner && (
          <div className="sync-banner">
            <div className="sync-banner-content">
              <i className="fa-solid fa-cloud-arrow-down" />
              <span>Newer backup found ({syncBanner.label})</span>
            </div>
            <div className="sync-banner-actions">
              <button className="sync-banner-btn primary" onClick={handleBannerPull} disabled={pulling}>
                {pulling ? <i className="fa-solid fa-spinner fa-spin" /> : 'Pull'}
              </button>
              <button className="sync-banner-btn dismiss" onClick={() => setSyncBanner(null)}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
          </div>
        )}
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
