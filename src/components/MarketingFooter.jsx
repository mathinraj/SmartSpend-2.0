import Link from 'next/link';
import { ANDROID_RELEASES_URL } from '../utils/androidApp';
import './SiteTheme.css';
import './MarketingFooter.css';

export default function MarketingFooter({ showCoindropButton }) {
  return (
    <footer className="mkt-footer">
      <div className="mkt-footer-inner">
        <div className="mkt-footer-brand">
          <img src="/logo-icon.svg" alt="" className="mkt-footer-logo" />
          <span className="mkt-footer-name">SpendTrak</span>
          <p className="mkt-footer-tagline">Your money, your rules.</p>
        </div>

        <div className="mkt-footer-links">
          <div className="mkt-footer-col">
            <p className="mkt-footer-col-title">Product</p>
            <Link href="/features">Features</Link>
            <Link href="/android">Android app</Link>
            <Link href="/changelog">What&apos;s new</Link>
            <Link href="/blog">Blog</Link>
            <Link href="/faq">FAQ</Link>
            <Link href="/about">About</Link>
          </div>
          <div className="mkt-footer-col">
            <p className="mkt-footer-col-title">Use SpendTrak</p>
            <Link href="/">Open the web app</Link>
            <a href={ANDROID_RELEASES_URL} target="_blank" rel="noopener noreferrer">Download for Android</a>
          </div>
        </div>
      </div>

      <div className="mkt-footer-bottom">
        <p>
          Made with 💚 by{' '}
          <a href="https://www.linkedin.com/in/mathinraj" target="_blank" rel="noopener noreferrer">
            Mathinraj
          </a>
          {showCoindropButton && (
            <>
              <span className="mkt-footer-sep"> · </span>
              {showCoindropButton}
            </>
          )}
        </p>
      </div>
    </footer>
  );
}
