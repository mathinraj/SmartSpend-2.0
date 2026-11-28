import Link from 'next/link';
import { notFound } from 'next/navigation';
import Breadcrumbs from '../../../../components/Breadcrumbs';
import { formatPostDate, getPost, sortedPosts } from '../../../../content/blog';
import '../blog.css';

const SITE_URL = 'https://spendtrak.vercel.app';

export const dynamicParams = false;

export function generateStaticParams() {
  return sortedPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  const url = `${SITE_URL}/blog/${post.slug}`;
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.description,
      url,
      siteName: 'SpendTrak',
      type: 'article',
      publishedTime: post.date,
      authors: ['Mathinraj'],
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      images: ['/og-image.png'],
    },
  };
}

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const related = sortedPosts().filter((p) => p.slug !== post.slug).slice(0, 3);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
    image: `${SITE_URL}/og-image.png`,
    author: { '@type': 'Person', name: 'Mathinraj', url: 'https://www.linkedin.com/in/mathinraj' },
    publisher: { '@type': 'Organization', name: 'SpendTrak', logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon-512.png` } },
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Blog', href: '/blog' }, { label: post.title }]} />

      <article className="blog-article">
        <header className="mkt-page-header blog-article-header">
          <p className="blog-meta">
            <span className="blog-tag">{post.tag}</span>
            <time dateTime={post.date}>{formatPostDate(post.date)}</time>
            <span aria-hidden="true">·</span>
            <span>{post.readMinutes} min read</span>
          </p>
          <h1 className="mkt-page-title">{post.title}</h1>
          <p className="mkt-page-subtitle">{post.description}</p>
        </header>

        <div className="blog-body">
          {post.sections.map((section, i) => (
            <section key={i}>
              {section.heading && <h2>{section.heading}</h2>}
              {section.paragraphs?.map((text, j) => <p key={j}>{text}</p>)}
              {section.list && (
                <ul>
                  {section.list.map((item, j) => <li key={j}>{item}</li>)}
                </ul>
              )}
              {section.link && (
                <p className="blog-section-link">
                  {section.link.href.startsWith('/') ? (
                    <Link href={section.link.href}>{section.link.label} →</Link>
                  ) : (
                    <a href={section.link.href} target="_blank" rel="noopener">{section.link.label} →</a>
                  )}
                </p>
              )}
            </section>
          ))}
        </div>

        <footer className="blog-article-footer">
          <p>Written by <a href="https://www.linkedin.com/in/mathinraj" target="_blank" rel="noopener noreferrer">Mathinraj</a>, developer of SpendTrak.</p>
        </footer>
      </article>

      <section className="blog-related" aria-label="More articles">
        <h2>Keep reading</h2>
        <div className="blog-list">
          {related.map((p) => (
            <article key={p.slug} className="blog-card">
              <p className="blog-meta">
                <span className="blog-tag">{p.tag}</span>
                <span>{p.readMinutes} min read</span>
              </p>
              <h3 className="blog-card-title">
                <Link href={`/blog/${p.slug}`}>{p.title}</Link>
              </h3>
            </article>
          ))}
        </div>
      </section>

      <section className="mkt-cta-section">
        <h2 className="mkt-cta-title">Try SpendTrak free</h2>
        <p className="mkt-cta-desc">No sign-up, works offline, and your data stays on your device.</p>
        <Link href="/" className="mkt-cta-btn">
          Start tracking
          <span>→</span>
        </Link>
        <div className="mkt-cross-links">
          <Link href="/blog" className="mkt-cross-link">All articles</Link>
          <Link href="/features" className="mkt-cross-link">See all features</Link>
          <Link href="/android" className="mkt-cross-link">Get the Android app</Link>
        </div>
      </section>
    </main>
  );
}
