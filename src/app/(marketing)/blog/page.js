import Link from 'next/link';
import Breadcrumbs from '../../../components/Breadcrumbs';
import { formatPostDate, sortedPosts } from '../../../content/blog';
import './blog.css';

const SITE_URL = 'https://spendtrak.vercel.app';
const DESCRIPTION = 'Practical guides to tracking expenses, budgeting, splitting bills, managing credit cards, and keeping your financial data private, from the makers of SpendTrak.';

export const metadata = {
  title: 'Blog — Expense tracking and budgeting guides',
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/blog` },
  openGraph: {
    title: 'SpendTrak Blog — Expense tracking and budgeting guides',
    description: DESCRIPTION,
    url: `${SITE_URL}/blog`,
    siteName: 'SpendTrak',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'SpendTrak Blog' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SpendTrak Blog',
    description: DESCRIPTION,
    images: ['/og-image.png'],
  },
};

export default function BlogPage() {
  const posts = sortedPosts();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'SpendTrak Blog',
    url: `${SITE_URL}/blog`,
    description: DESCRIPTION,
    blogPost: posts.map((p) => ({
      '@type': 'BlogPosting',
      headline: p.title,
      description: p.description,
      datePublished: p.date,
      url: `${SITE_URL}/blog/${p.slug}`,
    })),
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Blog' }]} />

      <header className="mkt-page-header">
        <p className="mkt-page-label">Blog</p>
        <h1 className="mkt-page-title">Guides to spending smarter</h1>
        <p className="mkt-page-subtitle">
          Simple routines for tracking expenses, splitting bills, staying on top of credit cards, and keeping your money data private.
        </p>
      </header>

      <section aria-label="Articles" className="blog-list">
        {posts.map((post) => (
          <article key={post.slug} className="blog-card">
            <p className="blog-meta">
              <span className="blog-tag">{post.tag}</span>
              <time dateTime={post.date}>{formatPostDate(post.date)}</time>
              <span aria-hidden="true">·</span>
              <span>{post.readMinutes} min read</span>
            </p>
            <h2 className="blog-card-title">
              <Link href={`/blog/${post.slug}`}>{post.title}</Link>
            </h2>
            <p className="blog-card-desc">{post.description}</p>
            <Link href={`/blog/${post.slug}`} className="blog-read-more" aria-hidden="true" tabIndex={-1}>
              Read article →
            </Link>
          </article>
        ))}
      </section>

      <section className="mkt-cta-section">
        <h2 className="mkt-cta-title">Put it into practice</h2>
        <p className="mkt-cta-desc">SpendTrak is free, needs no sign-up, and keeps your data on your device.</p>
        <Link href="/" className="mkt-cta-btn">
          Start tracking — it&apos;s free
          <span>→</span>
        </Link>
        <div className="mkt-cross-links">
          <Link href="/features" className="mkt-cross-link">See all features</Link>
          <Link href="/android" className="mkt-cross-link">Get the Android app</Link>
          <Link href="/faq" className="mkt-cross-link">Read the FAQ</Link>
        </div>
      </section>
    </main>
  );
}
