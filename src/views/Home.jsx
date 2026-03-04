'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '../context/AppContext';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { useToast } from '../components/Toast';
import { formatCurrency } from '../utils/currencies';
import { formatDate, getAccountIcon, generateId } from '../utils/helpers';
import { hasSampleData } from '../utils/sampleData';
import './Home.css';

export default function Home() {
  const { state, dispatch } = useApp();
  const { accounts, transactions, settings, categories } = state;
  const currency = settings.currency;
  const isDesktop = useIsDesktop();
  const toast = useToast();

  const [showReminderHint, setShowReminderHint] = useState(false);
  useEffect(() => {
    const reminders = settings.reminders || [];
    if (reminders.length > 0) return;
    if (sessionStorage.getItem('spendimeter_reminder_dismissed')) return;
    if (Math.random() < 0.35) setShowReminderHint(true);
  }, []);

  function dismissReminderHint() {
    setShowReminderHint(false);
    sessionStorage.setItem('spendimeter_reminder_dismissed', '1');
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
    () => accounts.reduce((sum, a) => sum + a.balance, 0),
    [accounts]
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

  const recentTransactions = transactions.slice(0, isDesktop ? 8 : 5);

  function getCategoryInfo(txn) {
    if (txn.type === 'income') {
      const cat = categories.income.find((c) => c.id === txn.categoryId);
      return cat || { icon: '💰', name: 'Income' };
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

  const [peekBalances, setPeekBalances] = useState(false);
  const hideBalances = settings.hideBalances === true && !peekBalances;
  const maskAmount = (val) => hideBalances ? 'xxxxx' : val;
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
        <div>
          <p className="home-greeting">Welcome back</p>
          <h1 className="home-title">Spendimeter</h1>
        </div>
        <Link href="/preferences" className="home-settings-btn" title="Preferences">
          <i className="fa-solid fa-gear" />
        </Link>
      </div>

      {isDesktop ? (
        <div className="desktop-top-row">
          {settings.homeView === 'balance' ? (
            <div className="balance-card">
              <p className="balance-label">Total Balance</p>
              <div className="balance-amount-row">
                <h2 className="balance-amount">{maskAmount(formatCurrency(totalBalance, currency))}</h2>
                {settings.hideBalances && (
                  <button className="balance-peek-btn" onClick={() => setPeekBalances((p) => !p)}>
                    <i className={`fa-solid ${peekBalances ? 'fa-eye-slash' : 'fa-eye'}`} />
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
                        +{maskAmount(formatCurrency(monthlyStats.income, currency))}
                      </p>
                    </div>
                  </div>
                  <div className="balance-stat">
                    <span className="stat-dot stat-expense" />
                    <div>
                      <p className="stat-label">Expense this month</p>
                      <p className="stat-value amount-negative">
                        -{maskAmount(formatCurrency(monthlyStats.expense, currency))}
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
                <h2 className="balance-amount">-{maskAmount(formatCurrency(monthlyStats.expense, currency))}</h2>
                {settings.hideBalances && (
                  <button className="balance-peek-btn" onClick={() => setPeekBalances((p) => !p)}>
                    <i className={`fa-solid ${peekBalances ? 'fa-eye-slash' : 'fa-eye'}`} />
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
                        +{maskAmount(formatCurrency(monthlyStats.income, currency))}
                      </p>
                    </div>
                  </div>
                  <div className="balance-stat">
                    <span className="stat-dot" style={{ background: '#74B9FF' }} />
                    <div>
                      <p className="stat-label">Balance</p>
                      <p className="stat-value">
                        {maskAmount(formatCurrency(totalBalance, currency))}
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
                <span className="qa-icon qa-expense">💸</span>
                <span>Add Expense</span>
              </Link>
              <Link href="/add" className="quick-action">
                <span className="qa-icon qa-income">💰</span>
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
            <h2 className="balance-amount">{maskAmount(formatCurrency(totalBalance, currency))}</h2>
            {settings.hideBalances && (
              <button className="balance-peek-btn" onClick={() => setPeekBalances((p) => !p)}>
                <i className={`fa-solid ${peekBalances ? 'fa-eye-slash' : 'fa-eye'}`} />
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
                    +{maskAmount(formatCurrency(monthlyStats.income, currency))}
                  </p>
                </div>
              </div>
              <div className="balance-stat">
                <span className="stat-dot stat-expense" />
                <div>
                  <p className="stat-label">Expense</p>
                  <p className="stat-value amount-negative">
                    -{maskAmount(formatCurrency(monthlyStats.expense, currency))}
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
            <h2 className="balance-amount">-{maskAmount(formatCurrency(monthlyStats.expense, currency))}</h2>
            {settings.hideBalances && (
              <button className="balance-peek-btn" onClick={() => setPeekBalances((p) => !p)}>
                <i className={`fa-solid ${peekBalances ? 'fa-eye-slash' : 'fa-eye'}`} />
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
                    +{maskAmount(formatCurrency(monthlyStats.income, currency))}
                  </p>
                </div>
              </div>
              <div className="balance-stat">
                <span className="stat-dot" style={{ background: '#74B9FF' }} />
                <div>
                  <p className="stat-label">Balance</p>
                  <p className="stat-value">
                    {maskAmount(formatCurrency(totalBalance, currency))}
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
                  <span className="account-mini-icon">{getAccountIcon(acc.type)}</span>
                  <p className="account-mini-name">{acc.name}</p>
                  <p className="account-mini-balance">
                    {maskAmount(formatCurrency(acc.balance, currency))}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {settings.splitEnabled && pendingSplitTotal > 0 && (
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
                <p className="split-summary-total">{maskAmount(formatCurrency(pendingSplitTotal, currency))}</p>
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
                    <p className="upcoming-payment-amount">{maskAmount(formatCurrency(payment.amount, currency))}</p>
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
                    {maskAmount(formatCurrency(txn.amount, currency))}
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
