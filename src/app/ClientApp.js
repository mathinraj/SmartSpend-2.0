'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppProvider, useApp } from '../context/AppContext';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { useReminder } from '../hooks/useReminder';
import { getCurrencySymbol } from '../utils/currencies';
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
