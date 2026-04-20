'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const LEGACY_DOMAINS = ['spendtraq.vercel.app', 'spendimeter.vercel.app'];
const DISMISS_KEY = 'spendtraq_migration_dismissed';

export default function MigrationBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!LEGACY_DOMAINS.includes(window.location.hostname)) return;
    if (sessionStorage.getItem(DISMISS_KEY)) return;
    setShow(true);
  }, []);

  function handleDismiss() {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="migration-banner">
      <div className="migration-banner-content">
        <div className="migration-banner-icon">
          <i className="fa-solid fa-triangle-exclamation" />
        </div>
        <div className="migration-banner-text">
          <p className="migration-banner-title">We&apos;re moving to spendtrak.vercel.app</p>
          <p className="migration-banner-desc">Please migrate your data before Apr 30, 2026.</p>
        </div>
      </div>
      <div className="migration-banner-actions">
        <Link href="/migrate" className="migration-banner-btn primary">Migrate Now</Link>
        <button className="migration-banner-btn dismiss" onClick={handleDismiss} aria-label="Dismiss">
          <i className="fa-solid fa-xmark" />
        </button>
      </div>
    </div>
  );
}
