import Script from 'next/script';
import ClientApp from './ClientApp';
import '../index.css';
import '../App.css';

export const metadata = {
  title: 'SpendTraq - Expense Tracker',
  description: 'The smartest way to track expenses, manage accounts, and take control of your finances. Free, offline, and private.',
  keywords: ['expense tracker', 'budget tracker', 'personal finance', 'money management', 'spending tracker'],
  openGraph: {
    title: 'SpendTraq - Expense Tracker',
    description: 'Track expenses, manage accounts, and take control of your finances.',
    type: 'website',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#6C5CE7',
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
      </head>
      <body>
        <ClientApp>{children}</ClientApp>
      </body>
    </html>
  );
}
