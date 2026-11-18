'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useApp } from '../context/AppContext';
import MarketingNav from '../components/MarketingNav';
import MarketingFooter from '../components/MarketingFooter';
import { ANDROID_RELEASES_URL } from '../utils/androidApp';
import { siteFont } from '../utils/siteFont';
import '../components/SiteTheme.css';
import './Welcome.css';

const TOUR = [
  {
    title: 'Log it in five seconds',
    body: 'Amount, account, category, done. Split it with friends or note the payment app while you are there.',
    points: ['Expenses, income and transfers', 'Bank accounts, cards, cash and UPI wallets', 'Categories with any emoji you like'],
    shot: '/screens/android-add.jpg',
    alt: 'Adding a ₹450 expense in SpendTrak',
  },
  {
    title: 'See where it went',
    body: 'Daily spending, category breakdowns, savings rate and month against month. All worked out on your device.',
    points: ['Any period, any account', 'Credit card utilisation at a glance', 'History with search, filters and a calendar'],
    shot: '/screens/android-analytics.jpg',
    alt: 'SpendTrak analytics overview with daily spending',
  },
  {
    title: 'Split without the awkwardness',
    body: 'Record who paid, who owes and who settled. SpendTrak keeps a running balance for every friend.',
    points: ['Even or custom splits', 'Settle up and update your bank in one step', 'One clear list of who owes whom'],
    shot: '/screens/android-splits.jpg',
    alt: 'Split money screen showing who owes whom',
  },
  {
    title: 'Never miss a bill',
    body: 'Rent, EMIs and subscriptions in one place. Mark one paid and the expense is logged for you.',
    points: ['Overdue and due-soon alerts', 'Reminders with quiet hours', 'What you have committed each month'],
    shot: '/screens/android-planned.jpg',
    alt: 'Planned payments with an overdue gym membership',
  },
];

const DETAILS = [
  { icon: 'fa-solid fa-lock', title: 'App lock', body: 'PIN, password or fingerprint, and balances hidden with one tap.' },
  { icon: 'fa-solid fa-plane-slash', title: 'Works offline', body: 'Everything runs on your device. No connection needed, ever.' },
  { icon: 'fa-solid fa-file-export', title: 'Export anything', body: 'A full data backup, or reports in Excel, PDF and CSV.' },
  { icon: 'fa-regular fa-bell', title: 'Gentle reminders', body: 'Daily, weekly or repeating nudges, with quiet hours.' },
  { icon: 'fa-solid fa-coins', title: 'Your currency', body: 'Pick it once and every amount is formatted properly.' },
  { icon: 'fa-regular fa-heart', title: 'Free, no ads', body: 'No premium tier and no tracking. It stays that way.' },
];

const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Fades content in once as it enters the viewport. */
function Reveal({ children, className = '', delay = 0, as: Tag = 'div' }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduceMotion()) {
      el.classList.add('is-in');
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('is-in');
          observer.disconnect();
        }
      },
      { threshold: 0.18 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <Tag ref={ref} className={`lp-reveal ${className}`} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </Tag>
  );
}

/** Hero phones lean with the pointer, like looking at them from a slightly different spot. */
function usePointerDepth(ref) {
  useEffect(() => {
    const el = ref.current;
    if (!el || reduceMotion() || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    let frame = 0;
    const onMove = (e) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        el.style.setProperty('--mx', ((e.clientX / window.innerWidth) * 2 - 1).toFixed(3));
        el.style.setProperty('--my', ((e.clientY / window.innerHeight) * 2 - 1).toFixed(3));
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(frame);
    };
  }, [ref]);
}

/** Publishes --p (0 to 1) as the element travels through the middle of the viewport. */
function useScrollProgress(ref) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduceMotion()) {
      el.style.setProperty('--p', '1');
      return;
    }
    let frame = 0;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, (vh * 0.85 - rect.top) / (vh * 0.6)));
      el.style.setProperty('--p', p.toFixed(3));
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(frame);
    };
  }, [ref]);
}

