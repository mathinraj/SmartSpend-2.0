'use client';

import { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { useToast } from '../components/Toast';
import { hasSampleData, SAMPLE_ACCOUNT_IDS } from '../utils/sampleData';
import { generateId } from '../utils/helpers';
import { formatCurrencyPlain } from '../utils/currencies';
import { exportToPDF, exportToXLSX } from '../utils/exportUtils';
import * as gDrive from '../utils/googleDrive';
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
  const sampleIdSet = new Set(SAMPLE_ACCOUNT_IDS);
  const hasUserData = accounts.some((a) => !sampleIdSet.has(a.id)) ||
    transactions.some((t) => {
      const refs = [t.accountId, t.fromAccountId, t.toAccountId].filter(Boolean);
      return refs.length > 0 && refs.every((id) => !sampleIdSet.has(id));
    });
  const toast = useToast();
  const isDesktop = useIsDesktop();
  const [notifStatus, setNotifStatus] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  const [editingReminder, setEditingReminder] = useState(null);

  const profilePhotoInputRef = useRef(null);
  const profileName = settings.profileName || '';
  const profilePhoto = typeof window !== 'undefined' ? localStorage.getItem('spendtraq_profile_photo') : null;

  function handleProfileNameChange(e) {
    updatePref('profileName', e.target.value);
  }

  function handleProfilePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast('Please select an image file', 'error');
      return;
    }
    if (file.size > 500 * 1024) {
      toast('Image too large. Max 500KB.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      localStorage.setItem('spendtraq_profile_photo', ev.target.result);
      updatePref('hasProfilePhoto', true);
      toast('Profile photo updated!', 'success');
    };
    reader.readAsDataURL(file);
  }

  function handleRemovePhoto() {
    localStorage.removeItem('spendtraq_profile_photo');
    dispatch({ type: 'UPDATE_SETTINGS', payload: { hasProfilePhoto: false, syncProfilePhoto: false } });
    toast('Profile photo removed', 'info');
  }

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
  const [importMode, setImportMode] = useState(null);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [showImportOptions, setShowImportOptions] = useState(false);

  function buildExportData() {
    return {
      _app: 'SpendTrak',
      _version: '2.0.2',
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
    a.download = `spendtraq-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    localStorage.setItem('spendtraq_last_backup_reminder', Date.now().toString());
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
    a.download = `spendtraq-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Transactions exported as CSV', 'success');
  }

  function handleExportPDF() {
    if (transactions.length === 0) { toast('No transactions to export', 'warning'); return; }
    const accountMap = {};
    accounts.forEach((a) => { accountMap[a.id] = a.name; });
    const cur = settings.currency;
    const fmt = (v) => formatCurrencyPlain(v, cur);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthTxns = transactions.filter((t) => new Date(t.date) >= monthStart && t.type !== 'transfer');
    const income = monthTxns.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = monthTxns.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    const tables = [
      {
        title: 'Monthly Summary',
        headers: ['Metric', 'Value'],
        rows: [
          ['Income', fmt(income)],
          ['Expense', fmt(expense)],
          ['Net', fmt(income - expense)],
          ['Accounts', String(accounts.length)],
          ['Total Transactions', String(transactions.length)],
        ],
      },
      {
        title: 'Transactions',
        headers: ['Date', 'Type', 'Amount', 'Category', 'Account', 'Note'],
        rows: transactions.slice(0, 500).map((t) => [
          t.date || '', t.type || '', fmt(t.amount),
          t.category || '', accountMap[t.accountId] || accountMap[t.fromAccountId] || '',
          t.note || '',
        ]),
      },
      {
        title: 'Accounts',
        headers: ['Name', 'Type', 'Balance'],
        rows: accounts.map((a) => [a.name, a.type, fmt(a.balance)]),
      },
    ];

    exportToPDF({ title: 'SpendTrak — Data Export', subtitle: `${accounts.length} accounts · ${transactions.length} transactions`, tables, filename: `spendtrak-export-${new Date().toISOString().slice(0, 10)}.pdf` });
    localStorage.setItem('spendtraq_last_backup_reminder', Date.now().toString());
    toast('Exported as PDF', 'success');
  }

  function handleExportXLSX() {
    if (transactions.length === 0) { toast('No transactions to export', 'warning'); return; }
    const accountMap = {};
    accounts.forEach((a) => { accountMap[a.id] = a.name; });

    const sheets = [
      {
        name: 'Transactions',
        headers: ['Date', 'Type', 'Amount', 'Category', 'Subcategory', 'Account', 'From Account', 'To Account', 'Note', 'Payment App'],
        rows: transactions.map((t) => [
          t.date || '', t.type || '', t.amount || 0, t.category || '', t.subcategory || '',
          accountMap[t.accountId] || '', accountMap[t.fromAccountId] || '', accountMap[t.toAccountId] || '',
          t.note || '', t.paymentApp || '',
        ]),
      },
      {
        name: 'Accounts',
        headers: ['Name', 'Type', 'Sub-type', 'Balance'],
        rows: accounts.map((a) => [a.name, a.type, a.subType || '', a.balance]),
      },
    ];

    const monthMap = {};
    transactions.filter((t) => t.type !== 'transfer').forEach((t) => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap[key]) monthMap[key] = { month: key, income: 0, expense: 0 };
      if (t.type === 'income') monthMap[key].income += t.amount;
      if (t.type === 'expense') monthMap[key].expense += t.amount;
    });
    const summaryRows = Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));
    sheets.push({
      name: 'Monthly Summary',
      headers: ['Month', 'Income', 'Expense', 'Net'],
      rows: summaryRows.map((r) => [r.month, r.income, r.expense, r.income - r.expense]),
    });

    exportToXLSX({ sheets, filename: `spendtrak-export-${new Date().toISOString().slice(0, 10)}.xlsx` });
    localStorage.setItem('spendtraq_last_backup_reminder', Date.now().toString());
    toast('Exported as XLSX', 'success');
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
        toast('Failed to read backup file. Make sure it\'s a valid SpendTrak JSON export.', 'error', 4000);
      }
    };
    reader.readAsText(file);
  }

  // Google Drive Sync
  const [gdriveLoading, setGdriveLoading] = useState(false);
  const [gdriveSyncing, setGdriveSyncing] = useState(false);
  const [gdriveUser, setGdriveUser] = useState(null);
  const gdriveConfigured = gDrive.isConfigured();
  const gdriveConnected = !!settings.gdriveEmail;

  useEffect(() => {
    if (gdriveConnected && gDrive.getAccessToken()) {
      gDrive.getUserInfo().then((info) => {
        if (info) setGdriveUser(info);
      });
    }
  }, [gdriveConnected]);

  async function handleGdriveConnect() {
    if (!gdriveConfigured) {
      toast('Google Drive is not configured. Add NEXT_PUBLIC_GOOGLE_CLIENT_ID to your environment.', 'error', 5000);
      return;
    }
    setGdriveLoading(true);
    try {
      await gDrive.loadGisScript();
      const token = await gDrive.requestAccessToken({ prompt: 'consent' });
      if (!token) {
        toast('Google sign-in was cancelled', 'warning');
        setGdriveLoading(false);
        return;
      }
      const userInfo = await gDrive.getUserInfo();
      if (userInfo) {
        setGdriveUser(userInfo);
        updatePref('gdriveEmail', userInfo.email);
        updatePref('gdriveName', userInfo.name);
        updatePref('gdrivePhoto', userInfo.picture);
        toast(`Connected as ${userInfo.email}`, 'success');
      }
    } catch (err) {
      console.error('GDrive connect error:', err);
      toast('Failed to connect Google Drive', 'error');
    }
    setGdriveLoading(false);
  }

  function handleGdriveDisconnect() {
    if (!window.confirm('Disconnect Google Drive? Your cloud backup will remain in your Drive.')) return;
    gDrive.revokeToken();
    setGdriveUser(null);
    dispatch({
      type: 'UPDATE_SETTINGS',
      payload: {
        gdriveEmail: null,
        gdriveName: null,
        gdrivePhoto: null,
        gdriveLastSync: null,
        gdriveAutoSync: false,
      },
    });
    toast('Google Drive disconnected', 'info');
  }

  function buildSyncPayload() {
    const payload = {
      settings: { ...settings, onboardStep: undefined, gdriveEmail: undefined, gdriveName: undefined, gdrivePhoto: undefined, gdriveLastSync: undefined, balancePeekUntil: undefined },
      accounts,
      transactions,
      categories: state.categories,
      plannedPayments: state.plannedPayments,
      splitLedger: state.splitLedger,
    };
    if (settings.syncProfilePhoto) {
      const photo = typeof window !== 'undefined' ? localStorage.getItem('spendtraq_profile_photo') : null;
      if (photo) payload.profilePhoto = photo;
    }
    return payload;
  }

  async function ensureToken() {
    const token = await gDrive.ensureTokenSilently();
    return !!token;
  }

  async function handleGdrivePush() {
    setGdriveSyncing(true);
    try {
      if (!(await ensureToken())) {
        toast('Please reconnect Google Drive — session expired', 'warning');
        setGdriveSyncing(false);
        return;
      }
      await gDrive.uploadSyncData(buildSyncPayload());
      const now = new Date().toISOString();
      updatePref('gdriveLastSync', now);
      toast('Data pushed to Google Drive', 'success');
    } catch (err) {
      if (err.message === 'AUTH_EXPIRED') {
        toast('Session expired. Please reconnect Google Drive.', 'warning');
        handleGdriveDisconnect();
      } else {
        console.error('GDrive push error:', err);
        toast('Failed to push data to Google Drive', 'error');
      }
    }
    setGdriveSyncing(false);
  }

  async function handleGdrivePull() {
    setGdriveSyncing(true);
    try {
      if (!(await ensureToken())) {
        toast('Please reconnect Google Drive — session expired', 'warning');
        setGdriveSyncing(false);
        return;
      }
      const data = await gDrive.downloadSyncData();
      if (!data) {
        toast('No backup found in your Google Drive', 'info');
        setGdriveSyncing(false);
        return;
      }
      if (data.settings) {
        const { onboardStep, gdriveEmail, gdriveName, gdrivePhoto, gdriveLastSync, ...restoredSettings } = data.settings;
        dispatch({ type: 'UPDATE_SETTINGS', payload: restoredSettings });
      }
      if (data.profilePhoto) {
        localStorage.setItem('spendtraq_profile_photo', data.profilePhoto);
        dispatch({ type: 'UPDATE_SETTINGS', payload: { hasProfilePhoto: true } });
      }
      dispatch({ type: 'MERGE_IMPORT_DATA', payload: data });
      const now = new Date().toISOString();
      updatePref('gdriveLastSync', now);
      toast('Data and settings restored from Google Drive', 'success');
    } catch (err) {
      if (err.message === 'AUTH_EXPIRED') {
        toast('Session expired. Please reconnect Google Drive.', 'warning');
        handleGdriveDisconnect();
      } else {
        console.error('GDrive pull error:', err);
        toast('Failed to pull data from Google Drive', 'error');
      }
    }
    setGdriveSyncing(false);
  }

  async function handleGdriveDelete() {
    if (!window.confirm('Delete the backup from your Google Drive? This cannot be undone.')) return;
    setGdriveSyncing(true);
    try {
      if (!(await ensureToken())) {
        toast('Please reconnect Google Drive — session expired', 'warning');
        setGdriveSyncing(false);
        return;
      }
      await gDrive.deleteSyncFile();
      updatePref('gdriveLastSync', null);
      toast('Backup deleted from Google Drive', 'info');
    } catch (err) {
      if (err.message === 'AUTH_EXPIRED') {
        toast('Session expired. Please reconnect Google Drive.', 'warning');
        handleGdriveDisconnect();
      } else {
        console.error('GDrive delete error:', err);
        toast('Failed to delete backup', 'error');
      }
    }
    setGdriveSyncing(false);
  }

  function formatSyncTime(iso) {
    if (!iso) return 'Never';
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  const [showDashboardOptions, setShowDashboardOptions] = useState(false);
  const [showLockSetup, setShowLockSetup] = useState(false);
  const [lockSetupType, setLockSetupType] = useState('pin');
  const [lockStep, setLockStep] = useState('new');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const hasAppLock = typeof window !== 'undefined' && !!localStorage.getItem('spendtraq_app_lock');
  const currentLockType = typeof window !== 'undefined' ? (localStorage.getItem('spendtraq_lock_type') || 'pin') : 'pin';

  function hashValue(val) {
    let hash = 0;
    for (let i = 0; i < val.length; i++) {
      const char = val.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return 'pin_' + Math.abs(hash).toString(36);
  }

  function resetLockSetup() {
    setShowLockSetup(false);
    setLockStep('new');
    setNewPin('');
    setConfirmPin('');
    setNewPassword('');
    setConfirmPassword('');
  }

  function handleSetLock() {
    if (lockSetupType === 'pin') {
      if (newPin.length !== 4) { toast('PIN must be 4 digits', 'error'); return; }
      if (lockStep === 'new') { setLockStep('confirm'); setConfirmPin(''); return; }
      if (confirmPin !== newPin) {
        toast('PINs do not match. Try again.', 'error');
        setLockStep('new'); setNewPin(''); setConfirmPin('');
        return;
      }
      localStorage.setItem('spendtraq_app_lock', hashValue(newPin));
      localStorage.setItem('spendtraq_lock_type', 'pin');
    } else {
      if (newPassword.length < 4) { toast('Password must be at least 4 characters', 'error'); return; }
      if (lockStep === 'new') { setLockStep('confirm'); setConfirmPassword(''); return; }
      if (confirmPassword !== newPassword) {
        toast('Passwords do not match. Try again.', 'error');
        setLockStep('new'); setNewPassword(''); setConfirmPassword('');
        return;
      }
      localStorage.setItem('spendtraq_app_lock', hashValue(newPassword));
      localStorage.setItem('spendtraq_lock_type', 'password');
    }
    updatePref('appLockEnabled', true);
    toast('App lock enabled!', 'success');
    resetLockSetup();
  }

  function handleRemoveLock() {
    if (window.confirm('Remove app lock? Anyone will be able to open the app.')) {
      localStorage.removeItem('spendtraq_app_lock');
      localStorage.removeItem('spendtraq_lock_type');
      updatePref('appLockEnabled', false);
      toast('App lock removed', 'info');
    }
  }

  return (
    <div className="page">
      <h1 className="page-title">Preferences</h1>

      {/* Profile */}
      <div className="pref-section">
        <h3 className="pref-section-title">
          <i className="fa-solid fa-user" /> Profile
        </h3>

        <div className="pref-card">
          <div className="profile-section">
            <div className="profile-photo-area" onClick={() => profilePhotoInputRef.current?.click()}>
              {profilePhoto ? (
                <img src={profilePhoto} alt="" className="profile-photo" />
              ) : (
                <div className="profile-photo-placeholder">
                  <i className="fa-solid fa-camera" />
                </div>
              )}
              <input
                ref={profilePhotoInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleProfilePhotoUpload}
              />
            </div>
            <div className="profile-name-area">
              <input
                type="text"
                className="profile-name-input"
                placeholder="Your name"
                value={profileName}
                onChange={handleProfileNameChange}
                maxLength={30}
              />
            </div>
          </div>
          {profilePhoto && (
            <>
              <div className="pref-divider" />
              <div className="pref-row">
                <div className="pref-row-info">
                  <p className="pref-row-label">Backup photo to Google Drive</p>
                  <p className="pref-row-desc">Include your profile photo in cloud backups</p>
                </div>
                <label className="pref-toggle">
                  <input
                    type="checkbox"
                    checked={!!settings.syncProfilePhoto}
                    onChange={(e) => updatePref('syncProfilePhoto', e.target.checked)}
                  />
                  <span className="pref-toggle-slider" />
                </label>
              </div>
              <div className="pref-divider" />
              <div className="pref-row">
                <div className="pref-row-info">
                  <p className="pref-row-label">Remove photo</p>
                  <p className="pref-row-desc">{settings.syncProfilePhoto ? 'Photo will also be removed from future backups' : 'Photo is stored locally on this device only'}</p>
                </div>
                <button className="pref-btn danger" onClick={handleRemovePhoto}>
                  <i className="fa-solid fa-trash-can" /> Remove
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Appearance */}
      <div className="pref-section">
        <h3 className="pref-section-title">
          <i className="fa-solid fa-palette" /> Appearance
        </h3>

        <div className="pref-card">
          <div className="pref-row">
            <div className="pref-row-info">
              <p className="pref-row-label">Dark mode</p>
              <p className="pref-row-desc">Easier on the eyes in low light</p>
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

          <div
            className="pref-row"
            style={{ cursor: 'pointer' }}
            onClick={() => setShowDashboardOptions(!showDashboardOptions)}
          >
            <div className="pref-row-info">
              <p className="pref-row-label">Customize dashboard</p>
              <p className="pref-row-desc">Choose what to show on the home page</p>
            </div>
            <i className={`fa-solid fa-chevron-${showDashboardOptions ? 'up' : 'down'}`} style={{ color: 'var(--text-light)', fontSize: '0.75rem' }} />
          </div>

          {showDashboardOptions && (
            <div className="dashboard-options">
              {[
                { label: 'Show balance on top', desc: 'Total balance instead of monthly expenses', checked: settings.homeView === 'balance', onChange: (v) => updatePref('homeView', v ? 'balance' : 'expenses') },
                { label: 'Income/Expense stats', desc: 'Below the main balance card', checked: settings.showBalanceStats !== false, onChange: (v) => updatePref('showBalanceStats', v) },
                { label: 'Accounts section', desc: 'My Accounts on the home page', checked: settings.showAccountsOnHome !== false, onChange: (v) => updatePref('showAccountsOnHome', v) },
                ...(settings.splitEnabled ? [{ label: 'Split money', desc: '"Others owe you" card', checked: settings.showSplitOnHome !== false, onChange: (v) => updatePref('showSplitOnHome', v) }] : []),
                { label: 'Exclude credit cards', desc: 'Remove CC dues from total balance', checked: settings.excludeCCFromBalance === true, onChange: (v) => updatePref('excludeCCFromBalance', v) },
                { label: 'Hide balances', desc: 'Mask amounts with *** for privacy', checked: settings.hideBalances === true, onChange: (v) => updatePref('hideBalances', v) },
              ].map((item) => (
                <label key={item.label} className="dashboard-option-row">
                  <div className="dashboard-option-info">
                    <p className="dashboard-option-label">{item.label}</p>
                    <p className="dashboard-option-desc">{item.desc}</p>
                  </div>
                  <span className="pref-toggle" style={{ width: 38, height: 20 }}>
                    <input type="checkbox" checked={item.checked} onChange={(e) => item.onChange(e.target.checked)} />
                    <span className="pref-toggle-slider compact-slider" />
                  </span>
                </label>
              ))}
            </div>
          )}
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

          {settings.splitEnabled && (
            <>
              <div className="pref-divider" />
              <div className="pref-row">
                <div className="pref-row-info">
                  <p className="pref-row-label">Bank deduction on split</p>
                  <p className="pref-row-desc">How much to deduct from your account balance</p>
                </div>
                <select
                  className="pref-select"
                  value={settings.splitBankDeduction || 'full'}
                  onChange={(e) => updatePref('splitBankDeduction', e.target.value)}
                >
                  <option value="full">Full amount</option>
                  <option value="my_share">Only my share</option>
                </select>
              </div>

              <div className="pref-divider" />
              <div className="pref-row">
                <div className="pref-row-info">
                  <p className="pref-row-label">Record expense as</p>
                  <p className="pref-row-desc">What shows as your expense in analytics</p>
                </div>
                <select
                  className="pref-select"
                  value={settings.splitExpenseRecord || 'my_share'}
                  onChange={(e) => updatePref('splitExpenseRecord', e.target.value)}
                >
                  <option value="my_share">Only my share</option>
                  <option value="full">Full amount</option>
                </select>
              </div>
            </>
          )}

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

        {settings.plannedEnabled && (
          <div className="pref-card" style={{ marginTop: 16 }}>
            <div className="pref-row">
              <div className="pref-row-info">
                <p className="pref-row-label">Payment due reminders</p>
                <p className="pref-row-desc">Get notified when planned bills are due or overdue</p>
              </div>
              <label className="pref-toggle">
                <input
                  type="checkbox"
                  checked={settings.plannedReminders === true}
                  onChange={(e) => updatePref('plannedReminders', e.target.checked)}
                />
                <span className="pref-toggle-slider" />
              </label>
            </div>
          </div>
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

          {!hasUserData && !sampleLoaded && (
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

          {!hasUserData && sampleLoaded && (
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

        <div className="pref-card gdrive-card" style={{ marginBottom: 14 }}>
          <div className="pref-row">
            <div className="pref-row-info">
              <p className="pref-row-label gdrive-label">
                <i className="fa-brands fa-google-drive" style={{ color: '#4285F4' }} />
                Google Drive Sync
              </p>
              <p className="pref-row-desc">
                {gdriveConnected
                  ? `Connected as ${settings.gdriveEmail}`
                  : 'Sync data to your own Google Drive — free, private'}
              </p>
            </div>
            {!gdriveConnected ? (
              <button
                className="pref-btn gdrive-connect-btn"
                onClick={handleGdriveConnect}
                disabled={gdriveLoading}
              >
                {gdriveLoading ? (
                  <><i className="fa-solid fa-spinner fa-spin" /> Connecting…</>
                ) : (
                  <><i className="fa-brands fa-google" /> Connect</>
                )}
              </button>
            ) : (
              <button className="pref-btn danger gdrive-disconnect-btn" onClick={handleGdriveDisconnect}>
                <i className="fa-solid fa-link-slash" /> Disconnect
              </button>
            )}
          </div>

          {gdriveConnected && (
            <>
              <div className="pref-divider" />

              {settings.gdrivePhoto && (
                <div className="gdrive-user-bar">
                  <img src={settings.gdrivePhoto} alt="" className="gdrive-avatar" referrerPolicy="no-referrer" />
                  <div>
                    <p className="gdrive-user-name">{settings.gdriveName}</p>
                    <p className="gdrive-user-email">{settings.gdriveEmail}</p>
                  </div>
                  <span className="gdrive-last-sync">
                    <i className="fa-solid fa-clock" /> {formatSyncTime(settings.gdriveLastSync)}
                  </span>
                </div>
              )}

              <div className="gdrive-sync-actions">
                <button
                  className="gdrive-action-btn push"
                  onClick={handleGdrivePush}
                  disabled={gdriveSyncing}
                >
                  {gdriveSyncing ? (
                    <i className="fa-solid fa-spinner fa-spin" />
                  ) : (
                    <i className="fa-solid fa-cloud-arrow-up" />
                  )}
                  <span>Push to Drive</span>
                  <small>Upload your local data</small>
                </button>
                <button
                  className="gdrive-action-btn pull"
                  onClick={handleGdrivePull}
                  disabled={gdriveSyncing}
                >
                  {gdriveSyncing ? (
                    <i className="fa-solid fa-spinner fa-spin" />
                  ) : (
                    <i className="fa-solid fa-cloud-arrow-down" />
                  )}
                  <span>Pull from Drive</span>
                  <small>Merge cloud data here</small>
                </button>
              </div>

              <div className="pref-divider" />

              <div className="pref-row">
                <div className="pref-row-info">
                  <p className="pref-row-label danger-text">Delete cloud backup</p>
                  <p className="pref-row-desc">Permanently remove the backup file from your Google Drive</p>
                </div>
                <button
                  className="pref-btn danger"
                  onClick={handleGdriveDelete}
                  disabled={gdriveSyncing}
                >
                  <i className="fa-solid fa-trash-can" /> Delete
                </button>
              </div>
            </>
          )}

          {!gdriveConfigured && (
            <div className="gdrive-setup-hint">
              <i className="fa-solid fa-circle-info" />
              <p>To enable Google Drive sync, set <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> in your <code>.env.local</code> file.</p>
            </div>
          )}
        </div>

        <div className="backup-actions">
          <div className="backup-action-group">
            <button className="backup-action-btn" onClick={() => { setShowExportOptions(!showExportOptions); setShowImportOptions(false); }}>
              <i className="fa-solid fa-download" />
              <span>Export</span>
              <i className={`fa-solid fa-chevron-${showExportOptions ? 'up' : 'down'} backup-chevron`} />
            </button>
            {showExportOptions && (
              <div className="backup-options">
                <button className="backup-option" onClick={() => { handleExportJSON(); setShowExportOptions(false); }}>
                  <i className="fa-solid fa-file-code" />
                  <div>
                    <p className="backup-option-title">JSON backup</p>
                    <p className="backup-option-desc">All data — accounts, transactions, settings</p>
                  </div>
                </button>
                <button className="backup-option" onClick={() => { handleExportCSV(); setShowExportOptions(false); }}>
                  <i className="fa-solid fa-file-csv" />
                  <div>
                    <p className="backup-option-title">CSV export</p>
                    <p className="backup-option-desc">Transactions only — for Excel, Sheets</p>
                  </div>
                </button>
                <button className="backup-option" onClick={() => { handleExportPDF(); setShowExportOptions(false); }}>
                  <i className="fa-solid fa-file-pdf" />
                  <div>
                    <p className="backup-option-title">PDF report</p>
                    <p className="backup-option-desc">Formatted summary with all transactions</p>
                  </div>
                </button>
                <button className="backup-option" onClick={() => { handleExportXLSX(); setShowExportOptions(false); }}>
                  <i className="fa-solid fa-file-excel" />
                  <div>
                    <p className="backup-option-title">Excel (XLSX)</p>
                    <p className="backup-option-desc">Multi-sheet workbook — transactions, accounts, summary</p>
                  </div>
                </button>
              </div>
            )}
          </div>

          <div className="backup-action-group">
            <button className="backup-action-btn" onClick={() => { setShowImportOptions(!showImportOptions); setShowExportOptions(false); }}>
              <i className="fa-solid fa-upload" />
              <span>Import</span>
              <i className={`fa-solid fa-chevron-${showImportOptions ? 'up' : 'down'} backup-chevron`} />
            </button>
            {showImportOptions && (
              <div className="backup-options">
                <button className="backup-option" onClick={() => { triggerImport('replace'); setShowImportOptions(false); }}>
                  <i className="fa-solid fa-arrow-rotate-left" />
                  <div>
                    <p className="backup-option-title">Replace all data</p>
                    <p className="backup-option-desc">Restore from backup — overwrites everything</p>
                  </div>
                </button>
                <button className="backup-option" onClick={() => { triggerImport('merge'); setShowImportOptions(false); }}>
                  <i className="fa-solid fa-code-merge" />
                  <div>
                    <p className="backup-option-title">Merge data</p>
                    <p className="backup-option-desc">Add missing items without duplicating</p>
                  </div>
                </button>
              </div>
            )}
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
                  ? `${currentLockType === 'password' ? 'Password' : 'PIN'} lock is active`
                  : 'Protect your financial data with a PIN or password'}
              </p>
            </div>
            {hasAppLock ? (
              <button className="pref-btn danger" onClick={handleRemoveLock}>
                <i className="fa-solid fa-lock-open" /> Remove
              </button>
            ) : (
              <button className="pref-btn outline" onClick={() => { setShowLockSetup(true); setLockSetupType('pin'); setLockStep('new'); setNewPin(''); setConfirmPin(''); setNewPassword(''); setConfirmPassword(''); }}>
                <i className="fa-solid fa-lock" /> Set Up
              </button>
            )}
          </div>

          {hasAppLock && (
            <>
              <div className="pref-divider" />
              <div className="pref-row">
                <div className="pref-row-info">
                  <p className="pref-row-label">Change {currentLockType === 'password' ? 'password' : 'PIN'}</p>
                  <p className="pref-row-desc">Set a new {currentLockType === 'password' ? 'password' : '4-digit PIN'}</p>
                </div>
                <button className="pref-btn outline" onClick={() => { setShowLockSetup(true); setLockSetupType(currentLockType); setLockStep('new'); setNewPin(''); setConfirmPin(''); setNewPassword(''); setConfirmPassword(''); }}>
                  <i className="fa-solid fa-key" /> Change
                </button>
              </div>
              <div className="pref-divider" />
              <div className="pref-row">
                <div className="pref-row-info">
                  <p className="pref-row-label">Lock after</p>
                  <p className="pref-row-desc">Delay before locking when you leave the app</p>
                </div>
                <select
                  className="pref-select"
                  value={settings.appLockTimeout ?? 30}
                  onChange={(e) => updatePref('appLockTimeout', parseInt(e.target.value))}
                >
                  <option value={0}>Immediately</option>
                  <option value={30}>30 seconds</option>
                  <option value={60}>1 minute</option>
                  <option value={300}>5 minutes</option>
                </select>
              </div>
            </>
          )}
        </div>

        {showLockSetup && (
          <div className="pin-setup-card">
            <div className="lock-type-tabs">
              <button className={`lock-type-tab ${lockSetupType === 'pin' ? 'active' : ''}`} onClick={() => { setLockSetupType('pin'); setLockStep('new'); setNewPin(''); setConfirmPin(''); }}>
                <i className="fa-solid fa-grid-2" /> PIN
              </button>
              <button className={`lock-type-tab ${lockSetupType === 'password' ? 'active' : ''}`} onClick={() => { setLockSetupType('password'); setLockStep('new'); setNewPassword(''); setConfirmPassword(''); }}>
                <i className="fa-solid fa-key" /> Password
              </button>
            </div>

            {lockSetupType === 'pin' ? (
              <>
                <p className="pin-setup-title">
                  {lockStep === 'new' ? 'Enter new 4-digit PIN' : 'Confirm your PIN'}
                </p>
                <div className="pin-setup-input-row">
                  <input
                    type="tel"
                    className="pin-setup-input"
                    maxLength={4}
                    value={lockStep === 'new' ? newPin : confirmPin}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                      if (lockStep === 'new') setNewPin(val);
                      else setConfirmPin(val);
                    }}
                    placeholder="••••"
                    autoFocus
                  />
                </div>
                <div className="pin-setup-dots">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <span key={i} className={`pin-dot ${i < (lockStep === 'new' ? newPin : confirmPin).length ? 'filled' : ''}`} />
                  ))}
                </div>
                <div className="pin-setup-actions">
                  <button className="btn btn-sm btn-outline" onClick={resetLockSetup}>Cancel</button>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={handleSetLock}
                    disabled={(lockStep === 'new' ? newPin : confirmPin).length !== 4}
                  >
                    {lockStep === 'new' ? 'Next' : 'Set PIN'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="pin-setup-title">
                  {lockStep === 'new' ? 'Enter new password' : 'Confirm your password'}
                </p>
                <div className="pin-setup-input-row">
                  <input
                    type="password"
                    className="pin-setup-input pin-setup-input-wide"
                    value={lockStep === 'new' ? newPassword : confirmPassword}
                    onChange={(e) => {
                      if (lockStep === 'new') setNewPassword(e.target.value);
                      else setConfirmPassword(e.target.value);
                    }}
                    placeholder={lockStep === 'new' ? 'Min 4 characters' : 'Re-enter password'}
                    autoFocus
                  />
                </div>
                <div className="pin-setup-actions">
                  <button className="btn btn-sm btn-outline" onClick={resetLockSetup}>Cancel</button>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={handleSetLock}
                    disabled={(lockStep === 'new' ? newPassword : confirmPassword).length < 4}
                  >
                    {lockStep === 'new' ? 'Next' : 'Set Password'}
                  </button>
                </div>
              </>
            )}
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
              <p className="pref-row-label">SpendTrak</p>
              <p className="pref-row-desc">Version 2.0.2 · Your money, your rules.</p>
            </div>
            <span className="pref-badge">v2.0.2</span>
          </div>
        </div>

        {!isDesktop && (
          <a href="/feedback" className="pref-developer-card" style={{ marginBottom: 8 }}>
            <div className="pref-dev-avatar" style={{ background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)' }}>
              <i className="fa-solid fa-comment-dots" style={{ fontSize: '0.9rem' }} />
            </div>
            <div className="pref-dev-info">
              <p className="pref-dev-name">Send Feedback</p>
              <p className="pref-dev-role">Report bugs, request features, or share your thoughts</p>
            </div>
            <i className="fa-solid fa-chevron-right" style={{ color: 'var(--text-light)', fontSize: '0.75rem' }} />
          </a>
        )}

        <a href="https://www.linkedin.com/in/mathinraj" target="_blank" rel="noopener noreferrer" className="pref-developer-card">
          <div className="pref-dev-avatar">M</div>
          <div className="pref-dev-info">
            <p className="pref-dev-name">Mathinraj 💚</p>
            <p className="pref-dev-role">Developer</p>
          </div>
          <span className="pref-dev-li-icon">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="white">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
          </span>
        </a>
      </div>
    </div>
  );
}
