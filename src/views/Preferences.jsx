'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '../context/AppContext';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { useToast } from '../components/Toast';
import { hasSampleData } from '../utils/sampleData';
import { generateId } from '../utils/helpers';
import {
  clearAppLock,
  hasBiometric,
  hashValue,
  isBiometricAvailable,
  LOCK_KEY,
  LOCK_TYPE_KEY,
  registerBiometric,
  removeBiometric,
} from '../utils/appLock';
import { getTouchLockStore, TOUCHLOCK_URL } from '../utils/touchLock';
import { CURRENCIES, formatCurrencyPlain } from '../utils/currencies';
import { exportToPDF, exportToXLSX } from '../utils/exportUtils';
import * as gDrive from '../utils/googleDrive';
import {
  clearSyncProgress,
  deleteDriveData,
  isAutoSync,
  listDailyCopies,
  restoreDailyCopy,
  stopSyncTimers,
  syncNow,
  useDriveSyncStatus,
} from '../utils/driveSync';
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
  const router = useRouter();
  const { state, dispatch } = useApp();
  const { settings, accounts, transactions } = state;
  const sampleLoaded = hasSampleData(accounts);
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
      // Start over at Home, or onboarding would end on this Preferences URL.
      router.replace('/');
    }
  }

  const fileInputRef = useRef(null);
  const [importMode, setImportMode] = useState(null);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [showImportOptions, setShowImportOptions] = useState(false);
  const [showCoindrop, setShowCoindrop] = useState(false);

  function buildExportData() {
    return {
      _app: 'SpendTrak',
      _version: '2.1.0',
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
  const [dailyCopies, setDailyCopies] = useState(null);
  const syncStatus = useDriveSyncStatus();
  const gdriveSyncing = syncStatus.phase === 'syncing';
  const autoSync = isAutoSync(settings);
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
        const sameAccount = userInfo.email === settings.gdriveEmail;
        if (!sameAccount) clearSyncProgress();
        dispatch({
          type: 'UPDATE_SETTINGS',
          payload: {
            gdriveEmail: userInfo.email,
            gdriveName: userInfo.name,
            gdrivePhoto: userInfo.picture,
            ...(sameAccount ? {} : { gdriveLastSync: null, gdriveAutoSync: true }),
          },
        });
        toast(`Connected as ${userInfo.email}`, 'success');
        // Once the connection is in state; a new connection also starts syncing on its own.
        setTimeout(() => syncNow({ manual: true }), 500);
      }
    } catch (err) {
      console.error('GDrive connect error:', err);
      toast('Failed to connect Google Drive', 'error');
    }
    setGdriveLoading(false);
  }

  function handleGdriveDisconnect() {
    if (!window.confirm('Disconnect Google Drive? Syncing stops; your data stays here and in your Drive.')) return;
    disconnectGdrive();
    toast('Google Drive disconnected', 'info');
  }

  function disconnectGdrive() {
    gDrive.revokeToken();
    stopSyncTimers();
    clearSyncProgress();
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
  }

  function setSyncMode(auto) {
    updatePref('gdriveAutoSync', auto);
    if (auto) syncNow();
    else stopSyncTimers();
  }

  async function handleShowRestore() {
    if (dailyCopies) {
      setDailyCopies(null);
      return;
    }
    setGdriveLoading(true);
    try {
      setDailyCopies(await listDailyCopies());
    } catch (err) {
      toast(err.message || 'Could not load the daily copies', 'error');
    }
    setGdriveLoading(false);
  }

  async function handleRestore(copy) {
    const when = new Date(`${copy.date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    if (!window.confirm(`Restore your data from ${when}?\n\nYour data here is replaced by this copy, and Google Drive and your other devices are updated to match.`)) return;
    setGdriveLoading(true);
    try {
      await restoreDailyCopy(copy.id);
      setDailyCopies(null);
      toast(`Restored the copy from ${when}`, 'success');
    } catch (err) {
      toast(err.message || 'Restore failed', 'error');
    }
    setGdriveLoading(false);
  }

  async function handleGdriveDelete() {
    if (!window.confirm("Delete SpendTrak's data from your Google Drive, including the daily copies? Syncing stops and the Android app loses access to this copy. Your data in this browser stays.")) return;
    setGdriveLoading(true);
    try {
      await deleteDriveData();
      disconnectGdrive();
      toast('Deleted from Google Drive', 'info');
    } catch (err) {
      toast(err.message || 'Failed to delete from Google Drive', 'error');
    }
    setGdriveLoading(false);
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

  const [showLockSetup, setShowLockSetup] = useState(false);
  const [lockSetupType, setLockSetupType] = useState('pin');
  const [lockStep, setLockStep] = useState('new');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const hasAppLock = typeof window !== 'undefined' && !!localStorage.getItem(LOCK_KEY);
  const currentLockType = typeof window !== 'undefined' ? (localStorage.getItem(LOCK_TYPE_KEY) || 'pin') : 'pin';
  const [bioAvailable, setBioAvailable] = useState(null);
  const [bioEnabled, setBioEnabled] = useState(false);
  const [bioBusy, setBioBusy] = useState(false);

  useEffect(() => {
    setBioEnabled(hasBiometric());
    isBiometricAvailable().then(setBioAvailable);
  }, []);

  async function handleFingerprintToggle(on) {
    if (!on) {
      removeBiometric();
      setBioEnabled(false);
      toast('Fingerprint unlock turned off', 'info');
      return;
    }
    setBioBusy(true);
    try {
      await registerBiometric(settings.profileName);
      setBioEnabled(true);
      toast('Fingerprint unlock is on', 'success');
    } catch (err) {
      toast(err?.name === 'NotAllowedError' ? 'Fingerprint setup was cancelled' : 'Could not set up fingerprint on this device', 'error');
    }
    setBioBusy(false);
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
      localStorage.setItem(LOCK_KEY, hashValue(newPin));
      localStorage.setItem(LOCK_TYPE_KEY, 'pin');
    } else {
      if (newPassword.length < 4) { toast('Password must be at least 4 characters', 'error'); return; }
      if (lockStep === 'new') { setLockStep('confirm'); setConfirmPassword(''); return; }
      if (confirmPassword !== newPassword) {
        toast('Passwords do not match. Try again.', 'error');
        setLockStep('new'); setNewPassword(''); setConfirmPassword('');
        return;
      }
      localStorage.setItem(LOCK_KEY, hashValue(newPassword));
      localStorage.setItem(LOCK_TYPE_KEY, 'password');
    }
    updatePref('appLockEnabled', true);
    toast(
      bioAvailable && !bioEnabled ? 'App lock is on. You can now turn on fingerprint unlock.' : 'App lock is on',
      'success',
      4000
    );
    resetLockSetup();
  }

  function handleRemoveLock() {
    if (window.confirm('Remove app lock? Anyone will be able to open the app.')) {
      clearAppLock();
      setBioEnabled(false);
      updatePref('appLockEnabled', false);
      toast('App lock removed', 'info');
    }
  }

  const touchLockStore = getTouchLockStore();
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);
  const sectionNavRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActiveSection(visible[0].target.id);
    }, { rootMargin: '-15% 0px -70% 0px' });
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    const hash = window.location.hash.slice(1);
    if (hash) document.getElementById(hash)?.scrollIntoView();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // Keep the active chip visible in the horizontal (mobile) section bar without scrolling the page.
    const bar = sectionNavRef.current;
    const chip = bar?.querySelector(`[data-section="${activeSection}"]`);
    if (!bar || !chip || bar.scrollWidth <= bar.clientWidth) return;
    bar.scrollTo({ left: chip.offsetLeft - bar.clientWidth / 2 + chip.clientWidth / 2, behavior: 'smooth' });
  }, [activeSection]);

  function goToSection(id) {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.history.replaceState(null, '', `#${id}`);
  }

  function handleLoadSample() {
    dispatch({ type: 'LOAD_SAMPLE_DATA' });
    toast('Sample data loaded', 'success');
  }

  const dashboardOptions = [
    { label: 'Show balance on top', desc: 'Total balance instead of this month’s expenses', checked: settings.homeView === 'balance', onChange: (v) => updatePref('homeView', v ? 'balance' : 'expenses') },
    { label: 'Income and expense stats', desc: 'Below the main balance card', checked: settings.showBalanceStats !== false, onChange: (v) => updatePref('showBalanceStats', v) },
    { label: 'Accounts section', desc: 'Your accounts on the home page', checked: settings.showAccountsOnHome !== false, onChange: (v) => updatePref('showAccountsOnHome', v) },
    ...(settings.splitEnabled ? [{ label: 'Split money', desc: '“Others owe you” card', checked: settings.showSplitOnHome !== false, onChange: (v) => updatePref('showSplitOnHome', v) }] : []),
    { label: 'Exclude credit cards', desc: 'Leave card dues out of the total balance', checked: settings.excludeCCFromBalance === true, onChange: (v) => updatePref('excludeCCFromBalance', v) },
    { label: 'Hide balances', desc: 'Mask amounts with *** for privacy', checked: settings.hideBalances === true, onChange: (v) => updatePref('hideBalances', v) },
  ];

  function openLockSetup(type) {
    setShowLockSetup(true);
    setLockSetupType(type);
    setLockStep('new');
    setNewPin('');
    setConfirmPin('');
    setNewPassword('');
    setConfirmPassword('');
  }

  const fingerprintDesc = bioAvailable === false
    ? 'This device or browser has no fingerprint or face sensor that SpendTrak can use'
    : bioEnabled
      ? 'Unlock with Touch ID, Windows Hello, or your phone’s fingerprint. Your PIN still works.'
      : 'Use Touch ID, Windows Hello, or your phone’s fingerprint instead of typing your PIN';

  return (
    <div className="page pref-page">
      <h1 className="page-title">Preferences</h1>

      {/* Profile */}
      <div className="pref-profile-card">
        <div className="pref-profile-main">
          <button type="button" className="profile-photo-area" onClick={() => profilePhotoInputRef.current?.click()} aria-label="Change profile photo">
            {profilePhoto ? (
              <img src={profilePhoto} alt="" className="profile-photo" />
            ) : (
              <div className="profile-photo-placeholder">
                <i className="fa-solid fa-user" />
              </div>
            )}
            <span className="profile-photo-edit"><i className="fa-solid fa-camera" /></span>
          </button>
          <input
            ref={profilePhotoInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleProfilePhotoUpload}
          />
          <div className="profile-name-area">
            <input
              type="text"
              className="profile-name-input"
              placeholder="Your name"
              aria-label="Your name"
              value={profileName}
              onChange={handleProfileNameChange}
              maxLength={30}
            />
            <p className="pref-profile-meta">
              {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'} · {transactions.length} {transactions.length === 1 ? 'transaction' : 'transactions'} · saved in this browser
            </p>
            <div className="pref-profile-chips">
              <button type="button" className={`pref-chip ${hasAppLock ? 'on' : ''}`} onClick={() => goToSection('security')}>
                <i className={`fa-solid ${hasAppLock ? 'fa-lock' : 'fa-lock-open'}`} />
                {hasAppLock ? (bioEnabled ? 'Locked · fingerprint' : 'App lock on') : 'App lock off'}
              </button>
              <button type="button" className={`pref-chip ${gdriveConnected ? 'on' : ''}`} onClick={() => goToSection('backup')}>
                <i className="fa-brands fa-google-drive" />
                {gdriveConnected ? (autoSync ? 'Syncing with Drive' : 'Drive backup') : 'Not backed up'}
              </button>
            </div>
          </div>
        </div>
        {profilePhoto && (
          <div className="pref-list pref-profile-extra">
            <ToggleRow
              label="Back up photo to Google Drive"
              desc="Include your profile photo in cloud backups"
              checked={!!settings.syncProfilePhoto}
              onChange={(v) => updatePref('syncProfilePhoto', v)}
            />
            <div className="pref-row">
              <div className="pref-row-info">
                <p className="pref-row-label">Remove photo</p>
                <p className="pref-row-desc">{settings.syncProfilePhoto ? 'It will also be left out of future backups' : 'The photo is stored in this browser only'}</p>
              </div>
              <button className="pref-btn danger" onClick={handleRemovePhoto}>
                <i className="fa-solid fa-trash-can" /> Remove
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="pref-layout">
        <nav className="pref-nav" aria-label="Preference sections" ref={sectionNavRef}>
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              data-section={s.id}
              className={`pref-nav-item ${activeSection === s.id ? 'active' : ''}`}
              aria-current={activeSection === s.id ? 'true' : undefined}
              onClick={() => goToSection(s.id)}
            >
              <i className={`fa-solid ${s.icon}`} />
              <span>{s.label}</span>
            </button>
          ))}
        </nav>

        <div className="pref-content">
          <Section id="general" icon="fa-sliders" title="General" desc="How SpendTrak looks, and what's filled in when you add a transaction.">
            <div className="pref-card pref-list">
              <ToggleRow
                label="Dark mode"
                desc="Easier on the eyes in low light"
                checked={settings.theme === 'dark'}
                onChange={(v) => updatePref('theme', v ? 'dark' : 'light')}
              />
              <SelectRow
                label="Currency"
                desc="Amounts are shown in this currency; nothing is converted"
                value={settings.currency}
                onChange={(v) => dispatch({ type: 'SET_CURRENCY', payload: v })}
                options={CURRENCIES.map((c) => [c.code, `${c.flag} ${c.code} · ${c.name}`])}
              />
              <SelectRow
                label="Default transaction type"
                desc="Pre-selected when you add a transaction"
                value={settings.defaultTxnType || 'expense'}
                onChange={(v) => updatePref('defaultTxnType', v)}
                options={[['expense', 'Expense'], ['income', 'Income'], ['transfer', 'Transfer']]}
              />
              <ToggleRow
                label="Track payment app / UPI"
                desc="An optional field for the app you paid with (GPay, PhonePe, and so on)"
                checked={settings.trackPaymentApp !== false}
                onChange={(v) => updatePref('trackPaymentApp', v)}
              />
              <ToggleRow
                label="Confirm before delete"
                desc="Ask before deleting a transaction"
                checked={settings.confirmDelete !== false}
                onChange={(v) => updatePref('confirmDelete', v)}
              />
            </div>
          </Section>

          <Section id="home-screen" icon="fa-house" title="Home screen" desc="Choose what the home page shows.">
            <div className="pref-card pref-list">
              {dashboardOptions.map((item) => (
                <ToggleRow key={item.label} label={item.label} desc={item.desc} checked={item.checked} onChange={item.onChange} />
              ))}
            </div>
          </Section>

          <Section id="features" icon="fa-puzzle-piece" title="Features" desc="Turn on the extra tools you need. Each adds its own page.">
            <div className="pref-card pref-list">
              <ToggleRow
                label="Planned payments"
                desc="Recurring bills, subscriptions, and EMIs with due-date reminders"
                checked={settings.plannedEnabled === true}
                onChange={(v) => updatePref('plannedEnabled', v)}
              />
              <ToggleRow
                label="Split expenses"
                desc="Shared expenses, per-person balances, and settlements with friends or roommates"
                checked={settings.splitEnabled === true}
                onChange={(v) => updatePref('splitEnabled', v)}
              />
              {settings.splitEnabled && (
                <SelectRow
                  nested
                  label="Deduct from your account"
                  desc="How much of a split expense leaves your account balance"
                  value={settings.splitBankDeduction || 'full'}
                  onChange={(v) => updatePref('splitBankDeduction', v)}
                  options={[['full', 'Full amount'], ['my_share', 'Only my share']]}
                />
              )}
              {settings.splitEnabled && (
                <SelectRow
                  nested
                  label="Record expense as"
                  desc="What counts as your expense in analytics"
                  value={settings.splitExpenseRecord || 'my_share'}
                  onChange={(v) => updatePref('splitExpenseRecord', v)}
                  options={[['my_share', 'Only my share'], ['full', 'Full amount']]}
                />
              )}
            </div>
          </Section>

          <Section id="reminders" icon="fa-bell" title="Reminders" desc="Browser notifications that nudge you to log expenses.">
            {notifStatus !== 'granted' ? (
              <div className="pref-card">
                <div className="pref-row">
                  <div className="pref-row-info">
                    <p className="pref-row-label">Enable notifications</p>
                    <p className="pref-row-desc">
                      {notifStatus === 'denied'
                        ? 'Notifications are blocked in your browser settings'
                        : 'Allow notifications to set up reminders'}
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
                          aria-label={`Edit ${reminder.label || 'reminder'}`}
                        >
                          <i className={`fa-solid ${editingReminder === reminder.id ? 'fa-chevron-up' : 'fa-pen'}`} />
                        </button>
                        <label className="pref-toggle">
                          <input
                            type="checkbox"
                            checked={reminder.enabled}
                            onChange={() => toggleReminder(reminder.id)}
                            aria-label={`${reminder.label || 'Reminder'} on`}
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

                <div className="pref-card pref-list pref-card-gap">
                  <ToggleRow
                    label="Do not disturb"
                    desc="Pause all reminders during quiet hours"
                    checked={settings.dndEnabled === true}
                    onChange={(v) => updatePref('dndEnabled', v)}
                  />
                  {settings.dndEnabled && (
                    <div className="pref-row pref-row-nested">
                      <div className="pref-row-info">
                        <p className="pref-row-label">Quiet hours</p>
                        <p className="pref-row-desc">No notifications during this period</p>
                      </div>
                      <div className="dnd-time-range">
                        <input
                          type="time"
                          className="pref-time-input"
                          aria-label="Quiet hours start"
                          value={settings.dndStart || '23:00'}
                          onChange={(e) => updatePref('dndStart', e.target.value)}
                        />
                        <span className="dnd-separator">to</span>
                        <input
                          type="time"
                          className="pref-time-input"
                          aria-label="Quiet hours end"
                          value={settings.dndEnd || '07:00'}
                          onChange={(e) => updatePref('dndEnd', e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {settings.plannedEnabled && (
              <div className="pref-card pref-list pref-card-gap">
                <ToggleRow
                  label="Payment due reminders"
                  desc="Get notified when planned bills are due or overdue"
                  checked={settings.plannedReminders === true}
                  onChange={(v) => updatePref('plannedReminders', v)}
                />
              </div>
            )}
          </Section>

          <Section id="security" icon="fa-shield-halved" title="Security & privacy" desc="Keep your finances private on a shared computer or phone.">
            <div className="pref-card pref-list">
              <div className="pref-row">
                <div className="pref-row-info">
                  <p className="pref-row-label">App lock</p>
                  <p className="pref-row-desc">
                    {hasAppLock
                      ? `${currentLockType === 'password' ? 'Password' : 'PIN'} lock is on`
                      : 'Ask for a PIN or password when SpendTrak opens'}
                  </p>
                </div>
                {hasAppLock ? (
                  <button className="pref-btn danger" onClick={handleRemoveLock}>
                    <i className="fa-solid fa-lock-open" /> Remove
                  </button>
                ) : (
                  <button className="pref-btn outline" onClick={() => openLockSetup('pin')}>
                    <i className="fa-solid fa-lock" /> Set up
                  </button>
                )}
              </div>

              {!hasAppLock && bioAvailable !== false && (
                <div className="pref-row pref-lock-hint">
                  <i className="fa-solid fa-fingerprint pref-row-icon" />
                  <p className="pref-row-desc">
                    Touch ID, Windows Hello, or fingerprint unlock can be turned on here once you&apos;ve set a PIN or password.
                    The PIN stays as a backup.
                  </p>
                </div>
              )}

              {hasAppLock && (
                <ToggleRow
                  icon="fa-fingerprint"
                  label="Unlock with fingerprint"
                  desc={fingerprintDesc}
                  checked={bioEnabled}
                  disabled={bioBusy || (bioAvailable === false && !bioEnabled)}
                  onChange={handleFingerprintToggle}
                />
              )}

              {hasAppLock && (
                <div className="pref-row">
                  <div className="pref-row-info">
                    <p className="pref-row-label">Change {currentLockType === 'password' ? 'password' : 'PIN'}</p>
                    <p className="pref-row-desc">Set a new {currentLockType === 'password' ? 'password' : '4-digit PIN'}</p>
                  </div>
                  <button className="pref-btn outline" onClick={() => openLockSetup(currentLockType)}>
                    <i className="fa-solid fa-key" /> Change
                  </button>
                </div>
              )}

              {hasAppLock && (
                <SelectRow
                  label="Lock after"
                  desc="How long you can be away before it locks"
                  value={settings.appLockTimeout ?? 30}
                  onChange={(v) => updatePref('appLockTimeout', parseInt(v))}
                  options={[[0, 'Immediately'], [30, '30 seconds'], [60, '1 minute'], [300, '5 minutes']]}
                />
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
                {!hasAppLock && bioAvailable && (
                  <p className="pin-setup-note">
                    <i className="fa-solid fa-fingerprint" /> Next, you can turn on fingerprint unlock so you rarely need to type it.
                  </p>
                )}
              </div>
            )}

            {hasAppLock && touchLockStore && <TouchLockCard store={touchLockStore} />}
          </Section>

          <Section id="backup" icon="fa-cloud-arrow-up" title="Backup & sync" desc="Your data lives in this browser. Back it up so clearing site data can't erase it.">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleFileSelected}
            />

            <div className="pref-card gdrive-card pref-card-spaced">
              <div className="pref-row">
                <div className="pref-row-info">
                  <p className="pref-row-label gdrive-label">
                    <i className="fa-brands fa-google-drive" style={{ color: '#4285F4' }} />
                    Google Drive sync
                  </p>
                  <p className="pref-row-desc">
                    {gdriveConnected
                      ? `Connected as ${settings.gdriveEmail}`
                      : 'Sync to your own Google Drive and the Android app. Free and private.'}
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

                  <div className="pref-row">
                    <div className="pref-row-info">
                      <p className={`pref-row-label ${syncStatus.phase === 'signin' || syncStatus.phase === 'error' ? 'danger-text' : ''}`}>
                        {gdriveSyncing
                          ? autoSync ? 'Syncing…' : 'Backing up…'
                          : syncStatus.phase === 'offline'
                            ? 'Waiting for a connection'
                            : syncStatus.phase === 'signin'
                              ? 'Sign in again'
                              : syncStatus.phase === 'error'
                                ? 'Sync problem'
                                : settings.gdriveLastSync
                                  ? `${autoSync ? 'Synced' : 'Backed up'} ${formatSyncTime(settings.gdriveLastSync).toLowerCase()}`
                                  : 'Not synced yet'}
                      </p>
                      <p className="pref-row-desc">
                        {syncStatus.message ||
                          (autoSync
                            ? 'Every change is saved to Drive within seconds. Changes from your phone come in when you open SpendTrak.'
                            : 'Back up now also brings in changes made on your phone.')}
                      </p>
                    </div>
                    <button className="pref-btn" onClick={() => syncNow({ manual: true })} disabled={gdriveSyncing}>
                      {gdriveSyncing ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-rotate" />}{' '}
                      {autoSync ? 'Sync now' : 'Back up now'}
                    </button>
                  </div>

                  <div className="gdrive-sync-actions">
                    <button className={`gdrive-action-btn ${autoSync ? 'active' : ''}`} onClick={() => setSyncMode(true)} aria-pressed={autoSync}>
                      <i className="fa-solid fa-arrows-rotate" />
                      <span>Sync automatically</span>
                      <small>Recommended</small>
                    </button>
                    <button className={`gdrive-action-btn ${autoSync ? '' : 'active'}`} onClick={() => setSyncMode(false)} aria-pressed={!autoSync}>
                      <i className="fa-solid fa-cloud-arrow-up" />
                      <span>Manual backup</span>
                      <small>Only when you click</small>
                    </button>
                  </div>

                  <div className="pref-divider" />

                  <div className="pref-row">
                    <div className="pref-row-info">
                      <p className="pref-row-label">Restore an earlier version</p>
                      <p className="pref-row-desc">Daily copies from the last 7 days</p>
                    </div>
                    <button className="pref-btn" onClick={handleShowRestore} disabled={gdriveLoading || gdriveSyncing}>
                      <i className={`fa-solid ${dailyCopies ? 'fa-chevron-up' : 'fa-clock-rotate-left'}`} /> {dailyCopies ? 'Hide' : 'Choose'}
                    </button>
                  </div>
                  {dailyCopies && (
                    <div className="backup-options">
                      {dailyCopies.length === 0 ? (
                        <p className="pref-row-desc" style={{ padding: '8px 12px' }}>No daily copies yet.</p>
                      ) : (
                        dailyCopies.map((copy) => (
                          <button key={copy.id} className="backup-option" onClick={() => handleRestore(copy)} disabled={gdriveLoading}>
                            <i className="fa-solid fa-clock-rotate-left" />
                            <div>
                              <p className="backup-option-title">
                                {new Date(`${copy.date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                              </p>
                              <p className="backup-option-desc">Replace the data here with this copy</p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}

                  <div className="pref-divider" />

                  <div className="pref-row">
                    <div className="pref-row-info">
                      <p className="pref-row-label danger-text">Delete data from Google Drive</p>
                      <p className="pref-row-desc">Removes SpendTrak&apos;s copies, including daily ones, and disconnects</p>
                    </div>
                    <button
                      className="pref-btn danger"
                      onClick={handleGdriveDelete}
                      disabled={gdriveSyncing || gdriveLoading}
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
                <button className="backup-action-btn" onClick={() => { setShowExportOptions(!showExportOptions); setShowImportOptions(false); }} aria-expanded={showExportOptions}>
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
                <button className="backup-action-btn" onClick={() => { setShowImportOptions(!showImportOptions); setShowExportOptions(false); }} aria-expanded={showImportOptions}>
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
          </Section>

          <Section id="data" icon="fa-database" title="Data" desc="What's stored in this browser.">
            <div className="pref-card pref-list">
              <div className="pref-row">
                <div className="pref-row-info">
                  <p className="pref-row-label">Storage</p>
                  <p className="pref-row-desc">
                    {accounts.length} accounts · {transactions.length} transactions
                  </p>
                </div>
                <span className="pref-badge">This browser</span>
              </div>
            </div>

            <h3 className="pref-subhead"><i className="fa-solid fa-flask" /> Experimental features</h3>
            <div className="pref-card pref-list">
              <div className="pref-row">
                <div className="pref-row-info">
                  <p className="pref-row-label">Sample data</p>
                  <p className="pref-row-desc">
                    {sampleLoaded
                      ? 'Demo accounts and transactions are loaded alongside your own data'
                      : 'Load demo accounts, transactions, planned payments, and splits to try every page. They sit alongside your own data and never sync.'}
                  </p>
                </div>
                {sampleLoaded ? (
                  <button className="pref-btn danger" onClick={handleRemoveSample}>
                    <i className="fa-solid fa-trash-can" /> Remove
                  </button>
                ) : (
                  <button className="pref-btn outline" onClick={handleLoadSample}>
                    <i className="fa-solid fa-flask" /> Load
                  </button>
                )}
              </div>
            </div>

            <h3 className="pref-subhead danger-text"><i className="fa-solid fa-triangle-exclamation" /> Danger zone</h3>
            <div className="pref-card pref-danger-zone">
              <div className="pref-row">
                <div className="pref-row-info">
                  <p className="pref-row-label danger-text">Reset everything</p>
                  <p className="pref-row-desc">Delete all data in this browser and start the setup again</p>
                </div>
                <button className="pref-btn danger" onClick={handleResetAll}>
                  <i className="fa-solid fa-rotate-left" /> Reset
                </button>
              </div>
            </div>
          </Section>

          <Section id="about" icon="fa-circle-info" title="About & support">
            <div className="pref-about-grid">
              <a href="/about" className="pref-developer-card">
                <img src="/logo-icon.svg" alt="" className="pref-dev-avatar pref-app-avatar" />
                <div className="pref-dev-info">
                  <p className="pref-dev-name">SpendTrak</p>
                  <p className="pref-dev-role">Version 2.1.0 · Your money, your rules.</p>
                </div>
                <i className="fa-solid fa-chevron-right pref-card-chevron" />
              </a>

              <a href="/android" className="pref-developer-card">
                <div className="pref-dev-avatar" style={{ background: '#3DDC84' }}>
                  <i className="fa-brands fa-android" style={{ fontSize: '1.1rem' }} />
                </div>
                <div className="pref-dev-info">
                  <p className="pref-dev-name">SpendTrak for Android</p>
                  <p className="pref-dev-role">Free app that syncs with this one through Google Drive</p>
                </div>
                <i className="fa-solid fa-chevron-right pref-card-chevron" />
              </a>

              {!isDesktop && (
                <a href="/feedback" className="pref-developer-card">
                  <div className="pref-dev-avatar" style={{ background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)' }}>
                    <i className="fa-solid fa-comment-dots" style={{ fontSize: '0.9rem' }} />
                  </div>
                  <div className="pref-dev-info">
                    <p className="pref-dev-name">Send feedback</p>
                    <p className="pref-dev-role">Report bugs, request features, or share your thoughts</p>
                  </div>
                  <i className="fa-solid fa-chevron-right pref-card-chevron" />
                </a>
              )}

              <a href="/blog" className="pref-developer-card">
                <div className="pref-dev-avatar" style={{ background: 'linear-gradient(135deg, #00B894, #55EFC4)' }}>
                  <i className="fa-solid fa-book-open" style={{ fontSize: '0.9rem' }} />
                </div>
                <div className="pref-dev-info">
                  <p className="pref-dev-name">Guides &amp; blog</p>
                  <p className="pref-dev-role">Budgeting tips and how to get the most out of SpendTrak</p>
                </div>
                <i className="fa-solid fa-chevron-right pref-card-chevron" />
              </a>

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

              <button className="pref-developer-card pref-support-card" onClick={() => setShowCoindrop(true)}>
                <div className="pref-dev-avatar pref-bmc-avatar">
                  <img src={`https://cdn.brandfetch.io/buymeacoffee.com/w/128/h/128/theme/light/fallback/lettermark/type/icon?c=${process.env.NEXT_PUBLIC_BRANDFETCH_CLIENT_ID || ''}`} alt="" className="bmc-logo" />
                </div>
                <div className="pref-dev-info">
                  <p className="pref-dev-name">Buy me a coffee</p>
                  <p className="pref-dev-role">Support SpendTrak&apos;s development</p>
                </div>
                <i className="fa-solid fa-heart" style={{ color: '#E17055', fontSize: '0.85rem' }} />
              </button>
            </div>
          </Section>
        </div>
      </div>

      {showCoindrop && (
        <div className="coindrop-overlay" onClick={() => setShowCoindrop(false)}>
          <div className="coindrop-popup" onClick={(e) => e.stopPropagation()}>
            <div className="coindrop-header">
              <h3 className="coindrop-title"><img src={`https://cdn.brandfetch.io/buymeacoffee.com/w/64/h/64/theme/light/fallback/lettermark/type/icon?c=${process.env.NEXT_PUBLIC_BRANDFETCH_CLIENT_ID || ''}`} alt="" className="bmc-logo-sm" /> Support SpendTrak</h3>
              <button className="coindrop-close" onClick={() => setShowCoindrop(false)} aria-label="Close">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <iframe
              src="https://coindrop.to/mathinraj"
              className="coindrop-iframe"
              title="Support Mathinraj on Coindrop"
            />
          </div>
        </div>
      )}
    </div>
  );
}

const SECTIONS = [
  { id: 'general', label: 'General', icon: 'fa-sliders' },
  { id: 'home-screen', label: 'Home screen', icon: 'fa-house' },
  { id: 'features', label: 'Features', icon: 'fa-puzzle-piece' },
  { id: 'reminders', label: 'Reminders', icon: 'fa-bell' },
  { id: 'security', label: 'Security', icon: 'fa-shield-halved' },
  { id: 'backup', label: 'Backup & sync', icon: 'fa-cloud-arrow-up' },
  { id: 'data', label: 'Data', icon: 'fa-database' },
  { id: 'about', label: 'About', icon: 'fa-circle-info' },
];

function Section({ id, icon, title, desc, children }) {
  return (
    <section id={id} className="pref-section" aria-labelledby={`${id}-title`}>
      <div className="pref-section-head">
        <h2 id={`${id}-title`} className="pref-section-title">
          <i className={`fa-solid ${icon}`} /> {title}
        </h2>
        {desc && <p className="pref-section-desc">{desc}</p>}
      </div>
      {children}
    </section>
  );
}

function ToggleRow({ label, desc, checked, onChange, disabled, icon }) {
  return (
    <label className={`pref-row pref-row-toggle ${disabled ? 'disabled' : ''}`}>
      {icon && <i className={`fa-solid ${icon} pref-row-icon`} />}
      <div className="pref-row-info">
        <p className="pref-row-label">{label}</p>
        {desc && <p className="pref-row-desc">{desc}</p>}
      </div>
      <span className="pref-toggle">
        <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
        <span className="pref-toggle-slider" />
      </span>
    </label>
  );
}

function SelectRow({ label, desc, value, onChange, options, nested }) {
  return (
    <div className={`pref-row ${nested ? 'pref-row-nested' : ''}`}>
      <div className="pref-row-info">
        <p className="pref-row-label">{label}</p>
        {desc && <p className="pref-row-desc">{desc}</p>}
      </div>
      <select className="pref-select" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>{optionLabel}</option>
        ))}
      </select>
    </div>
  );
}

function TouchLockCard({ store }) {
  return (
    <div className="pref-touchlock">
      <img src="/touchlock-logo.svg" alt="" width={44} height={44} className="pref-touchlock-logo" />
      <div className="pref-touchlock-body">
        <p className="pref-touchlock-kicker">Extra security · from the maker of SpendTrak</p>
        <p className="pref-touchlock-title">Lock your whole browser with TouchLock</p>
        <p className="pref-touchlock-desc">
          SpendTrak&apos;s lock protects this app. TouchLock puts a lock screen in front of your entire browser, or just your bank
          and email sites, and unlocks with Touch ID, Windows Hello, or a PIN. Free, open source, and nothing leaves your device.
        </p>
        <div className="pref-touchlock-actions">
          <a href={store.url} target="_blank" rel="noopener noreferrer" className="pref-btn pref-touchlock-cta">
            <i className={`fa-brands ${store.icon}`} /> Add to {store.name}, free
          </a>
          <a href={TOUCHLOCK_URL} target="_blank" rel="noopener noreferrer" className="pref-btn outline">
            Learn more
          </a>
        </div>
      </div>
    </div>
  );
}
