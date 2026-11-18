import Link from 'next/link';
import Breadcrumbs from '../../../components/Breadcrumbs';
import { ANDROID_RELEASES_URL } from '../../../utils/androidApp';
import './changelog.css';

const SITE_URL = 'https://spendtrak.vercel.app';

export const metadata = {
  title: 'SpendTrak changelog — what’s new in the Android app',
  description:
    'Every feature, improvement and fix in each version of SpendTrak for Android, the free, private expense tracker. Latest: Google Drive sync with the web app and in-app update checks.',
  alternates: { canonical: `${SITE_URL}/changelog` },
  openGraph: {
    title: 'What’s new in SpendTrak',
    description: 'Every feature, improvement and fix in each version of SpendTrak for Android.',
    url: `${SITE_URL}/changelog`,
    siteName: 'SpendTrak',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'SpendTrak' }],
  },
};

const KIND_LABEL = { feat: 'New', improve: 'Improved', fix: 'Fixed' };

const RELEASES = [
  {
    version: '1.8.0',
    date: 'November 2026',
    summary: 'Sync with the web app through your own Google Drive, a heads-up when a new version is out, and a fresh new logo.',
    changes: [
      {
        kind: 'feat',
        icon: 'fa-brands fa-google-drive',
        title: 'Google Drive sync',
        desc: 'Open Settings → Google Drive and sign in with Google to keep your phone and spendtrak.vercel.app on the same data. Choose automatic sync, which saves every change within seconds, or manual backups when you tap Back up now. Changes from both sides are merged record by record, so an edit or deletion on one device is never lost on the other. Your data is kept in your own Drive, in a private folder only SpendTrak can open.',
      },
      {
        kind: 'feat',
        icon: 'fa-solid fa-clock-rotate-left',
        title: 'Restore an earlier version',
        desc: 'SpendTrak keeps one copy a day in your Drive for the last 7 days, so you can roll back if something goes wrong. You can also disconnect at any time (your data stays on the phone) or delete SpendTrak’s copies from Drive.',
      },
      {
        kind: 'feat',
        icon: 'fa-solid fa-arrows-rotate',
        title: 'Check for updates',
        desc: 'Settings → About now tells you when a new version is out, with a red dot on the Home settings icon. Download picks the right file for your phone, and the update installs over your current version, keeping all your data. SpendTrak checks quietly in the background, at most every few hours, and you can check yourself any time.',
      },
      {
        kind: 'improve',
        icon: 'fa-solid fa-palette',
        title: 'A new look',
        desc: 'A new logo for the app icon, splash screen and notifications, and a redesigned website.',
      },
      {
        kind: 'improve',
        icon: 'fa-solid fa-calendar-days',
        title: 'Pick any month to compare',
        desc: 'In Analytics → Categories, tap a month to choose it from a year grid, instead of stepping back one month at a time.',
      },
      {
        kind: 'improve',
        icon: 'fa-solid fa-pen',
        title: 'Manage categories from the form',
        desc: 'A pencil button next to Category, when adding a transaction, opens your categories so you can add or edit one without leaving.',
      },
      {
        kind: 'improve',
        icon: 'fa-solid fa-circle-user',
        title: 'Your Google photo on Home',
        desc: 'If you haven’t set a profile photo, Home shows the photo from the Google account you sync with.',
      },
      {
        kind: 'feat',
        icon: 'fa-solid fa-user',
        title: 'Meet the developer',
        desc: 'A new page about who builds SpendTrak, with other free projects and ways to get in touch. Open it from Settings, along with Contribute (to help keep SpendTrak free) and Use on the web.',
      },
    ],
  },
  {
    version: '1.7.0',
    date: 'November 2026',
    summary: 'First public release: a simple, private expense tracker that works offline, with no sign-up, no server and no ads.',
    changes: [
      {
        kind: 'feat',
        icon: 'fa-solid fa-wallet',
        title: 'Track everything',
        desc: 'Expenses, income and transfers across bank accounts, debit and credit cards, cash, wallets and your own custom types. Credit cards get billing and due dates, a limit and one-tap Pay bill. Use built-in categories or make your own with any emoji and colour, and pick your currency.',
      },
      {
        kind: 'feat',
        icon: 'fa-solid fa-chart-pie',
        title: 'See where it went',
        desc: 'A customisable Home dashboard, plus Analytics with daily trends, spending by weekday, top expenses, savings rate, category charts, month-versus-month comparison and credit card use. History has search, filters, a calendar view and a running balance.',
      },
      {
        kind: 'feat',
        icon: 'fa-solid fa-people-arrows',
        title: 'Split expenses',
        desc: 'Split a bill evenly or unevenly right from the expense form, see who owes whom at a glance, and settle up while updating your bank balance in the same step.',
      },
      {
        kind: 'feat',
        icon: 'fa-solid fa-calendar-check',
        title: 'Planned payments and reminders',
        desc: 'Track subscriptions, EMIs, rent and bills with overdue and due-soon alerts, and mark one as paid to log it instantly. Set your own reminders with quiet hours.',
      },
      {
        kind: 'feat',
        icon: 'fa-solid fa-fingerprint',
        title: 'Private and secure',
        desc: 'Lock the app with a PIN or password plus fingerprint or face unlock, and hide balances with a quick peek. Everything is stored only on your phone.',
      },
      {
        kind: 'feat',
        icon: 'fa-solid fa-file-export',
        title: 'Export and backup',
        desc: 'Data backups you can restore here or in the web app, and reports in Excel, PDF and CSV. Save them to your phone or share them to any app.',
      },
    ],
  },
];

