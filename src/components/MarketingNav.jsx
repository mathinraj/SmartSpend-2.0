'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import './SiteTheme.css';
import './MarketingNav.css';

const navLinks = [
  { href: '/features', label: 'Features' },
  { href: '/android', label: 'Android' },
  { href: '/blog', label: 'Blog' },
  { href: '/faq', label: 'FAQ' },
  { href: '/about', label: 'About' },
];

export default function MarketingNav({ onGetStarted }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="marketing-nav" aria-label="Main navigation">
      <div className="marketing-nav-inner">
        <Link href="/" className="marketing-nav-brand">
          <img src="/logo-icon.svg" alt="" className="marketing-nav-logo" />
          <span className="marketing-nav-name">SpendTrak</span>
        </Link>

        <button
          className={`marketing-nav-toggle ${menuOpen ? 'open' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          <span />
          <span />
          <span />
        </button>

        <div className={`marketing-nav-links ${menuOpen ? 'open' : ''}`}>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`marketing-nav-link ${pathname === link.href || pathname?.startsWith(`${link.href}/`) ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          {onGetStarted ? (
            <button className="marketing-nav-cta" onClick={() => { setMenuOpen(false); onGetStarted(); }}>
              Start tracking
            </button>
          ) : (
            <Link href="/" className="marketing-nav-cta" onClick={() => setMenuOpen(false)}>
              Start tracking
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
