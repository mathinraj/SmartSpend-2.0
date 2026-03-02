'use client';

import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/Toast';
import { CURRENCIES } from '../utils/currencies';
import { hasSampleData } from '../utils/sampleData';
import { generateId } from '../utils/helpers';
import './Preferences.css';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function createDefaultReminder() {
  return {
    id: generateId(),
    label: 'Log expenses',
    message: "Don't forget to log your expenses today!",
    time: '20:00',
    frequency: 'daily',
    day: 0,
    intervalMinutes: 60,
    enabled: true,
  };
}

export default function Preferences() {
  const { state, dispatch } = useApp();
  const { settings, accounts, transactions } = state;
  const sampleLoaded = hasSampleData(accounts);
  const toast = useToast();
  const [notifStatus, setNotifStatus] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  const [editingReminder, setEditingReminder] = useState(null);

  const reminders = settings.reminders || [];

  function updatePref(key, value) {
    dispatch({ type: 'UPDATE_SETTINGS', payload: { [key]: value } });
  }

  function updateReminders(updated) {
    updatePref('reminders', updated);
  }

  function addReminder() {
    const newReminder = createDefaultReminder();
    updateReminders([...reminders, newReminder]);
    setEditingReminder(newReminder.id);
    toast('New reminder added!', 'success');
  }

  function updateSingleReminder(id, changes) {
    updateReminders(reminders.map((r) => r.id === id ? { ...r, ...changes } : r));
  }

  function deleteReminder(id) {
    updateReminders(reminders.filter((r) => r.id !== id));
    if (editingReminder === id) setEditingReminder(null);
    toast('Reminder removed', 'info');
  }

  function toggleReminder(id) {
    updateReminders(reminders.map((r) => r.id === id ? { ...r, enabled: !r.enabled } : r));
  }

  async function handleEnableNotifications() {
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
      if (reminders.length === 0) {
        updateReminders([createDefaultReminder()]);
      }
      toast('Notifications enabled! You can now add and customize reminders.', 'success');
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
              <p className="pref-row-label">Dark mode</p>
              <p className="pref-row-desc">Switch to a darker theme that's easier on the eyes</p>
            </div>
            <label className="pref-toggle">
              <input
                type="checkbox"
                checked={settings.theme === 'dark'}
                onChange={(e) => updatePref('theme', e.target.checked ? 'dark' : 'light')}
              />
              <span className="pref-toggle-slider" />
            </label>
          </div>

          <div className="pref-divider" />

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

        {notifStatus !== 'granted' ? (
          <div className="pref-card">
            <div className="pref-row">
              <div className="pref-row-info">
                <p className="pref-row-label">Enable notifications</p>
                <p className="pref-row-desc">
                  {notifStatus === 'denied'
                    ? 'Notifications blocked in browser settings'
                    : 'Allow notifications to set up customizable reminders'}
                </p>
              </div>
              <button className="pref-btn outline" onClick={handleEnableNotifications} disabled={notifStatus === 'denied'}>
                <i className="fa-solid fa-bell" /> Enable
              </button>
            </div>
          </div>
        ) : (
          <>
            {reminders.map((reminder) => (
              <div key={reminder.id} className="pref-card reminder-card">
                <div className="pref-row">
                  <div className="pref-row-info">
                    <p className="pref-row-label">{reminder.label || 'Reminder'}</p>
                    <p className="pref-row-desc">
                      {reminder.frequency === 'interval'
                        ? `Every ${reminder.intervalMinutes || 60} min`
                        : reminder.frequency === 'weekly'
                        ? `${DAY_NAMES[reminder.day ?? 0]} at ${reminder.time || '20:00'}`
                        : `Daily at ${reminder.time || '20:00'}`}
                    </p>
                  </div>
                  <div className="reminder-actions">
                    <button
                      className="pref-btn-icon"
                      onClick={() => setEditingReminder(editingReminder === reminder.id ? null : reminder.id)}
                      title="Edit"
                    >
                      <i className={`fa-solid ${editingReminder === reminder.id ? 'fa-chevron-up' : 'fa-pen'}`} />
                    </button>
                    <label className="pref-toggle">
                      <input
                        type="checkbox"
                        checked={reminder.enabled}
                        onChange={() => toggleReminder(reminder.id)}
                      />
                      <span className="pref-toggle-slider" />
                    </label>
                  </div>
                </div>

                {editingReminder === reminder.id && (
                  <div className="reminder-edit-panel">
                    <div className="reminder-edit-row">
                      <label className="reminder-edit-label">Label</label>
                      <input
                        type="text"
                        className="reminder-edit-input"
                        value={reminder.label || ''}
                        onChange={(e) => updateSingleReminder(reminder.id, { label: e.target.value })}
                        placeholder="e.g. Morning check"
                      />
                    </div>

                    <div className="reminder-edit-row">
                      <label className="reminder-edit-label">Message</label>
                      <input
                        type="text"
                        className="reminder-edit-input"
                        value={reminder.message || ''}
                        onChange={(e) => updateSingleReminder(reminder.id, { message: e.target.value })}
                        placeholder="Notification message"
                      />
                    </div>

                    <div className="reminder-edit-row">
                      <label className="reminder-edit-label">Frequency</label>
                      <select
                        className="pref-select"
                        value={reminder.frequency || 'daily'}
                        onChange={(e) => updateSingleReminder(reminder.id, { frequency: e.target.value })}
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="interval">Every X minutes</option>
                      </select>
                    </div>

                    {reminder.frequency === 'weekly' && (
                      <div className="reminder-edit-row">
                        <label className="reminder-edit-label">Day</label>
                        <select
                          className="pref-select"
                          value={reminder.day ?? 0}
                          onChange={(e) => updateSingleReminder(reminder.id, { day: parseInt(e.target.value) })}
                        >
                          {DAY_NAMES.map((day, i) => (
                            <option key={i} value={i}>{day}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {reminder.frequency === 'interval' ? (
                      <div className="reminder-edit-row">
                        <label className="reminder-edit-label">Interval (minutes)</label>
                        <input
                          type="number"
                          className="reminder-edit-input reminder-edit-input-sm"
                          value={reminder.intervalMinutes || 60}
                          min={5}
                          onChange={(e) => updateSingleReminder(reminder.id, { intervalMinutes: Math.max(5, parseInt(e.target.value) || 5) })}
                        />
                      </div>
                    ) : (
                      <div className="reminder-edit-row">
                        <label className="reminder-edit-label">Time</label>
                        <input
                          type="time"
                          className="pref-time-input"
                          value={reminder.time || '20:00'}
                          onChange={(e) => updateSingleReminder(reminder.id, { time: e.target.value })}
                        />
                      </div>
                    )}

                    <button className="pref-btn danger reminder-delete-btn" onClick={() => deleteReminder(reminder.id)}>
                      <i className="fa-solid fa-trash-can" /> Remove this reminder
                    </button>
                  </div>
                )}
              </div>
            ))}

            <button className="reminder-add-btn" onClick={addReminder}>
              <i className="fa-solid fa-plus" /> Add another reminder
            </button>

            <div className="pref-card" style={{ marginTop: 16 }}>
              <div className="pref-row">
                <div className="pref-row-info">
                  <p className="pref-row-label">Do Not Disturb</p>
                  <p className="pref-row-desc">Pause all reminders during a time window</p>
                </div>
                <label className="pref-toggle">
                  <input
                    type="checkbox"
                    checked={settings.dndEnabled === true}
                    onChange={(e) => updatePref('dndEnabled', e.target.checked)}
                  />
                  <span className="pref-toggle-slider" />
                </label>
              </div>

              {settings.dndEnabled && (
                <>
                  <div className="pref-divider" />
                  <div className="pref-row">
                    <div className="pref-row-info">
                      <p className="pref-row-label">Quiet hours</p>
                      <p className="pref-row-desc">No notifications during this period</p>
                    </div>
                    <div className="dnd-time-range">
                      <input
                        type="time"
                        className="pref-time-input"
                        value={settings.dndStart || '23:00'}
                        onChange={(e) => updatePref('dndStart', e.target.value)}
                      />
                      <span className="dnd-separator">to</span>
                      <input
                        type="time"
                        className="pref-time-input"
                        value={settings.dndEnd || '07:00'}
                        onChange={(e) => updatePref('dndEnd', e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}
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

        <div className="pref-developer-credit">
          <p>Made with ❤️ by <span className="pref-developer-name">Mathinraj</span> 💚</p>
        </div>
      </div>
    </div>
  );
}
