import Link from 'next/link';
import './not-found.css';

export const metadata = {
  title: '404 – Page not found | SpendTrak',
  description: "The page you're looking for doesn't exist or has been moved.",
  robots: { index: false },
};

const QUICK_LINKS = [
  { href: '/features', label: 'Features' },
  { href: '/android', label: 'Android app' },
  { href: '/faq', label: 'FAQ' },
  { href: '/about', label: 'About' },
];

export default function NotFound() {
  return (
    <div className="nf-page">
      <div className="nf-glow" aria-hidden="true" />
      <main className="nf-main">
        <svg className="nf-face" viewBox="0 0 320 380" width="320" height="380" role="img" aria-label="A surprised face">
          <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="25">
            <g className="nf-eyes" transform="translate(0, 112.5)">
              <g transform="translate(15, 0)">
                <polyline className="nf-eye-lid" points="37,0 0,120 75,120" />
                <polyline className="nf-pupil" points="55,120 55,155" strokeDasharray="35 35" />
              </g>
              <g transform="translate(230, 0)">
                <polyline className="nf-eye-lid" points="37,0 0,120 75,120" />
                <polyline className="nf-pupil" points="55,120 55,155" strokeDasharray="35 35" />
              </g>
            </g>
            <rect className="nf-nose" rx="4" ry="4" x="132.5" y="112.5" width="55" height="155" />
            <g strokeDasharray="102 102" transform="translate(65, 334)">
              <path className="nf-mouth-left" d="M 0 30 C 0 30 40 0 95 0" strokeDashoffset="-102" />
              <path className="nf-mouth-right" d="M 95 0 C 150 0 190 30 190 30" strokeDashoffset="102" />
            </g>
          </g>
        </svg>

        <div className="nf-info">
          <p className="nf-code">404</p>
          <h1>Page not found</h1>
          <p className="nf-text">
            This page doesn&apos;t exist or has moved. Your money is safe, though — it&apos;s right where you left it.
          </p>
          <Link href="/" className="nf-btn">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to SpendTrak
          </Link>
          <nav className="nf-links" aria-label="Popular pages">
            {QUICK_LINKS.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </main>
    </div>
  );
}