export default function ChangelogPage() {
  return (
    <main>
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Changelog' }]} />

      <header className="mkt-page-header">
        <p className="mkt-page-label">Changelog</p>
        <h1 className="mkt-page-title">What&apos;s new in SpendTrak</h1>
        <p className="mkt-page-subtitle">
          Every feature, improvement and fix in each version of the Android app. The web app always runs the latest version.
        </p>
      </header>

      <section className="cl-timeline" aria-label="Versions">
        {RELEASES.map((release, i) => (
          <article key={release.version} className={`cl-release${i === 0 ? ' is-latest' : ''}`} id={`v${release.version}`}>
            <span className="cl-dot" aria-hidden="true" />
            <header className="cl-release-head">
              <h2 className="cl-version">v{release.version}</h2>
              {i === 0 && <span className="cl-latest">Latest</span>}
              <span className="cl-date">{release.date}</span>
            </header>
            <p className="cl-summary">{release.summary}</p>
            <ul className="cl-changes">
              {release.changes.map((change) => (
                <li key={change.title} className="cl-change">
                  <span className={`cl-icon cl-icon--${change.kind}`} aria-hidden="true">
                    <i className={change.icon} />
                  </span>
                  <div>
                    <h3 className="cl-change-title">
                      {change.title}
                      <span className={`cl-kind cl-kind--${change.kind}`}>{KIND_LABEL[change.kind]}</span>
                    </h3>
                    <p className="cl-change-desc">{change.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="mkt-cta-section">
        <h2 className="mkt-cta-title">Get the latest version</h2>
        <p className="mkt-cta-desc">Updates install over your current version and keep your data.</p>
        <a href={ANDROID_RELEASES_URL} className="mkt-cta-btn" target="_blank" rel="noopener noreferrer">
          <i className="fa-brands fa-android" /> Download for Android
        </a>
        <div className="mkt-cross-links">
          <Link href="/android" className="mkt-cross-link">About the Android app</Link>
          <a href="https://github.com/mathinraj/SmartSpend-2.0/releases" className="mkt-cross-link" target="_blank" rel="noopener noreferrer">
            All releases on GitHub
          </a>
        </div>
      </section>
    </main>
  );
}
