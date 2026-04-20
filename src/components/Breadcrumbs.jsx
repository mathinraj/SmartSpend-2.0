import Link from 'next/link';
import './Breadcrumbs.css';

export default function Breadcrumbs({ items }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.label,
      item: item.href ? `https://spendtrak.vercel.app${item.href}` : undefined,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <ol className="breadcrumbs-list">
          {items.map((item, i) => (
            <li key={i} className="breadcrumbs-item">
              {i < items.length - 1 ? (
                <>
                  <Link href={item.href} className="breadcrumbs-link">{item.label}</Link>
                  <span className="breadcrumbs-sep" aria-hidden="true">/</span>
                </>
              ) : (
                <span className="breadcrumbs-current" aria-current="page">{item.label}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
