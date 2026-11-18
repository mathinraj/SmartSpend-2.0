import Link from 'next/link';
import { ANDROID_HIGHLIGHTS, ANDROID_RELEASES_URL, ANDROID_REQUIREMENTS } from '../utils/androidApp';
import './AndroidShowcase.css';

/** A drawn phone showing the app's Home screen, so the page needs no screenshot assets. */
function PhoneMockup() {
  return (
    <div className="android-phone" aria-hidden="true">
      <div className="android-phone-screen">
        <div className="android-phone-status">
          <span>9:41</span>
          <span><i className="fa-solid fa-signal" /> <i className="fa-solid fa-battery-three-quarters" /></span>
        </div>
        <div className="android-phone-greeting">
          <span className="android-phone-avatar">🙂</span>
          <div>
            <small>Good evening</small>
            <strong>Mathi</strong>
          </div>
        </div>
        <div className="android-phone-card">
          <small>Total balance</small>
          <strong>₹1,68,800</strong>
          <div className="android-phone-stats">
            <span><i className="fa-solid fa-arrow-down" /> ₹87,000</span>
            <span><i className="fa-solid fa-arrow-up" /> ₹21,941</span>
          </div>
        </div>
        <div className="android-phone-sync">
          <i className="fa-solid fa-cloud" /> Synced just now
        </div>
        {[
          ['🍔', 'Dinner at Toit', '−₹2,400'],
          ['🛒', 'Groceries', '−₹1,250'],
          ['💼', 'Salary', '+₹75,000'],
        ].map(([emoji, name, amount]) => (
          <div key={name} className="android-phone-row">
            <span className="android-phone-emoji">{emoji}</span>
            <span className="android-phone-name">{name}</span>
            <span className={amount.startsWith('+') ? 'android-phone-amount income' : 'android-phone-amount'}>{amount}</span>
          </div>
        ))}
        <span className="android-phone-fab">+</span>
      </div>
    </div>
  );
}

/** "SpendTrak for Android" section: phone, highlights, and the download button. */
export default function AndroidShowcase({ showDetailsLink = false }) {
  return (
    <div className="android-showcase">
      <PhoneMockup />
      <div className="android-showcase-body">
        <span className="android-badge">
          <i className="fa-brands fa-android" /> Now on Android
        </span>
        <h2 className="android-showcase-title">SpendTrak in your pocket</h2>
        <p className="android-showcase-desc">
          The same private, offline tracker as a native Android app — and it keeps itself in sync with this web app.
        </p>
        <ul className="android-highlights">
          {ANDROID_HIGHLIGHTS.map((h) => (
            <li key={h.text}>
              <i className={h.icon} />
              <span>{h.text}</span>
            </li>
          ))}
        </ul>
        <div className="android-actions">
          <a className="android-download" href={ANDROID_RELEASES_URL} target="_blank" rel="noopener noreferrer">
            <i className="fa-brands fa-android" />
            <span>
              <small>Download for</small>
              Android
            </span>
          </a>
          {showDetailsLink && (
            <Link href="/android" className="android-details">
              How to install <span aria-hidden="true">→</span>
            </Link>
          )}
        </div>
        <p className="android-meta">{ANDROID_REQUIREMENTS} · APK on GitHub</p>
      </div>
    </div>
  );
}
