import Link from 'next/link';
import { ANDROID_HIGHLIGHTS, ANDROID_RELEASES_URL, ANDROID_REQUIREMENTS } from '../utils/androidApp';
import './SiteTheme.css';
import './AndroidShowcase.css';

/** "SpendTrak for Android" section: the real app, highlights, and the download button. */
export default function AndroidShowcase({ showDetailsLink = false }) {
  return (
    <div className="android-showcase">
      <div className="android-showcase-shots" aria-hidden="true">
        <div className="st-phone android-shot-back">
          <img src="/screens/android-planned.jpg" alt="" width="540" height="1200" />
        </div>
        <div className="st-phone android-shot-front">
          <img src="/screens/android-home.jpg" alt="" width="540" height="1200" />
        </div>
      </div>
      <div className="android-showcase-body">
        <span className="android-badge">
          <i className="fa-brands fa-android" /> SpendTrak for Android
        </span>
        <h2 className="android-showcase-title">The same tracker, in your pocket.</h2>
        <p className="android-showcase-desc">
          A native app with every web feature, and it keeps itself in sync with the web app through your Google Drive.
        </p>
        <ul className="android-highlights">
          {ANDROID_HIGHLIGHTS.map((h) => (
            <li key={h.text}>
              <i className={h.icon} aria-hidden="true" />
              <span>{h.text}</span>
            </li>
          ))}
        </ul>
        <div className="android-actions">
          <a className="st-btn st-btn--primary" href={ANDROID_RELEASES_URL} target="_blank" rel="noopener noreferrer">
            <i className="fa-brands fa-android" aria-hidden="true" /> Download for Android
          </a>
          {showDetailsLink && (
            <Link href="/android" className="android-details">
              How to install
            </Link>
          )}
        </div>
        <p className="android-meta">{ANDROID_REQUIREMENTS}. APK on GitHub.</p>
      </div>
    </div>
  );
}
