import Script from 'next/script';
import ClientApp from './ClientApp';
import '../index.css';
import '../App.css';

const SITE_URL = 'https://spendtraq.vercel.app';
const SITE_NAME = 'SpendTrak';
const SITE_DESCRIPTION = 'Free expense tracker that works offline. Track spending, manage accounts, split bills, plan payments, and analyze your finances — all private, no sign-up needed.';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'SpendTrak — Free Expense Tracker | Budget & Finance Manager',
    template: '%s | SpendTrak',
  },
  description: SITE_DESCRIPTION,
  keywords: [
    'expense tracker',
    'budget tracker',
    'personal finance',
    'money management',
    'spending tracker',
    'bill splitter',
    'split expenses',
    'finance manager',
    'budget planner',
    'expense manager',
    'track expenses online',
    'free expense tracker',
    'offline expense tracker',
    'no sign up expense tracker',
    'UPI expense tracker',
    'daily expense tracker',
    'monthly budget tracker',
    'income expense tracker',
    'personal budget app',
    'money tracker',
    'expense tracker app',
    'split bills app',
    'privacy expense tracker',
    'pwa finance app',
    'credit card bill tracker',
  ],
  authors: [{ name: 'Mathinraj', url: 'https://www.linkedin.com/in/mathinraj' }],
  creator: 'Mathinraj',
  publisher: SITE_NAME,
  applicationName: SITE_NAME,
  category: 'finance',
  classification: 'Personal Finance',

  alternates: {
    canonical: SITE_URL,
  },

  openGraph: {
    title: 'SpendTrak — Free Expense Tracker | Budget & Finance Manager',
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'SpendTrak — Track expenses, split bills, manage your money',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: 'SpendTrak — Free Expense Tracker',
    description: 'Track spending, split bills, plan payments — free, offline, private. No sign-up needed.',
    images: ['/og-image.png'],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  manifest: '/manifest.json',

  other: {
    'google-site-verification': '7OHgQl0_ZtSYxF2eXQIzCUngjx1qjT4jGzC4Nbg8K-Q',
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': SITE_NAME,
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#6C5CE7',
};

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'All',
    browserRequirements: 'Requires a modern web browser with JavaScript enabled',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    author: {
      '@type': 'Person',
      name: 'Mathinraj',
      url: 'https://www.linkedin.com/in/mathinraj',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '120',
      bestRating: '5',
    },
    featureList: [
      'Track daily expenses and income',
      'Multiple account management (bank, cards, cash, UPI wallets)',
      'Split bills with friends and track settlements',
      'Planned & recurring payments with due-date reminders',
      'Spending analytics with interactive charts',
      'CSV and JSON data export',
      'Works 100% offline — no internet needed',
      'No sign-up required — fully private',
      'UPI and payment app tracking',
      'PIN or password app lock',
      'Hide balances for privacy',
      'Category and subcategory expense classification',
    ],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Is SpendTrak really free?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes, SpendTrak is completely free with no premium tier, no ads, and no hidden costs.',
        },
      },
      {
        '@type': 'Question',
        name: 'Does SpendTrak work offline?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes, SpendTrak works 100% offline. All data is stored locally in your browser — no internet connection required.',
        },
      },
      {
        '@type': 'Question',
        name: 'Do I need to create an account or sign up?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'No. SpendTrak requires no sign-up, no email, and no passwords. Just open it and start tracking your expenses.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is my financial data safe?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Your data never leaves your device. SpendTrak stores everything in your browser\'s local storage with no cloud servers involved. You can also set a PIN or password lock for extra security.',
        },
      },
    ],
  },
];

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <Script
          src="https://kit.fontawesome.com/5432a717c1.js"
          crossOrigin="anonymous"
          strategy="beforeInteractive"
        />
        {jsonLd.map((schema, i) => (
          <script
            key={i}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          />
        ))}
      </head>
      <body>
        <ClientApp>{children}</ClientApp>
      </body>
    </html>
  );
}
