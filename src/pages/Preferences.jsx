import { useApp } from '../context/AppContext';
import { CURRENCIES } from '../utils/currencies';
import { hasSampleData } from '../utils/sampleData';
import './Preferences.css';

export default function Preferences() {
  const { state, dispatch } = useApp();
  const { settings, accounts, transactions } = state;
  const sampleLoaded = hasSampleData(accounts);

  function updatePref(key, value) {
    dispatch({ type: 'UPDATE_SETTINGS', payload: { [key]: value } });
  }

  function handleRemoveSample() {
    if (window.confirm('Remove all sample data? Your own data will be kept.')) {
      dispatch({ type: 'REMOVE_SAMPLE_DATA' });
    }
  }

  function handleResetAll() {
    if (window.confirm('This will delete ALL your data and reset the app. Are you sure?')) {
      dispatch({ type: 'RESET_DATA' });
    }
  }

  const currentCurrency = CURRENCIES.find((c) => c.code === settings.currency);

  return (
    <div className="page">
      <h1 className="page-title">Preferences</h1>

      {/* Appearance */}
      <div className="pref-section">
        <h3 className="pref-section-title">
          <i className="fa-solid fa-palette" /> Appearance
        </h3>

        <div className="pref-card">
          <div className="pref-row">
            <div className="pref-row-info">
              <p className="pref-row-label">Show balance on top</p>
              <p className="pref-row-desc">By default, monthly expenses are shown. Enable to show total balance instead</p>
            </div>
            <label className="pref-toggle">
              <input
                type="checkbox"
                checked={settings.homeView === 'balance'}
                onChange={(e) => updatePref('homeView', e.target.checked ? 'balance' : 'expenses')}
              />
              <span className="pref-toggle-slider" />
            </label>
          </div>

          <div className="pref-divider" />

          <div className="pref-row">
            <div className="pref-row-info">
              <p className="pref-row-label">Show income/expense in balance card</p>
              <p className="pref-row-desc">Display monthly income and expense stats below the main card</p>
            </div>
            <label className="pref-toggle">
              <input
                type="checkbox"
                checked={settings.showBalanceStats !== false}
                onChange={(e) => updatePref('showBalanceStats', e.target.checked)}
              />
              <span className="pref-toggle-slider" />
            </label>
          </div>
        </div>
      </div>

      {/* Currency */}
      <div className="pref-section">
        <h3 className="pref-section-title">
          <i className="fa-solid fa-coins" /> Currency
        </h3>

        <div className="pref-card">
          <div className="pref-row">
            <div className="pref-row-info">
              <p className="pref-row-label">Primary currency</p>
              <p className="pref-row-desc">
                {currentCurrency ? `${currentCurrency.flag} ${currentCurrency.name} (${currentCurrency.symbol})` : settings.currency}
              </p>
            </div>
            <select
              className="pref-select"
              value={settings.currency}
              onChange={(e) => updatePref('currency', e.target.value)}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div className="pref-section">
        <h3 className="pref-section-title">
          <i className="fa-solid fa-receipt" /> Transactions
        </h3>

        <div className="pref-card">
          <div className="pref-row">
            <div className="pref-row-info">
              <p className="pref-row-label">Confirm before delete</p>
              <p className="pref-row-desc">Show confirmation dialog when deleting transactions</p>
            </div>
            <label className="pref-toggle">
              <input
                type="checkbox"
                checked={settings.confirmDelete !== false}
                onChange={(e) => updatePref('confirmDelete', e.target.checked)}
              />
              <span className="pref-toggle-slider" />
            </label>
          </div>

          <div className="pref-divider" />

          <div className="pref-row">
            <div className="pref-row-info">
              <p className="pref-row-label">Default transaction type</p>
              <p className="pref-row-desc">Pre-select this type when adding a new transaction</p>
            </div>
            <select
              className="pref-select"
              value={settings.defaultTxnType || 'expense'}
              onChange={(e) => updatePref('defaultTxnType', e.target.value)}
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
              <option value="transfer">Transfer</option>
            </select>
          </div>
        </div>
      </div>

      {/* Data */}
      <div className="pref-section">
        <h3 className="pref-section-title">
          <i className="fa-solid fa-database" /> Data Management
        </h3>

        <div className="pref-card">
          <div className="pref-row">
            <div className="pref-row-info">
              <p className="pref-row-label">Storage</p>
              <p className="pref-row-desc">
                {accounts.length} accounts · {transactions.length} transactions
              </p>
            </div>
            <span className="pref-badge">Local</span>
          </div>

          {!sampleLoaded && (
            <>
              <div className="pref-divider" />
              <div className="pref-row">
                <div className="pref-row-info">
                  <p className="pref-row-label">Sample data</p>
                  <p className="pref-row-desc">Load demo accounts and transactions to explore</p>
                </div>
                <button className="pref-btn outline" onClick={() => dispatch({ type: 'LOAD_SAMPLE_DATA' })}>
                  <i className="fa-solid fa-flask" /> Load
                </button>
              </div>
            </>
          )}

          {sampleLoaded && (
            <>
              <div className="pref-divider" />
              <div className="pref-row">
                <div className="pref-row-info">
                  <p className="pref-row-label">Sample data loaded</p>
                  <p className="pref-row-desc">Remove demo data while keeping your own</p>
                </div>
                <button className="pref-btn danger" onClick={handleRemoveSample}>
                  <i className="fa-solid fa-trash-can" /> Remove
                </button>
              </div>
            </>
          )}

          <div className="pref-divider" />

          <div className="pref-row">
            <div className="pref-row-info">
              <p className="pref-row-label danger-text">Reset everything</p>
              <p className="pref-row-desc">Delete all data and return to initial setup</p>
            </div>
            <button className="pref-btn danger" onClick={handleResetAll}>
              <i className="fa-solid fa-rotate-left" /> Reset
            </button>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="pref-section">
        <h3 className="pref-section-title">
          <i className="fa-solid fa-circle-info" /> About
        </h3>

        <div className="pref-card">
          <div className="pref-row">
            <div className="pref-row-info">
              <p className="pref-row-label">SmartSpend</p>
              <p className="pref-row-desc">Version 1.0 · Your money, your rules.</p>
            </div>
            <span className="pref-badge">v1.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}