export default function Welcome() {
  const { dispatch } = useApp();
  const [showCoindrop, setShowCoindrop] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const stageRef = useRef(null);
  const statementRef = useRef(null);
  const stepRefs = useRef([]);

  usePointerDepth(stageRef);
  useScrollProgress(statementRef);

  const handleGetStarted = useCallback(() => {
    dispatch({ type: 'NEXT_ONBOARD_STEP' });
  }, [dispatch]);

  // The tour's phone shows whichever chapter is crossing the middle of the screen.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveStep(Number(entry.target.dataset.index));
        }
      },
      { rootMargin: '-45% 0px -45% 0px' }
    );
    stepRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className={`st-root lp ${siteFont.variable}`}>
      <MarketingNav onGetStarted={handleGetStarted} />

      <main>
        {/* Hero */}
        <section className="lp-hero">
          <div className="st-wrap lp-hero-grid">
            <div className="lp-hero-copy">
              <h1 className="lp-h1">Know where your money goes.</h1>
              <p className="lp-lede">
                A private expense tracker for the web and Android. No sign-up, no ads, and your data stays with you.
              </p>
              <div className="lp-actions">
                <button className="st-btn st-btn--primary" onClick={handleGetStarted}>
                  Start tracking
                </button>
                <Link href="/android" className="st-btn st-btn--ghost">
                  <i className="fa-brands fa-android" aria-hidden="true" /> Get the Android app
                </Link>
              </div>
              <p className="lp-note">Free forever. Works offline.</p>
            </div>

            <div className="lp-hero-stage" ref={stageRef} aria-hidden="true">
              <div className="lp-hero-glow" />
              <div className="st-phone lp-hero-back">
                <img src="/screens/android-categories.jpg" alt="" width="540" height="1200" />
              </div>
              <div className="st-phone lp-hero-front">
                <img src="/screens/android-home.jpg" alt="" width="540" height="1200" fetchPriority="high" />
              </div>
            </div>
          </div>
        </section>

        {/* Statement: what other apps take gets struck out as you scroll */}
        <section className="lp-statement" ref={statementRef}>
          <div className="st-wrap">
            <p className="lp-statement-text">
              Most money apps want <span className="lp-strike" style={{ '--i': 0 }}>your bank login</span>,{' '}
              <span className="lp-strike" style={{ '--i': 1 }}>your email</span> and{' '}
              <span className="lp-strike" style={{ '--i': 2 }}>your attention</span>.{' '}
              <span className="lp-statement-turn">SpendTrak asks for none of it.</span>
            </p>
            <div className="lp-promises">
              <p><strong>No account.</strong> Open it and start. There is nothing to sign up for.</p>
              <p><strong>No server.</strong> Your numbers live on your device, and in your own Google Drive only if you choose.</p>
              <p><strong>No ads.</strong> Nothing is tracked, sold or shown to you.</p>
            </div>
          </div>
        </section>

        {/* Feature tour: the phone follows the chapter you are reading */}
        <section className="lp-tour" id="features" aria-labelledby="tour-title">
          <div className="st-wrap lp-tour-grid">
            <div className="lp-tour-steps">
              <h2 id="tour-title" className="lp-h2">Everything a month of money needs.</h2>
              {TOUR.map((step, i) => (
                <article
                  key={step.title}
                  ref={(el) => (stepRefs.current[i] = el)}
                  data-index={i}
                  className={`lp-step ${activeStep === i ? 'is-active' : ''}`}
                >
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                  <ul>
                    {step.points.map((point) => (
                      <li key={point}>
                        <i className="fa-solid fa-check" aria-hidden="true" /> {point}
                      </li>
                    ))}
                  </ul>
                  <div className="st-phone lp-step-shot">
                    <img src={step.shot} alt={step.alt} width="540" height="1200" loading="lazy" />
                  </div>
                </article>
              ))}
            </div>
            <div className="lp-tour-stage" aria-hidden="true">
              <div className="st-phone lp-tour-phone">
                {TOUR.map((step, i) => (
                  <img key={step.shot} src={step.shot} alt="" width="540" height="1200" loading="lazy" className={activeStep === i ? 'is-on' : ''} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Sync: the one dark section */}
        <section className="lp-sync" aria-labelledby="sync-title">
          <div className="st-wrap lp-sync-grid">
            <Reveal className="lp-sync-copy">
              <h2 id="sync-title" className="lp-h2">Your phone and your browser, on the same page.</h2>
              <p className="lp-sync-lede">
                Turn on Google Drive sync and every change reaches your other devices within seconds. It is kept in your
                own Drive, in a folder only SpendTrak can open.
              </p>
              <dl className="lp-facts">
                <div>
                  <dt>Automatic or manual</dt>
                  <dd>Sync every change, or back up only when you say so.</dd>
                </div>
                <div>
                  <dt>Nothing gets lost</dt>
                  <dd>Edits and deletions from both devices merge, record by record.</dd>
                </div>
                <div>
                  <dt>A week of copies</dt>
                  <dd>Restore any of the last seven days if something goes wrong.</dd>
                </div>
              </dl>
              <div className="lp-actions">
                <a className="st-btn st-btn--light" href={ANDROID_RELEASES_URL} target="_blank" rel="noopener noreferrer">
                  <i className="fa-brands fa-android" aria-hidden="true" /> Download for Android
                </a>
                <span className="lp-sync-meta">Free. Android 7.0 or newer.</span>
              </div>
            </Reveal>

            <div className="lp-sync-visual" aria-hidden="true">
              <div className="st-browser lp-sync-browser">
                <div className="st-browser-bar">
                  <i /><i /><i />
                  <span className="st-browser-url">spendtrak.vercel.app</span>
                </div>
                <img src="/screens/web-analytics.jpg" alt="" width="1600" height="1000" loading="lazy" />
              </div>
              <span className="lp-sync-badge">
                <i className="fa-solid fa-cloud" /> Synced just now
              </span>
              <div className="st-phone lp-sync-phone">
                <img src="/screens/android-home.jpg" alt="" width="540" height="1200" loading="lazy" />
              </div>
            </div>
          </div>
        </section>

        {/* The details */}
        <section className="lp-details" aria-labelledby="details-title">
          <div className="st-wrap lp-details-grid">
            <Reveal>
              <h2 id="details-title" className="lp-h2">And the details you would hope for.</h2>
              <p className="lp-details-lede">
                Small things that make it pleasant to open every day. <Link href="/features">See every feature</Link>.
              </p>
            </Reveal>
            <ul className="lp-details-list">
              {DETAILS.map((d, i) => (
                <Reveal as="li" key={d.title} delay={i * 50}>
                  <i className={d.icon} aria-hidden="true" />
                  <div>
                    <h3>{d.title}</h3>
                    <p>{d.body}</p>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>

        {/* Close */}
        <section className="lp-close">
          <Reveal className="st-wrap lp-close-inner">
            <img src="/logo-icon.svg" alt="" className="lp-close-mark" width="64" height="64" />
            <h2 className="lp-h2">Start with what you spent today.</h2>
            <p>It takes about thirty seconds. No account, no card, nothing to install.</p>
            <div className="lp-actions lp-actions--center">
              <button className="st-btn st-btn--primary" onClick={handleGetStarted}>
                Start tracking
              </button>
              <Link href="/android" className="st-btn st-btn--ghost">
                <i className="fa-brands fa-android" aria-hidden="true" /> Get the Android app
              </Link>
            </div>
          </Reveal>
        </section>
      </main>

      <MarketingFooter
        showCoindropButton={
          <button className="lp-coffee-link" onClick={() => setShowCoindrop(true)}>
            Buy me a coffee
          </button>
        }
      />

      {showCoindrop && (
        <div className="coindrop-overlay" onClick={() => setShowCoindrop(false)}>
          <div className="coindrop-popup" onClick={(e) => e.stopPropagation()}>
            <div className="coindrop-header">
              <h3 className="coindrop-title">Support SpendTrak</h3>
              <button className="coindrop-close" onClick={() => setShowCoindrop(false)} aria-label="Close">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <iframe src="https://coindrop.to/mathinraj" className="coindrop-iframe" title="Support Mathinraj on Coindrop" />
          </div>
        </div>
      )}
    </div>
  );
}
