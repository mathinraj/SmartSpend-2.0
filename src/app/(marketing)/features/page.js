import Link from 'next/link';
import Breadcrumbs from '../../../components/Breadcrumbs';

const SITE_URL = 'https://spendtrak.vercel.app';

export const metadata = {
  title: 'Features — SpendTrak',
  description: 'Explore all SpendTrak features: smart analytics, Google Drive sync, multi-account management, bill splitting, planned payments, data export, reminders, and privacy-first security.',
  alternates: { canonical: `${SITE_URL}/features` },
  openGraph: {
    title: 'Features — SpendTrak',
    description: 'Explore all SpendTrak features: smart analytics, Google Drive sync, multi-account management, bill splitting, planned payments, and more.',
    url: `${SITE_URL}/features`,
    siteName: 'SpendTrak',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'SpendTrak Features' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Features — SpendTrak',
    description: 'Explore all SpendTrak features: analytics, sync, splitting, and more.',
    images: ['/og-image.png'],
  },
};

const features = [
  {
    icon: '📊',
    title: 'Smart Analytics',
    desc: 'Understand where your money goes with daily spend trends, savings rate tracking, top expense breakdowns, category-wise analysis, and credit card utilization charts. All rendered in beautiful, interactive visualizations that update in real time.',
  },
  {
    icon: '☁️',
    title: 'Google Drive Sync',
    desc: 'Push and pull your financial data to your own Google Drive account. Access your finances across multiple devices while keeping everything private, encrypted, and completely under your control.',
  },
  {
    icon: '🏦',
    title: 'Multi-Account Management',
    desc: 'Manage bank accounts, credit cards, cash wallets, and UPI apps all in one place. Track real-time balances across every account and see your complete financial picture at a glance.',
  },
  {
    icon: '🤝',
    title: 'Split Expenses',
    desc: 'Track shared expenses with friends, family, or roommates. Edit entries anytime, record settlements, see who owes what, and keep shared finances transparent and drama-free.',
  },
  {
    icon: '📅',
    title: 'Planned Payments',
    desc: 'Never miss a bill again. Track subscriptions, EMIs, rent, and recurring expenses with smart due-date reminders. Get notified before payments are due so you stay on top of your obligations.',
  },
  {
    icon: '📤',
    title: 'Export Anywhere',
    desc: 'Export your financial data in the format you need — JSON for backups, CSV for spreadsheets, polished PDF reports for sharing, or Excel workbooks with embedded charts and formatted tables.',
  },
  {
    icon: '🔔',
    title: 'Gentle Reminders',
    desc: 'Set customizable daily or weekly reminders to log your expenses. Gentle nudges help make expense tracking a natural habit rather than a chore you forget about.',
  },
  {
    icon: '🔒',
    title: 'Privacy First',
    desc: 'Protect your finances with PIN or password lock, hide balances with a single tap, and rest easy knowing your profile and data never leave your device. No servers, no tracking, no compromise.',
  },
];

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'SpendTrak Features',
  description: 'Complete list of SpendTrak expense tracker features',
  numberOfItems: features.length,
  itemListElement: features.map((f, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: f.title,
    description: f.desc,
  })),
};

export default function FeaturesPage() {
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Breadcrumbs items={[
        { label: 'Home', href: '/' },
        { label: 'Features' },
      ]} />

      <header className="mkt-page-header">
        <p className="mkt-page-label">Features</p>
        <h1 className="mkt-page-title">Everything you need, nothing you don&apos;t</h1>
        <p className="mkt-page-subtitle">
          Powerful enough for serious budgeting. Simple enough for everyday use. Here&apos;s what makes SpendTrak the smartest way to manage your money.
        </p>
      </header>

      <section aria-label="Feature list">
        <div className="mkt-features-grid">
          {features.map((f, i) => (
            <article key={i} className="mkt-feature-card">
              <span className="mkt-feature-icon">{f.icon}</span>
              <h2 className="mkt-feature-title">{f.title}</h2>
              <p className="mkt-feature-desc">{f.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mkt-cta-section">
        <h2 className="mkt-cta-title">Ready to take control?</h2>
        <p className="mkt-cta-desc">Start tracking your expenses in under 30 seconds — no sign-up needed.</p>

        <Link href="/" className="mkt-cta-btn">
          Get Started — It&apos;s Free
          <span>→</span>
        </Link>
        <div className="mkt-cross-links">
          <Link href="/faq" className="mkt-cross-link">Have questions? Read the FAQ</Link>
          <Link href="/about" className="mkt-cross-link">Learn more about SpendTrak</Link>
        </div>
      </section>
    </main>
  );
}
