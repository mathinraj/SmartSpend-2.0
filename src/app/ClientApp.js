'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppProvider, useApp } from '../context/AppContext';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { useReminder } from '../hooks/useReminder';
import { ToastProvider } from '../components/Toast';
import BottomNav from '../components/BottomNav';
import Sidebar from '../components/Sidebar';
import LockScreen from '../components/LockScreen';
import Welcome from '../views/Welcome';
import CurrencySetup from '../views/CurrencySetup';

function AppShell({ children }) {
  const { state } = useApp();
  const isDesktop = useIsDesktop();
  const [mounted, setMounted] = useState(false);
  const [locked, setLocked] = useState(false);
  useReminder();

  const hasLock = typeof window !== 'undefined' && !!localStorage.getItem('spendimeter_app_lock');

  useEffect(() => {
    setMounted(true);
    if (hasLock) setLocked(true);
  }, [hasLock]);

  useEffect(() => {
    const theme = state.settings.theme || 'light';
    document.documentElement.setAttribute('data-theme', theme);
  }, [state.settings.theme]);

  useEffect(() => {
    if (!state.settings.appLockEnabled || !hasLock) return;
    function handleVisibility() {
      if (document.visibilityState === 'hidden') {
        setLocked(true);
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [state.settings.appLockEnabled, hasLock]);

  const handleUnlock = useCallback(() => setLocked(false), []);

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
    return <CurrencySetup />;
  }

  return (
    <div className={`app-layout ${isDesktop ? 'desktop' : 'mobile'}`}>
      {isDesktop && <Sidebar />}
      <main className={`app-main ${isDesktop ? 'with-sidebar' : ''}`}>
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
