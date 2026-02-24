import { NavLink, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { hasSampleData } from '../utils/sampleData';
import './Sidebar.css';

const navItems = [
  { path: '/', icon: 'fa-solid fa-house', label: 'Dashboard' },
  { path: '/add', icon: 'fa-solid fa-plus-circle', label: 'Add Transaction' },
  { path: '/transactions', icon: 'fa-solid fa-clock-rotate-left', label: 'History' },
  { path: '/accounts', icon: 'fa-solid fa-wallet', label: 'Accounts' },
  { path: '/categories', icon: 'fa-solid fa-tags', label: 'Categories' },
  { path: '/analytics', icon: 'fa-solid fa-chart-pie', label: 'Analytics' },
];

export default function Sidebar() {
  const { state, dispatch } = useApp();
  const sampleLoaded = hasSampleData(state.accounts);

  function handleRemoveSample() {
    if (window.confirm('Remove all sample data? Your own data will be kept.')) {
      dispatch({ type: 'REMOVE_SAMPLE_DATA' });
    }
  }

  return (
    <aside className="sidebar">
      <Link to="/" className="sidebar-brand">
        <span className="sidebar-logo">💰</span>
        <h2 className="sidebar-title">Spendimeter</h2>
      </Link>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <i className={`${item.icon} sidebar-link-icon`} />
            <span className="sidebar-link-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {sampleLoaded && (
        <button className="sidebar-remove-sample" onClick={handleRemoveSample}>
          <i className="fa-solid fa-flask-vial" />
          <span>Remove Sample Data</span>
        </button>
      )}

      <NavLink
        to="/preferences"
        className={({ isActive }) => `sidebar-link sidebar-prefs-link ${isActive ? 'active' : ''}`}
      >
        <i className="fa-solid fa-gear sidebar-link-icon" />
        <span className="sidebar-link-label">Preferences</span>
      </NavLink>

      <div className="sidebar-footer">
        <p className="sidebar-footer-text">Spendimeter v1.1</p>
        <p className="sidebar-footer-sub">Data stored locally</p>
      </div>
    </aside>
  );
}
