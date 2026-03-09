import Script from 'next/script';
import ClientApp from './ClientApp';
import '../index.css';
import '../App.css';

const SITE_URL = 'https://spendtraq.vercel.app';
const SITE_NAME = 'SpendTraq';
const SITE_DESCRIPTION = 'Free expense tracker that works offline. Track spending, manage accounts, split bills, plan payments, and analyze your finances — all private, no sign-up needed.';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'SpendTraq — Free Expense Tracker | Budget & Finance Manager',
    template: '%s | SpendTraq',
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
    title: 'SpendTraq — Free Expense Tracker | Budget & Finance Manager',
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
        alt: 'SpendTraq — Track expenses, split bills, manage your money',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: 'SpendTraq — Free Expense Tracker',
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

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'All',
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
  featureList: [
    'Track daily expenses and income',
    'Multiple account management',
    'Split bills with friends',
    'Planned & recurring payments',
    'Spending analytics and charts',
    'CSV and JSON export',
    'Works offline — no internet needed',
    'No sign-up required — fully private',
    'UPI and payment app tracking',
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <Script
          src="https://kit.fontawesome.com/5432a717c1.js"
          crossOrigin="anonymous"
          strategy="beforeInteractive"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <ClientApp>{children}</ClientApp>
      </body>
    </html>
  );
}
