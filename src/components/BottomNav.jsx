import { NavLink } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { hasSampleData } from '../utils/sampleData';
import './BottomNav.css';

const navItems = [
  { path: '/', icon: 'fa-solid fa-house', label: 'Home' },
  { path: '/transactions', icon: 'fa-solid fa-clock-rotate-left', label: 'History' },
  { path: '/add', icon: 'fa-solid fa-plus', label: 'Add', isCenter: true },
  { path: '/accounts', icon: 'fa-solid fa-wallet', label: 'Accounts' },
  { path: '/analytics', icon: 'fa-solid fa-chart-pie', label: 'Analytics' },
];

export default function BottomNav() {
  const { state, dispatch } = useApp();
  const sampleLoaded = hasSampleData(state.accounts);

  function handleRemoveSample() {
    if (window.confirm('Remove all sample data? Your own data will be kept.')) {
      dispatch({ type: 'REMOVE_SAMPLE_DATA' });
    }
  }

  return (
    <nav className="bottom-nav">
      {sampleLoaded && (
        <div className="bottom-nav-sample-bar">
          <span><i className="fa-solid fa-flask-vial" /> Sample data loaded</span>
          <button onClick={handleRemoveSample}>
            <i className="fa-solid fa-trash-can" /> Remove
          </button>
        </div>
      )}
      <div className="bottom-nav-inner">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'active' : ''} ${item.isCenter ? 'nav-center' : ''}`
            }
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
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
