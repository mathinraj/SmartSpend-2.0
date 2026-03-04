'use client';

import { useState, useRef } from 'react';
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

  const fileInputRef = useRef(null);
  const [importMode, setImportMode] = useState(null); // 'replace' | 'merge'

  function buildExportData() {
    return {
      _app: 'Spendimeter',
      _version: '1.2',
      _exportedAt: new Date().toISOString(),
      settings: { ...settings, onboardStep: undefined },
      accounts,
      transactions,
      categories: state.categories,
      plannedPayments: state.plannedPayments,
    };
  }

  function handleExportJSON() {
    const data = buildExportData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spendimeter-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Backup exported as JSON', 'success');
  }

  function handleExportCSV() {
    if (transactions.length === 0) {
      toast('No transactions to export', 'warning');
      return;
    }
    const accountMap = {};
    accounts.forEach((a) => { accountMap[a.id] = a.name; });

    const escCSV = (val) => {
      if (val == null) return '';
      const s = String(val);
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const headers = ['Date', 'Type', 'Amount', 'Category', 'Subcategory', 'Account', 'From Account', 'To Account', 'Note', 'Payment App'];
    const rows = transactions.map((t) => [
      t.date || '',
      t.type || '',
      t.amount || 0,
      t.category || '',
      t.subcategory || '',
      accountMap[t.accountId] || '',
      accountMap[t.fromAccountId] || '',
      accountMap[t.toAccountId] || '',
      t.note || '',
      t.paymentApp || '',
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.map(escCSV).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spendimeter-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Transactions exported as CSV', 'success');
  }

  function triggerImport(mode) {
    setImportMode(mode);
    fileInputRef.current?.click();
  }

  function handleFileSelected(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (!file.name.endsWith('.json')) {
      toast('Please select a .json backup file', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data._app && !data.accounts && !data.transactions) {
          toast('Invalid backup file format', 'error');
          return;
        }

        if (importMode === 'replace') {
          if (!window.confirm('This will replace ALL your current data with the backup. Continue?')) return;
          dispatch({ type: 'IMPORT_DATA', payload: data });
          toast(`Data restored! ${(data.accounts || []).length} accounts, ${(data.transactions || []).length} transactions.`, 'success', 4000);
        } else {
          dispatch({ type: 'MERGE_IMPORT_DATA', payload: data });
          toast('Data merged! Only new items were added.', 'success', 4000);
        }
      } catch {
        toast('Failed to read backup file. Make sure it\'s a valid Spendimeter JSON export.', 'error', 4000);
      }
    };
    reader.readAsText(file);
  }

  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pinStep, setPinStep] = useState('new');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const hasAppLock = typeof window !== 'undefined' && !!localStorage.getItem('spendimeter_app_lock');

  function hashPin(val) {
    let hash = 0;
    for (let i = 0; i < val.length; i++) {
      const char = val.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return 'pin_' + Math.abs(hash).toString(36);
  }

  function handleSetPin() {
    if (newPin.length !== 4) {
      toast('PIN must be 4 digits', 'error');
      return;
    }
    if (pinStep === 'new') {
      setPinStep('confirm');
      setConfirmPin('');
      return;
    }
    if (confirmPin !== newPin) {
      toast('PINs do not match. Try again.', 'error');
      setPinStep('new');
      setNewPin('');
      setConfirmPin('');
      return;
    }
    localStorage.setItem('spendimeter_app_lock', hashPin(newPin));
    updatePref('appLockEnabled', true);
    toast('App lock enabled!', 'success');
    setShowPinSetup(false);
    setNewPin('');
    setConfirmPin('');
    setPinStep('new');
  }

  function handleRemoveLock() {
    if (window.confirm('Remove app lock? Anyone will be able to open the app.')) {
      localStorage.removeItem('spendimeter_app_lock');
      updatePref('appLockEnabled', false);
      toast('App lock removed', 'info');
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
              <p className="pref-row-label">Track payment app / UPI</p>
              <p className="pref-row-desc">Add an optional field to record which app was used (GPay, PhonePe, etc.)</p>
            </div>
            <label className="pref-toggle">
              <input
                type="checkbox"
                checked={settings.trackPaymentApp !== false}
                onChange={(e) => updatePref('trackPaymentApp', e.target.checked)}
              />
              <span className="pref-toggle-slider" />
            </label>
          </div>

          <div className="pref-divider" />

          <div className="pref-row">
            <div className="pref-row-info">
              <p className="pref-row-label">Planned payments</p>
              <p className="pref-row-desc">Track recurring bills, subscriptions, and upcoming payments with due date reminders</p>
            </div>
            <label className="pref-toggle">
              <input
                type="checkbox"
                checked={settings.plannedEnabled === true}
                onChange={(e) => updatePref('plannedEnabled', e.target.checked)}
              />
              <span className="pref-toggle-slider" />
            </label>
          </div>

          <div className="pref-divider" />

          <div className="pref-row">
            <div className="pref-row-info">
              <p className="pref-row-label">Split expense tracking</p>
              <p className="pref-row-desc">Track shared expenses, per-person balances, and settlements with roommates or friends</p>
            </div>
            <label className="pref-toggle">
              <input
                type="checkbox"
                checked={settings.splitEnabled === true}
                onChange={(e) => updatePref('splitEnabled', e.target.checked)}
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

      {/* Backup & Sync */}
      <div className="pref-section">
        <h3 className="pref-section-title">
          <i className="fa-solid fa-cloud-arrow-up" /> Backup &amp; Sync
        </h3>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleFileSelected}
        />

        <div className="pref-card">
          <div className="pref-row">
            <div className="pref-row-info">
              <p className="pref-row-label">Export as JSON</p>
              <p className="pref-row-desc">Full backup of all data — accounts, transactions, categories, settings</p>
            </div>
            <button className="pref-btn outline" onClick={handleExportJSON}>
              <i className="fa-solid fa-download" /> Export
            </button>
          </div>

          <div className="pref-divider" />

          <div className="pref-row">
            <div className="pref-row-info">
              <p className="pref-row-label">Export as CSV</p>
              <p className="pref-row-desc">Transactions only — open in Excel, Google Sheets, etc.</p>
            </div>
            <button className="pref-btn outline" onClick={handleExportCSV}>
              <i className="fa-solid fa-file-csv" /> Export
            </button>
          </div>

          <div className="pref-divider" />

          <div className="pref-row">
            <div className="pref-row-info">
              <p className="pref-row-label">Import backup (replace)</p>
              <p className="pref-row-desc">Restore from a JSON backup — replaces all current data</p>
            </div>
            <button className="pref-btn outline" onClick={() => triggerImport('replace')}>
              <i className="fa-solid fa-upload" /> Import
            </button>
          </div>

          <div className="pref-divider" />

          <div className="pref-row">
            <div className="pref-row-info">
              <p className="pref-row-label">Import backup (merge)</p>
              <p className="pref-row-desc">Add missing accounts &amp; transactions from a backup without duplicating</p>
            </div>
            <button className="pref-btn outline" onClick={() => triggerImport('merge')}>
              <i className="fa-solid fa-code-merge" /> Merge
            </button>
          </div>

          <div className="pref-divider" />

          <div className="pref-row backup-gdrive-row">
            <div className="pref-row-info">
              <p className="pref-row-label">
                <i className="fa-brands fa-google-drive" style={{ marginRight: 6, color: '#4285F4' }} />
                Google Drive sync
              </p>
              <p className="pref-row-desc">Auto-sync your data to your own Google Drive for cross-device access</p>
            </div>
            <span className="pref-badge coming-soon-badge">Coming soon</span>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="pref-section">
        <h3 className="pref-section-title">
          <i className="fa-solid fa-shield-halved" /> Security
        </h3>

        <div className="pref-card">
          <div className="pref-row">
            <div className="pref-row-info">
              <p className="pref-row-label">App Lock</p>
              <p className="pref-row-desc">
                {hasAppLock
                  ? 'PIN lock is active. App locks when you switch away.'
                  : 'Set a 4-digit PIN to protect your financial data'}
              </p>
            </div>
            {hasAppLock ? (
              <button className="pref-btn danger" onClick={handleRemoveLock}>
                <i className="fa-solid fa-lock-open" /> Remove
              </button>
            ) : (
              <button className="pref-btn outline" onClick={() => { setShowPinSetup(true); setPinStep('new'); setNewPin(''); setConfirmPin(''); }}>
                <i className="fa-solid fa-lock" /> Set PIN
              </button>
            )}
          </div>

          {hasAppLock && (
            <>
              <div className="pref-divider" />
              <div className="pref-row">
                <div className="pref-row-info">
                  <p className="pref-row-label">Change PIN</p>
                  <p className="pref-row-desc">Set a new 4-digit PIN</p>
                </div>
                <button className="pref-btn outline" onClick={() => { setShowPinSetup(true); setPinStep('new'); setNewPin(''); setConfirmPin(''); }}>
                  <i className="fa-solid fa-key" /> Change
                </button>
              </div>
            </>
          )}
        </div>

        {showPinSetup && (
          <div className="pin-setup-card">
            <p className="pin-setup-title">
              {pinStep === 'new' ? 'Enter new 4-digit PIN' : 'Confirm your PIN'}
            </p>
            <div className="pin-setup-input-row">
              <input
                type="tel"
                className="pin-setup-input"
                maxLength={4}
                value={pinStep === 'new' ? newPin : confirmPin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                  if (pinStep === 'new') setNewPin(val);
                  else setConfirmPin(val);
                }}
                placeholder="••••"
                autoFocus
              />
            </div>
            <div className="pin-setup-dots">
              {Array.from({ length: 4 }).map((_, i) => (
                <span key={i} className={`pin-dot ${i < (pinStep === 'new' ? newPin : confirmPin).length ? 'filled' : ''}`} />
              ))}
            </div>
            <div className="pin-setup-actions">
              <button className="btn btn-sm btn-outline" onClick={() => { setShowPinSetup(false); setNewPin(''); setConfirmPin(''); }}>Cancel</button>
              <button
                className="btn btn-sm btn-primary"
                onClick={handleSetPin}
                disabled={(pinStep === 'new' ? newPin : confirmPin).length !== 4}
              >
                {pinStep === 'new' ? 'Next' : 'Set PIN'}
              </button>
            </div>
          </div>
        )}
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
          <p>Made with ❤️ by <span className="pref-developer-name">Mathinraj</span></p>
          <div className="pref-developer-links">
            <a href="https://buymeacoffee.com/user" target="_blank" rel="noopener noreferrer" className="pref-dev-link">
              <i className="fa-solid fa-mug-hot" /> Buy me a coffee
            </a>
            <a href="https://www.linkedin.com/in" target="_blank" rel="noopener noreferrer" className="pref-dev-link pref-dev-link-linkedin">
              <i className="fa-brands fa-linkedin" /> LinkedIn
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
