'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '../context/AppContext';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { useToast } from '../components/Toast';
import { formatCurrency, getCurrencyEmoji } from '../utils/currencies';
import { formatDate, getAccountIcon, generateId } from '../utils/helpers';
import { hasSampleData } from '../utils/sampleData';
import * as gDrive from '../utils/googleDrive';
import './Home.css';

const BACKUP_MESSAGES = [
  { icon: 'fa-solid fa-shield-halved', text: 'Your data is stored locally. Back it up to stay safe!', action: 'backup' },
  { icon: 'fa-brands fa-google-drive', text: 'Sync to Google Drive so you never lose your data', action: 'gdrive' },
  { icon: 'fa-solid fa-cloud-arrow-up', text: 'One tap to back up. Don\'t risk losing your finances!', action: 'gdrive' },
  { icon: 'fa-solid fa-triangle-exclamation', text: 'Clearing browser data will erase everything. Back up now!', action: 'backup' },
  { icon: 'fa-brands fa-google-drive', text: 'Push your data to Google Drive — free and private', action: 'gdrive' },
];

export default function Home() {
  const { state, dispatch } = useApp();
  const { accounts, transactions, settings, categories } = state;
  const currency = settings.currency;
  const isDesktop = useIsDesktop();
  const toast = useToast();
  const router = useRouter();

  const [showBackupHint, setShowBackupHint] = useState(false);
  const [backupMsg, setBackupMsg] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [showSyncMenu, setShowSyncMenu] = useState(false);

  useEffect(() => {
    if (settings.onboardStep < 3) return;
    if (accounts.length === 0 && transactions.length === 0) return;
    const dismissed = sessionStorage.getItem('spendtraq_backup_hint_dismissed');
    if (dismissed) return;
    const lastBackup = parseInt(localStorage.getItem('spendtraq_last_backup_reminder') || '0', 10);
    const daysSince = (Date.now() - lastBackup) / 86400000;
    if (daysSince < 1) return;
    const idx = Math.floor(Date.now() / 86400000) % BACKUP_MESSAGES.length;
    setBackupMsg(BACKUP_MESSAGES[idx]);
    setShowBackupHint(true);
  }, []);

  function dismissBackupHint() {
    setShowBackupHint(false);
    sessionStorage.setItem('spendtraq_backup_hint_dismissed', '1');
  }

  async function handleQuickSync() {
    if (!gDrive.isConfigured()) {
      router.push('/preferences');
      toast('Set up Google Drive sync in Backup & Sync', 'info');
      return;
    }
    if (!settings.gdriveEmail) {
      router.push('/preferences');
      toast('Connect Google Drive first in Backup & Sync', 'info');
      return;
    }
    setSyncing(true);
    try {
      const token = await gDrive.ensureTokenSilently();
      if (!token) {
        toast('Google Drive session expired. Please reconnect in Preferences.', 'warning');
        setSyncing(false);
        return;
      }
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
      await gDrive.uploadSyncData(payload);
      dispatch({ type: 'UPDATE_SETTINGS', payload: { gdriveLastSync: new Date().toISOString() } });
      localStorage.setItem('spendtraq_last_backup_reminder', Date.now().toString());
      toast('Synced to Google Drive!', 'success');
      dismissBackupHint();
    } catch (err) {
      if (err.message === 'AUTH_EXPIRED') {
        toast('Session expired. Reconnect Google Drive in Preferences.', 'warning');
      } else {
        console.error('Quick sync error:', err);
        toast('Sync failed. Try again or use Preferences → Backup.', 'error');
      }
    }
    setSyncing(false);
  }

  async function handleQuickPull() {
    setShowSyncMenu(false);
    setSyncing(true);
    try {
      const token = await gDrive.ensureTokenSilently();
      if (!token) {
        toast('Google Drive session expired. Please reconnect in Preferences.', 'warning');
        setSyncing(false);
        return;
      }
      const data = await gDrive.downloadSyncData();
      if (!data) {
        toast('No backup found in your Google Drive', 'info');
        setSyncing(false);
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
      dispatch({ type: 'UPDATE_SETTINGS', payload: { gdriveLastSync: new Date().toISOString() } });
      toast('Data restored from Google Drive!', 'success');
    } catch (err) {
      if (err.message === 'AUTH_EXPIRED') {
        toast('Session expired. Reconnect Google Drive in Preferences.', 'warning');
      } else {
        console.error('Quick pull error:', err);
        toast('Pull failed. Try again in Preferences → Backup.', 'error');
      }
    }
    setSyncing(false);
  }

  const [showReminderHint, setShowReminderHint] = useState(false);
  useEffect(() => {
    const reminders = settings.reminders || [];
    if (reminders.length > 0) return;
    if (sessionStorage.getItem('spendtraq_reminder_dismissed')) return;
    if (Math.random() < 0.35) setShowReminderHint(true);
  }, []);

  function dismissReminderHint() {
    setShowReminderHint(false);
    sessionStorage.setItem('spendtraq_reminder_dismissed', '1');
  }

  async function enableReminderFromHint() {
    if (!('Notification' in window)) {
      toast('Your browser does not support notifications.', 'error');
      dismissReminderHint();
      return;
    }

    let perm = Notification.permission;
    if (perm === 'denied') {
      toast('Notifications are blocked. Enable them in your browser settings.', 'error', 5000);
      dismissReminderHint();
      return;
    }

    if (perm !== 'granted') {
      toast('Please click "Allow" when your browser asks for notification permission.', 'info', 5000);
      perm = await Notification.requestPermission();
    }

    if (perm === 'granted') {
      dispatch({ type: 'UPDATE_SETTINGS', payload: {
        reminders: [{
          id: generateId(),
          label: 'Log expenses',
          message: "Don't forget to log your expenses today!",
          time: '20:00',
          frequency: 'daily',
          day: 0,
          intervalMinutes: 60,
          enabled: true,
        }],
      }});
      toast('Reminders enabled! You\'ll be notified daily at 8:00 PM.', 'success', 4000);
      setTimeout(() => {
        toast('You can customize the reminder schedule in Preferences.', 'info', 5000);
      }, 1500);
    } else {
      toast('Notifications were denied. Enable them in Chrome Settings > Site Settings > Notifications.', 'warning', 6000);
    }
    dismissReminderHint();
  }

  const totalBalance = useMemo(
    () => accounts
      .filter((a) => !(settings.excludeCCFromBalance && a.type === 'card' && a.subType === 'credit'))
      .reduce((sum, a) => sum + a.balance, 0),
    [accounts, settings.excludeCCFromBalance]
  );

  const monthlyStats = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthTxns = transactions.filter(
      (t) => new Date(t.date) >= startOfMonth && t.type !== 'transfer'
    );
    const income = monthTxns
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + t.amount, 0);
    const expense = monthTxns
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + (t.isSplit ? (t.amount - (t.splitAmount || 0)) : t.amount), 0);
    return { income, expense };
  }, [transactions]);

  const pendingSplitTotal = useMemo(() => {
    if (!settings.splitEnabled) return 0;
    const splitLedger = state.splitLedger || [];
    const people = settings.splitPeople || [];
    const balMap = {};
    people.forEach((p) => { balMap[p] = 0; });
    splitLedger.forEach((e) => {
      if (!balMap.hasOwnProperty(e.person)) balMap[e.person] = 0;
      if (e.type === 'split_paid') balMap[e.person] += e.amount;
      else if (e.type === 'split_owed') balMap[e.person] -= e.amount;
      else if (e.type === 'settlement') {
        if (e.direction === 'received') balMap[e.person] -= e.amount;
        else balMap[e.person] += e.amount;
      }
    });
    return Object.values(balMap).filter((v) => v > 0).reduce((s, v) => s + v, 0);
  }, [state.splitLedger, settings]);

  const duePayments = useMemo(() => {
    if (!settings.plannedEnabled || !state.plannedPayments) return { overdue: [], dueToday: [], upcoming: [] };
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const weekFromNow = new Date(now);
    weekFromNow.setDate(weekFromNow.getDate() + 3);
    const overdue = [];
    const dueToday = [];
    const upcoming = [];
    state.plannedPayments.filter((p) => p.enabled).forEach((p) => {
      const d = new Date(p.nextDate);
      d.setHours(0, 0, 0, 0);
      const diff = Math.ceil((d - now) / 86400000);
      if (diff < 0) overdue.push({ ...p, diffDays: Math.abs(diff) });
      else if (diff === 0) dueToday.push(p);
      else if (diff <= 3) upcoming.push({ ...p, diffDays: diff });
    });
    return { overdue, dueToday, upcoming };
  }, [state.plannedPayments, settings.plannedEnabled]);

  const dueAlertCount = duePayments.overdue.length + duePayments.dueToday.length;

  const recentTransactions = transactions.slice(0, isDesktop ? 8 : 5);

  function getCategoryInfo(txn) {
    if (txn.type === 'income') {
      const cat = categories.income.find((c) => c.id === txn.categoryId);
      return cat || { icon: getCurrencyEmoji(currency), name: 'Income' };
    }
    if (txn.type === 'expense') {
      const cat = categories.expense.find((c) => c.id === txn.categoryId);
      return cat || { icon: '📦', name: 'Expense' };
    }
    return { icon: '🔄', name: 'Transfer' };
  }

  function getAccountName(id) {
    const acc = accounts.find((a) => a.id === id);
    return acc ? acc.name : 'Unknown';
  }

  const [, forceUpdate] = useState(0);
  const peekActive = settings.balancePeekUntil && Date.now() < settings.balancePeekUntil;
  const hideBalances = settings.hideBalances === true && !peekActive;
  const maskBalance = (val) => hideBalances ? 'xxxxx' : val;

  function togglePeek() {
    if (peekActive) {
      dispatch({ type: 'UPDATE_SETTINGS', payload: { balancePeekUntil: null } });
    } else {
      dispatch({ type: 'UPDATE_SETTINGS', payload: { balancePeekUntil: Date.now() + 60000 } });
    }
  }

  useEffect(() => {
    if (!settings.balancePeekUntil) return;
    const remaining = settings.balancePeekUntil - Date.now();
    if (remaining <= 0) {
      dispatch({ type: 'UPDATE_SETTINGS', payload: { balancePeekUntil: null } });
      return;
    }
    const timer = setTimeout(() => {
      dispatch({ type: 'UPDATE_SETTINGS', payload: { balancePeekUntil: null } });
      forceUpdate((n) => n + 1);
    }, remaining);
    return () => clearTimeout(timer);
  }, [settings.balancePeekUntil, dispatch]);
  const sampleLoaded = hasSampleData(accounts);

  function handleRemoveSample() {
    if (window.confirm('Remove all sample data? Your own data will be kept.')) {
      dispatch({ type: 'REMOVE_SAMPLE_DATA' });
    }
  }

  return (
    <div className="page">
      {sampleLoaded && (
        <div className="sample-banner">
          <span><i className="fa-solid fa-flask-vial" /> Sample data loaded</span>
          <button onClick={handleRemoveSample}>Remove</button>
        </div>
      )}

      {showBackupHint && backupMsg && (
        <div className="backup-hint">
          <div className="backup-hint-content">
            <i className={backupMsg.icon} />
            <span>{backupMsg.text}</span>
          </div>
          <div className="backup-hint-actions">
            {backupMsg.action === 'gdrive' ? (
              <button className="backup-hint-btn" onClick={handleQuickSync} disabled={syncing}>
                {syncing ? <i className="fa-solid fa-spinner fa-spin" /> : 'Sync'}
              </button>
            ) : (
              <button className="backup-hint-btn" onClick={() => { dismissBackupHint(); router.push('/preferences'); }}>
                Backup
              </button>
            )}
            <button className="backup-hint-dismiss" onClick={dismissBackupHint}>
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        </div>
      )}

      {(duePayments.overdue.length > 0 || duePayments.dueToday.length > 0 || duePayments.upcoming.length > 0) && (
        <Link href="/planned" className="due-alert-banner">
          {duePayments.overdue.length > 0 ? (
            <div className="due-alert due-alert-overdue">
              <i className="fa-solid fa-circle-exclamation" />
              <span>
                {duePayments.overdue.length === 1
                  ? `${duePayments.overdue[0].name} is ${duePayments.overdue[0].diffDays}d overdue`
                  : `${duePayments.overdue.length} payments are overdue`}
              </span>
            </div>
          ) : duePayments.dueToday.length > 0 ? (
            <div className="due-alert due-alert-today">
              <i className="fa-solid fa-bell" />
              <span>
                {duePayments.dueToday.length === 1
                  ? `${duePayments.dueToday[0].name} is due today`
                  : `${duePayments.dueToday.length} payments due today`}
              </span>
            </div>
          ) : (
            <div className="due-alert due-alert-upcoming">
              <i className="fa-solid fa-calendar-day" />
              <span>
                {duePayments.upcoming.length === 1
                  ? `${duePayments.upcoming[0].name} due in ${duePayments.upcoming[0].diffDays}d`
                  : `${duePayments.upcoming.length} payments coming up`}
              </span>
            </div>
          )}
          <i className="fa-solid fa-chevron-right due-alert-arrow" />
        </Link>
      )}

      {showReminderHint && (
        <div className="reminder-hint">
          <div className="reminder-hint-content">
            <i className="fa-solid fa-bell" />
            <span>Never forget to log expenses! Enable daily reminders?</span>
          </div>
          <div className="reminder-hint-actions">
            <button className="reminder-hint-enable" onClick={enableReminderFromHint}>Enable</button>
            <button className="reminder-hint-dismiss" onClick={dismissReminderHint}>
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        </div>
      )}

      <div className="home-header">
        <div className="home-header-left">
          {settings.hasProfilePhoto && (() => {
            const photo = typeof window !== 'undefined' ? localStorage.getItem('spendtraq_profile_photo') : null;
            return photo ? <img src={photo} alt="" className="home-profile-photo" /> : null;
          })()}
          <div>
            {settings.profileName ? (
              <>
                <p className="home-greeting">Welcome back,</p>
                <h1 className="home-title">{settings.profileName}</h1>
              </>
            ) : (
              <>
                <p className="home-greeting">Welcome to</p>
                <h1 className="home-title">SpendTrak</h1>
              </>
            )}
          </div>
        </div>
        <div className="home-header-actions">
          {settings.gdriveEmail && (
            <div className="home-sync-wrap">
              <button
                className="home-sync-btn"
                onClick={() => !syncing && setShowSyncMenu(!showSyncMenu)}
                disabled={syncing}
                title="Google Drive Sync"
              >
                {syncing ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-cloud" />}
              </button>
              {showSyncMenu && (
                <>
                  <div className="sync-menu-backdrop" onClick={() => setShowSyncMenu(false)} />
                  <div className="sync-menu">
                    <button className="sync-menu-item" onClick={() => { setShowSyncMenu(false); handleQuickSync(); }}>
                      <i className="fa-solid fa-cloud-arrow-up" style={{ color: '#4285F4' }} />
                      <div>
                        <p className="sync-menu-title">Push to Drive</p>
                        <p className="sync-menu-desc">Upload local data</p>
                      </div>
                    </button>
                    <button className="sync-menu-item" onClick={handleQuickPull}>
                      <i className="fa-solid fa-cloud-arrow-down" style={{ color: '#34A853' }} />
                      <div>
                        <p className="sync-menu-title">Pull from Drive</p>
                        <p className="sync-menu-desc">Merge cloud data</p>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          <Link href="/preferences" className="home-settings-btn" title="Preferences">
            <i className="fa-solid fa-gear" />
          </Link>
        </div>
      </div>

      {isDesktop ? (
        <div className="desktop-top-row">
          {settings.homeView === 'balance' ? (
            <div className="balance-card">
              <p className="balance-label">Total Balance</p>
              <div className="balance-amount-row">
                <h2 className="balance-amount">{maskBalance(formatCurrency(totalBalance, currency))}</h2>
                {settings.hideBalances && (
                  <button className="balance-peek-btn" onClick={() => togglePeek()}>
                    <i className={`fa-solid ${peekActive ? 'fa-eye-slash' : 'fa-eye'}`} />
                  </button>
                )}
              </div>
              {settings.showBalanceStats !== false && (
                <div className="balance-stats">
                  <div className="balance-stat">
                    <span className="stat-dot stat-income" />
                    <div>
                      <p className="stat-label">Income this month</p>
                      <p className="stat-value amount-positive">
                        +{formatCurrency(monthlyStats.income, currency)}
                      </p>
                    </div>
                  </div>
                  <div className="balance-stat">
                    <span className="stat-dot stat-expense" />
                    <div>
                      <p className="stat-label">Expense this month</p>
                      <p className="stat-value amount-negative">
                        -{formatCurrency(monthlyStats.expense, currency)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="balance-card balance-card-expense">
              <p className="balance-label">This Month's Expenses</p>
              <div className="balance-amount-row">
                <h2 className="balance-amount">-{formatCurrency(monthlyStats.expense, currency)}</h2>
              </div>
              {settings.showBalanceStats !== false && (
                <div className="balance-stats">
                  <div className="balance-stat">
                    <span className="stat-dot stat-income" />
                    <div>
                      <p className="stat-label">Income this month</p>
                      <p className="stat-value amount-positive">
                        +{formatCurrency(monthlyStats.income, currency)}
                      </p>
                    </div>
                  </div>
                  <div className="balance-stat">
                    <span className="stat-dot" style={{ background: '#74B9FF' }} />
                    <div>
                      <p className="stat-label">Balance</p>
                      <p className="stat-value">
                        {maskBalance(formatCurrency(totalBalance, currency))}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="desktop-quick-actions card">
            <h3 className="section-title" style={{ marginBottom: 16 }}>Quick Actions</h3>
            <div className="quick-actions-grid">
              <Link href="/add" className="quick-action">
                <span className="qa-icon qa-expense">📤</span>
                <span>Add Expense</span>
              </Link>
              <Link href="/add" className="quick-action">
                <span className="qa-icon qa-income">📥</span>
                <span>Add Income</span>
              </Link>
              <Link href="/add" className="quick-action">
                <span className="qa-icon qa-transfer">🔄</span>
                <span>Transfer</span>
              </Link>
              {settings.plannedEnabled && (
                <Link href="/planned" className="quick-action">
                  <span className="qa-icon qa-planned">📅</span>
                  <span>Planned</span>
                </Link>
              )}
              {settings.splitEnabled && (
                <Link href="/splits" className="quick-action">
                  <span className="qa-icon qa-splits">🤝</span>
                  <span>Splits</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      ) : settings.homeView === 'balance' ? (
        <div className="balance-card">
          <p className="balance-label">Total Balance</p>
          <div className="balance-amount-row">
            <h2 className="balance-amount">{maskBalance(formatCurrency(totalBalance, currency))}</h2>
            {settings.hideBalances && (
              <button className="balance-peek-btn" onClick={() => togglePeek()}>
                <i className={`fa-solid ${peekActive ? 'fa-eye-slash' : 'fa-eye'}`} />
              </button>
            )}
          </div>
          {settings.showBalanceStats !== false && (
            <div className="balance-stats">
              <div className="balance-stat">
                <span className="stat-dot stat-income" />
                <div>
                  <p className="stat-label">Income</p>
                  <p className="stat-value amount-positive">
                    +{formatCurrency(monthlyStats.income, currency)}
                  </p>
                </div>
              </div>
              <div className="balance-stat">
                <span className="stat-dot stat-expense" />
                <div>
                  <p className="stat-label">Expense</p>
                  <p className="stat-value amount-negative">
                    -{formatCurrency(monthlyStats.expense, currency)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="balance-card balance-card-expense">
          <p className="balance-label">This Month's Expenses</p>
          <div className="balance-amount-row">
            <h2 className="balance-amount">-{formatCurrency(monthlyStats.expense, currency)}</h2>
          </div>
          {settings.showBalanceStats !== false && (
            <div className="balance-stats">
              <div className="balance-stat">
                <span className="stat-dot stat-income" />
                <div>
                  <p className="stat-label">Income</p>
                  <p className="stat-value amount-positive">
                    +{formatCurrency(monthlyStats.income, currency)}
                  </p>
                </div>
              </div>
              <div className="balance-stat">
                <span className="stat-dot" style={{ background: '#74B9FF' }} />
                <div>
                  <p className="stat-label">Balance</p>
                  <p className="stat-value">
                    {maskBalance(formatCurrency(totalBalance, currency))}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {accounts.length > 0 && settings.showAccountsOnHome !== false && (
        <div className="section">
          <div className="section-header">
            <h3 className="section-title">My Accounts</h3>
            <Link href="/accounts" className="section-link">See all</Link>
          </div>
          <div className="accounts-scroll-wrapper">
            <div className="accounts-scroll">
              {accounts.map((acc) => (
                <div key={acc.id} className="account-mini-card">
                  {acc.logoUrl ? (
                    <img src={acc.logoUrl} alt="" className="account-mini-logo" />
                  ) : (
                    <span className="account-mini-icon">{getAccountIcon(acc.type, currency)}</span>
                  )}
                  <p className="account-mini-name">{acc.name}</p>
                  <p className="account-mini-balance">
                    {maskBalance(formatCurrency(acc.balance, currency))}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {settings.splitEnabled && settings.showSplitOnHome !== false && pendingSplitTotal > 0 && (
        <div className="section">
          <div className="section-header">
            <h3 className="section-title">Split Money</h3>
            <Link href="/splits" className="section-link">View all</Link>
          </div>
          <Link href="/splits" className="split-summary-card">
            <div className="split-summary-left">
              <span className="split-summary-icon">🤝</span>
              <div>
                <p className="split-summary-label">Others owe you</p>
                <p className="split-summary-total">{formatCurrency(pendingSplitTotal, currency)}</p>
              </div>
            </div>
            <i className="fa-solid fa-chevron-right split-summary-arrow" />
          </Link>
        </div>
      )}

      {settings.plannedEnabled && state.plannedPayments && state.plannedPayments.length > 0 && (
        <div className="section">
          <div className="section-header">
            <h3 className="section-title">Upcoming Payments</h3>
            <Link href="/planned" className="section-link">See all</Link>
          </div>
          <div className="upcoming-payments-list">
            {state.plannedPayments
              .filter((p) => p.enabled)
              .sort((a, b) => new Date(a.nextDate) - new Date(b.nextDate))
              .slice(0, 3)
              .map((payment) => {
                const dueDate = new Date(payment.nextDate);
                const todayDate = new Date();
                todayDate.setHours(0, 0, 0, 0);
                dueDate.setHours(0, 0, 0, 0);
                const diffDays = Math.ceil((dueDate - todayDate) / (1000 * 60 * 60 * 24));
                const dueLabel = diffDays < 0
                  ? `${Math.abs(diffDays)}d overdue`
                  : diffDays === 0
                  ? 'Due today'
                  : diffDays === 1
                  ? 'Tomorrow'
                  : `In ${diffDays}d`;
                return (
                  <Link key={payment.id} href="/planned" className="upcoming-payment-item">
                    <span className="upcoming-payment-icon">📅</span>
                    <div className="upcoming-payment-info">
                      <p className="upcoming-payment-name">{payment.name}</p>
                      <p className={`upcoming-payment-due ${diffDays < 0 ? 'overdue-text' : ''}`}>{dueLabel}</p>
                    </div>
                    <p className="upcoming-payment-amount">{formatCurrency(payment.amount, currency)}</p>
                  </Link>
                );
              })}
          </div>
        </div>
      )}

      <div className="section">
        <div className="section-header">
          <h3 className="section-title">Recent Transactions</h3>
          <Link href="/transactions" className="section-link">See all</Link>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📝</div>
            <p>No transactions yet. Add your first one!</p>
            {accounts.length === 0 && (
              <button
                className="btn btn-outline"
                style={{ marginTop: 16 }}
                onClick={() => dispatch({ type: 'LOAD_SAMPLE_DATA' })}
              >
                <i className="fa-solid fa-flask" /> Load Sample Data
              </button>
            )}
          </div>
        ) : (
          <div className="txn-list">
            {recentTransactions.map((txn) => {
              const catInfo = getCategoryInfo(txn);
              return (
                <div key={txn.id} className="txn-item">
                  <div className="txn-icon" style={{ background: (catInfo.color || '#ddd') + '20' }}>
                    {catInfo.icon}
                  </div>
                  <div className="txn-info">
                    <p className="txn-name">
                      {txn.type === 'transfer'
                        ? `${getAccountName(txn.fromAccountId)} → ${getAccountName(txn.toAccountId)}`
                        : txn.note || catInfo.name}
                    </p>
                    <p className="txn-meta">
                      {txn.type === 'transfer' ? 'Transfer' : catInfo.name} · {formatDate(txn.date)}
                      {txn.isSplit && <span className="txn-split-badge">{txn.splitSettled ? '✓ Split' : '⏳ Split'}</span>}
                    </p>
                  </div>
                  <p className={`txn-amount ${txn.type === 'income' ? 'amount-positive' : txn.type === 'expense' ? 'amount-negative' : ''}`}>
                    {txn.type === 'income' ? '+' : txn.type === 'expense' ? '-' : ''}
                    {formatCurrency(txn.amount, currency)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
