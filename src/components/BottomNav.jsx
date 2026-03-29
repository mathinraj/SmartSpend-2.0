'use client';

import { usePathname, useRouter } from 'next/navigation';
import './BottomNav.css';

const navItems = [
  { path: '/', icon: 'fa-solid fa-house', label: 'Home' },
  { path: '/transactions', icon: 'fa-solid fa-clock-rotate-left', label: 'History' },
  { path: '/add', icon: 'fa-solid fa-plus', label: 'Add', isCenter: true },
  { path: '/accounts', icon: 'fa-solid fa-wallet', label: 'Accounts' },
  { path: '/analytics', icon: 'fa-solid fa-chart-pie', label: 'Analytics' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  function isActive(path) {
    if (path === '/') return pathname === '/';
    return pathname === path;
  }

  function handleNav(e, path) {
    e.preventDefault();
    if (path === pathname) return;
    if (path === '/' || pathname === '/') {
      router.push(path);
    } else {
      router.replace(path);
    }
  }

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-inner">
        {navItems.map((item) => (
          <a
            key={item.path}
            href={item.path}
            className={`nav-item ${isActive(item.path) ? 'active' : ''} ${item.isCenter ? 'nav-center' : ''}`}
            onClick={(e) => handleNav(e, item.path)}
          >
            {item.isCenter ? (
              <span className="nav-center-btn">
                <i className={item.icon} />
              </span>
            ) : (
              <>
                <i className={`${item.icon} nav-icon`} />
                <span className="nav-label">{item.label}</span>
              </>
            )}
          </a>
        ))}
      </div>
    </nav>
  );
}
