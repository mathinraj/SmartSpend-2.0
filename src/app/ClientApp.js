'use client';

import { useState, useEffect } from 'react';
import { AppProvider, useApp } from '../context/AppContext';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { useReminder } from '../hooks/useReminder';
import { ToastProvider } from '../components/Toast';
import BottomNav from '../components/BottomNav';
import Sidebar from '../components/Sidebar';
import Welcome from '../views/Welcome';
import CurrencySetup from '../views/CurrencySetup';

function AppShell({ children }) {
  const { state } = useApp();
  const isDesktop = useIsDesktop();
  const [mounted, setMounted] = useState(false);
  useReminder();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const theme = state.settings.theme || 'light';
    document.documentElement.setAttribute('data-theme', theme);
  }, [state.settings.theme]);

  if (!mounted) {
    return null;
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
