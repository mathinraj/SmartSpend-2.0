import Link from 'next/link';
import Breadcrumbs from '../../../components/Breadcrumbs';

const SITE_URL = 'https://spendtrak.vercel.app';

export const metadata = {
  title: 'About — SpendTrak',
  description: 'Learn about SpendTrak, the free privacy-first expense tracker. Built by Mathinraj with a mission to make personal finance management accessible, private, and completely free.',
  alternates: { canonical: `${SITE_URL}/about` },
  openGraph: {
    title: 'About — SpendTrak',
    description: 'Learn about SpendTrak — the free, offline, privacy-first expense tracker built by Mathinraj.',
    url: `${SITE_URL}/about`,
    siteName: 'SpendTrak',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'About SpendTrak' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About — SpendTrak',
    description: 'The story behind SpendTrak — free, offline, privacy-first expense tracking.',
    images: ['/og-image.png'],
  },
};

const values = [
  {
    title: 'Privacy by Design',
    desc: 'Your financial data stays on your device. No servers collect your information, no analytics track your spending habits, and no third parties ever see your data.',
  },
  {
    title: 'Free Forever',
    desc: 'No premium tier, no subscriptions, no ads. Every feature is available to every user. SpendTrak is built as a public good, not a business.',
  },
  {
    title: 'Offline First',
    desc: 'SpendTrak works without an internet connection. Your data is stored locally and the app runs entirely in your browser. The internet is optional, not required.',
  },
  {
    title: 'User Ownership',
    desc: 'Your data belongs to you. Export anytime in JSON, CSV, PDF, or Excel. Sync to your own Google Drive. No lock-in, no walled gardens.',
  },
  {
    title: 'Simplicity',
    desc: 'Finance tools don\'t need to be complicated. SpendTrak focuses on doing a few things exceptionally well rather than overwhelming you with features you\'ll never use.',
  },
  {
    title: 'Transparency',
    desc: 'No hidden costs, no surprise changes, no dark patterns. What you see is what you get — a straightforward tool that respects your time and intelligence.',
  },
];

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: 'About SpendTrak',
    description: 'Learn about SpendTrak, the free privacy-first expense tracker.',
    url: `${SITE_URL}/about`,
    mainEntity: {
      '@type': 'WebApplication',
      name: 'SpendTrak',
      url: SITE_URL,
      applicationCategory: 'FinanceApplication',
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Mathinraj',
    url: 'https://www.linkedin.com/in/mathinraj',
    jobTitle: 'Software Developer',
    sameAs: ['https://www.linkedin.com/in/mathinraj'],
  },
];

export default function AboutPage() {
  return (
    <main>
      {jsonLd.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <Breadcrumbs items={[
        { label: 'Home', href: '/' },
        { label: 'About' },
      ]} />

      <header className="mkt-page-header">
        <p className="mkt-page-label">About</p>
        <h1 className="mkt-page-title">The story behind SpendTrak</h1>
        <p className="mkt-page-subtitle">
          A free, privacy-first expense tracker built for people who want to manage their money without giving up their data.
        </p>
      </header>

      <article>
        <section className="mkt-about-section">
          <h2>Our Mission</h2>
          <p className="mkt-about-text">
            Personal finance management shouldn&apos;t require handing your financial data to corporations, paying monthly subscriptions, or creating yet another account. SpendTrak was built with a simple belief: everyone deserves access to powerful financial tools that respect their privacy and cost nothing.
          </p>
          <p className="mkt-about-text">
            SpendTrak runs entirely in your browser. Your transactions, accounts, and analytics never touch a server. There are no accounts to create, no emails to verify, and no data to sell. Just open it and start managing your money.
          </p>
        </section>

        <section className="mkt-about-section">
          <h2>What We Believe In</h2>
          <div className="mkt-about-values">
            {values.map((v, i) => (
              <div key={i} className="mkt-about-value">
                <h3>{v.title}</h3>
                <p>{v.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mkt-about-section">
          <h2>Built By</h2>
          <div className="mkt-about-creator">
            <h3>Mathinraj</h3>
            <p>
              SpendTrak is designed and built by Mathinraj — a software developer passionate about creating tools that put users first. Frustrated by expense trackers that demanded sign-ups, sold data, or locked features behind paywalls, he built SpendTrak as the app he always wished existed.
            </p>
            <p>
              <a href="https://www.linkedin.com/in/mathinraj" target="_blank" rel="noopener noreferrer">
                Connect on LinkedIn →
              </a>
            </p>
          </div>
        </section>
      </article>

      <section className="mkt-cta-section">
        <h2 className="mkt-cta-title">Try it for yourself</h2>
        <p className="mkt-cta-desc">See why thousands trust SpendTrak with their finances.</p>
        <Link href="/" className="mkt-cta-btn">
          Get Started — It&apos;s Free
          <span>→</span>
        </Link>
        <div className="mkt-cross-links">
          <Link href="/features" className="mkt-cross-link">Explore all features</Link>
          <Link href="/faq" className="mkt-cross-link">Read the FAQ</Link>
        </div>
      </section>
    </main>
  );
}
