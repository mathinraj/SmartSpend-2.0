import Link from 'next/link';
import AndroidShowcase from '../../../components/AndroidShowcase';
import Breadcrumbs from '../../../components/Breadcrumbs';
import FAQAccordion from '../../../components/FAQAccordion';
import { ANDROID_FEATURES, ANDROID_INSTALL_STEPS, ANDROID_RELEASES_URL } from '../../../utils/androidApp';

const SITE_URL = 'https://spendtrak.vercel.app';

export const metadata = {
  title: { absolute: 'SpendTrak for Android — free, private expense tracker app' },
  description:
    'Download SpendTrak for Android: the free, offline, privacy-first expense tracker. Fingerprint lock, reminders, exports, and automatic Google Drive sync with the SpendTrak web app.',
  alternates: { canonical: `${SITE_URL}/android` },
  openGraph: {
    title: 'SpendTrak for Android',
    description: 'The free, private expense tracker as a native Android app — synced with the web app through your Google Drive.',
    url: `${SITE_URL}/android`,
    siteName: 'SpendTrak',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'SpendTrak for Android' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SpendTrak for Android',
    description: 'Free, private, offline expense tracking on Android, synced with the web app.',
    images: ['/og-image.png'],
  },
};

const faqs = [
  {
    q: 'Is the Android app on the Play Store?',
    a: 'Not yet. It is published as an APK on GitHub, signed with the same key for every version, so updates install over the previous one and keep your data. The app checks GitHub for new versions and tells you when one is ready.',
  },
  {
    q: 'Will my web data show up in the app?',
    a: 'Yes. In the app, open Settings → Google Drive and sign in with the Google account you use for sync here. Both apps then keep each other up to date automatically. You can also move data with a data backup file (Export → Data backup, then Import).',
  },
  {
    q: 'Which file should I download?',
    a: 'Most phones from 2017 onward need the arm64-v8a APK. Older or budget phones may need armeabi-v7a. If you are not sure, the universal APK works on every phone; it is just a bigger download.',
  },
  {
    q: 'Does the app need the internet?',
    a: 'No. Everything works offline and your data stays on your phone. The internet is only used if you turn on Google Drive sync, check for updates, or send feedback.',
  },
];

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'MobileApplication',
  name: 'SpendTrak',
  operatingSystem: 'Android 7.0+',
  applicationCategory: 'FinanceApplication',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  downloadUrl: ANDROID_RELEASES_URL,
  url: `${SITE_URL}/android`,
};

export default function AndroidPage() {
  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Android app' }]} />

      <section aria-label="SpendTrak for Android" style={{ marginTop: 32, marginBottom: 72 }}>
        <AndroidShowcase />
      </section>

      <header className="mkt-page-header">
        <p className="mkt-page-label">What&apos;s inside</p>
        <h2 className="mkt-page-title">Everything from the web, made for your phone</h2>
      </header>
      <section aria-label="Android app features">
        <div className="mkt-features-grid">
          {ANDROID_FEATURES.map((f) => (
            <article key={f.title} className="mkt-feature-card">
              <span className="mkt-feature-icon">{f.icon}</span>
              <h3 className="mkt-feature-title">{f.title}</h3>
              <p className="mkt-feature-desc">{f.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <header className="mkt-page-header">
        <p className="mkt-page-label">Install</p>
        <h2 className="mkt-page-title">Up and running in a minute</h2>
      </header>
      <section aria-label="How to install" className="mkt-about-values" style={{ marginBottom: 56 }}>
        {ANDROID_INSTALL_STEPS.map((step, i) => (
          <div key={step.title} className="mkt-about-value">
            <h3>
              {i + 1}. {step.title}
            </h3>
            <p>{step.desc}</p>
          </div>
        ))}
      </section>

      <header className="mkt-page-header">
        <p className="mkt-page-label">Questions</p>
        <h2 className="mkt-page-title">Good to know</h2>
      </header>
      <section aria-label="Android app questions">
        <FAQAccordion faqs={faqs} />
      </section>

      <section className="mkt-cta-section">
        <h2 className="mkt-cta-title">Get SpendTrak for Android</h2>
        <p className="mkt-cta-desc">Free, no ads, no sign-up. Your data stays on your phone.</p>
        <a href={ANDROID_RELEASES_URL} className="mkt-cta-btn" target="_blank" rel="noopener noreferrer">
          <i className="fa-brands fa-android" /> Download the latest version
        </a>
        <div className="mkt-cross-links">
          <Link href="/" className="mkt-cross-link">Use it on the web instead</Link>
          <Link href="/features" className="mkt-cross-link">See all features</Link>
        </div>
      </section>
    </main>
  );
}
