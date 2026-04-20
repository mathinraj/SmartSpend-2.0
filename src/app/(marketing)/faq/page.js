import Link from 'next/link';
import Breadcrumbs from '../../../components/Breadcrumbs';
import FAQAccordion from '../../../components/FAQAccordion';

const SITE_URL = 'https://spendtrak.vercel.app';

export const metadata = {
  title: 'FAQ — SpendTrak',
  description: 'Frequently asked questions about SpendTrak. Learn about pricing, offline support, data privacy, Google Drive sync, export options, multi-currency support, and more.',
  alternates: { canonical: `${SITE_URL}/faq` },
  openGraph: {
    title: 'FAQ — SpendTrak',
    description: 'Frequently asked questions about SpendTrak — the free, offline, privacy-first expense tracker.',
    url: `${SITE_URL}/faq`,
    siteName: 'SpendTrak',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'SpendTrak FAQ' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FAQ — SpendTrak',
    description: 'Answers to common questions about SpendTrak.',
    images: ['/og-image.png'],
  },
};

const faqs = [
  {
    q: 'Is SpendTrak really free?',
    a: 'Yes, SpendTrak is completely free with no premium tier, no ads, and no hidden costs. Every feature is available to every user, forever.',
  },
  {
    q: 'Does SpendTrak work offline?',
    a: 'Yes, SpendTrak works 100% offline. All your data is stored locally in your browser using localStorage. No internet connection is required to add transactions, view analytics, or manage your accounts.',
  },
  {
    q: 'Do I need to create an account or sign up?',
    a: 'No. SpendTrak requires no sign-up, no email, and no passwords. Just open it in your browser and start tracking your expenses immediately.',
  },
  {
    q: 'Is my financial data safe?',
    a: 'Your data never leaves your device. SpendTrak stores everything in your browser\'s local storage with no cloud servers involved. You can also set a PIN or password lock for extra security, and hide your balances with one tap.',
  },
  {
    q: 'Can I sync my data across devices?',
    a: 'Yes! SpendTrak supports Google Drive sync. You can push your data to your own Google Drive account and pull it on another device. Your data goes directly between your browser and your Google Drive — no middleman servers.',
  },
  {
    q: 'What happens if I clear my browser data?',
    a: 'Since SpendTrak stores data in your browser\'s localStorage, clearing site data will remove your SpendTrak data. We strongly recommend using Google Drive sync or the export feature (JSON, CSV, PDF, or Excel) to back up your data regularly.',
  },
  {
    q: 'Can I install SpendTrak as an app?',
    a: 'Yes! SpendTrak is a Progressive Web App (PWA). On mobile, tap "Add to Home Screen" in your browser menu. On desktop Chrome, click the install icon in the address bar. You\'ll get a native app experience — fast, fullscreen, and always ready.',
  },
  {
    q: 'What types of accounts can I track?',
    a: 'You can create and manage bank accounts, credit cards, cash wallets, UPI apps (GPay, PhonePe, Paytm, etc.), and any other payment method. Each account tracks its own balance independently.',
  },
  {
    q: 'Can I split expenses with friends?',
    a: 'Yes! The Split Tracker lets you create groups, add shared expenses, track who owes what, and record settlements. It\'s perfect for trips, roommates, or shared bills.',
  },
  {
    q: 'What export formats are supported?',
    a: 'SpendTrak supports exporting your data as JSON (for full backup and restore), CSV (for spreadsheets), PDF (formatted reports with charts), and Excel workbooks (with embedded charts and formatted tables).',
  },
  {
    q: 'Does SpendTrak support multiple currencies?',
    a: 'Yes. During onboarding you pick your primary currency, and you can change it anytime in Preferences. SpendTrak supports a wide range of world currencies with proper symbol formatting.',
  },
  {
    q: 'How do planned payments work?',
    a: 'You can add recurring expenses like rent, subscriptions, and EMIs with due dates. SpendTrak will notify you when payments are due or overdue, so you never miss a bill.',
  },
];

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.q,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.a,
    },
  })),
};

export default function FAQPage() {
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Breadcrumbs items={[
        { label: 'Home', href: '/' },
        { label: 'FAQ' },
      ]} />

      <header className="mkt-page-header">
        <p className="mkt-page-label">FAQ</p>
        <h1 className="mkt-page-title">Frequently Asked Questions</h1>
        <p className="mkt-page-subtitle">
          Everything you need to know about SpendTrak. Can&apos;t find what you&apos;re looking for? Reach out through our feedback page.
        </p>
      </header>

      <section aria-label="Frequently asked questions">
        <FAQAccordion faqs={faqs} />
      </section>

      <section className="mkt-cta-section">
        <h2 className="mkt-cta-title">Ready to start tracking?</h2>
        <p className="mkt-cta-desc">No sign-up, no cost, no compromise on privacy.</p>
        <Link href="/" className="mkt-cta-btn">
          Get Started — It&apos;s Free
          <span>→</span>
        </Link>
        <div className="mkt-cross-links">
          <Link href="/features" className="mkt-cross-link">See all features</Link>
          <Link href="/about" className="mkt-cross-link">Learn more about SpendTrak</Link>
        </div>
      </section>
    </main>
  );
}
