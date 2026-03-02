'use client';

import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/Toast';
import { CURRENCIES } from '../utils/currencies';
import { hasSampleData } from '../utils/sampleData';
import './Preferences.css';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function Preferences() {
  const { state, dispatch } = useApp();
  const { settings, accounts, transactions } = state;
  const sampleLoaded = hasSampleData(accounts);
  const toast = useToast();
  const [notifStatus, setNotifStatus] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );

  function updatePref(key, value) {
    dispatch({ type: 'UPDATE_SETTINGS', payload: { [key]: value } });
  }

  async function handleEnableReminder() {
    if (!('Notification' in window)) {
      toast('Your browser does not support notifications.', 'error');
      return;
    }
    if (Notification.permission === 'denied') {
      toast('Notifications are blocked. Please enable them in your browser settings.', 'error', 5000);
      return;
    }
    toast('Please click "Allow" when your browser asks for notification permission.', 'info', 5000);
    const perm = await Notification.requestPermission();
    setNotifStatus(perm);
    if (perm === 'granted') {
      updatePref('reminderEnabled', true);
      if (!settings.reminderTime) updatePref('reminderTime', '20:00');
      if (!settings.reminderFrequency) updatePref('reminderFrequency', 'daily');
      toast('Reminders enabled successfully!', 'success');
    } else if (perm === 'denied') {
      toast('Notifications were denied. You can change this in your browser settings.', 'warning', 5000);
    }
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

          <div className="pref-divider" />

          <div className="pref-row">
            <div className="pref-row-info">
              <p className="pref-row-label">Show accounts on dashboard</p>
              <p className="pref-row-desc">Display the My Accounts section on the home page</p>
            </div>
            <label className="pref-toggle">
              <input
                type="checkbox"
                checked={settings.showAccountsOnHome !== false}
                onChange={(e) => updatePref('showAccountsOnHome', e.target.checked)}
              />
              <span className="pref-toggle-slider" />
            </label>
          </div>

          <div className="pref-divider" />

          <div className="pref-row">
            <div className="pref-row-info">
              <p className="pref-row-label">Hide balances</p>
              <p className="pref-row-desc">Mask all monetary amounts with *** for privacy</p>
            </div>
            <label className="pref-toggle">
              <input
                type="checkbox"
                checked={settings.hideBalances === true}
                onChange={(e) => updatePref('hideBalances', e.target.checked)}
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

      {/* Reminders */}
      <div className="pref-section">
        <h3 className="pref-section-title">
          <i className="fa-solid fa-bell" /> Reminders
        </h3>

        <div className="pref-card">
          <div className="pref-row">
            <div className="pref-row-info">
              <p className="pref-row-label">Enable reminders</p>
              <p className="pref-row-desc">
                {notifStatus === 'denied'
                  ? 'Notifications blocked in browser settings'
                  : 'Get notified to log your expenses'}
              </p>
            </div>
            {settings.reminderEnabled ? (
              <label className="pref-toggle">
                <input
                  type="checkbox"
                  checked={true}
                  onChange={() => updatePref('reminderEnabled', false)}
                />
                <span className="pref-toggle-slider" />
              </label>
            ) : (
              <button className="pref-btn outline" onClick={handleEnableReminder} disabled={notifStatus === 'denied'}>
                <i className="fa-solid fa-bell" /> Enable
              </button>
            )}
          </div>

          {settings.reminderEnabled && (
            <>
              <div className="pref-divider" />
              <div className="pref-row">
                <div className="pref-row-info">
                  <p className="pref-row-label">Frequency</p>
                  <p className="pref-row-desc">How often to remind you</p>
                </div>
                <select
                  className="pref-select"
                  value={settings.reminderFrequency || 'daily'}
                  onChange={(e) => updatePref('reminderFrequency', e.target.value)}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>

              {settings.reminderFrequency === 'weekly' && (
                <>
                  <div className="pref-divider" />
                  <div className="pref-row">
                    <div className="pref-row-info">
                      <p className="pref-row-label">Day of week</p>
                      <p className="pref-row-desc">Which day to send the reminder</p>
                    </div>
                    <select
                      className="pref-select"
                      value={settings.reminderDay ?? 0}
                      onChange={(e) => updatePref('reminderDay', parseInt(e.target.value))}
                    >
                      {DAY_NAMES.map((day, i) => (
                        <option key={i} value={i}>{day}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div className="pref-divider" />
              <div className="pref-row">
                <div className="pref-row-info">
                  <p className="pref-row-label">Reminder time</p>
                  <p className="pref-row-desc">When to send the notification</p>
                </div>
                <input
                  type="time"
                  className="pref-time-input"
                  value={settings.reminderTime || '20:00'}
                  onChange={(e) => updatePref('reminderTime', e.target.value)}
                />
              </div>
            </>
          )}
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
              <p className="pref-row-label">Spendimeter</p>
              <p className="pref-row-desc">Version 1.2 · Your money, your rules.</p>
            </div>
            <span className="pref-badge">v1.2</span>
          </div>
        </div>
      </div>
    </div>
  );
}
