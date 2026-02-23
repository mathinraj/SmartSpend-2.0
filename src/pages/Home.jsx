import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { formatCurrency } from '../utils/currencies';
import { formatDate, getAccountIcon } from '../utils/helpers';
import { hasSampleData } from '../utils/sampleData';
import './Home.css';

export default function Home() {
  const { state, dispatch } = useApp();
  const { accounts, transactions, settings, categories } = state;
  const currency = settings.currency;
  const isDesktop = useIsDesktop();

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
      .reduce((s, t) => s + t.amount, 0);
    return { income, expense };
  }, [transactions]);

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

      <div className="home-header">
        <div>
          <p className="home-greeting">Welcome back</p>
          <h1 className="home-title">Spendimeter</h1>
        </div>
        <Link to="/preferences" className="home-settings-btn" title="Preferences">
          <i className="fa-solid fa-gear" />
        </Link>
      </div>

      {isDesktop ? (
        <div className="desktop-top-row">
          {settings.homeView === 'balance' ? (
            <div className="balance-card">
              <p className="balance-label">Total Balance</p>
              <h2 className="balance-amount">{formatCurrency(totalBalance, currency)}</h2>
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
            </div>
          ) : (
            <div className="balance-card balance-card-expense">
              <p className="balance-label">This Month's Expenses</p>
              <h2 className="balance-amount">-{formatCurrency(monthlyStats.expense, currency)}</h2>
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
                      {formatCurrency(totalBalance, currency)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="desktop-quick-actions card">
            <h3 className="section-title" style={{ marginBottom: 16 }}>Quick Actions</h3>
            <div className="quick-actions-grid">
              <Link to="/add" className="quick-action">
                <span className="qa-icon qa-expense">💸</span>
                <span>Add Expense</span>
              </Link>
              <Link to="/add" className="quick-action">
                <span className="qa-icon qa-income">💰</span>
                <span>Add Income</span>
              </Link>
              <Link to="/add" className="quick-action">
                <span className="qa-icon qa-transfer">🔄</span>
                <span>Transfer</span>
              </Link>
              <Link to="/analytics" className="quick-action">
                <span className="qa-icon qa-analytics">📊</span>
                <span>Analytics</span>
              </Link>
            </div>
          </div>
        </div>
      ) : settings.homeView === 'balance' ? (
        <div className="balance-card">
          <p className="balance-label">Total Balance</p>
          <h2 className="balance-amount">{formatCurrency(totalBalance, currency)}</h2>
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
          <h2 className="balance-amount">-{formatCurrency(monthlyStats.expense, currency)}</h2>
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
                    {formatCurrency(totalBalance, currency)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {accounts.length > 0 && (
        <div className="section">
          <div className="section-header">
            <h3 className="section-title">My Accounts</h3>
            <Link to="/accounts" className="section-link">See all</Link>
          </div>
          <div className="accounts-scroll-wrapper">
            <div className="accounts-scroll">
              {accounts.map((acc) => (
                <div key={acc.id} className="account-mini-card">
                  <span className="account-mini-icon">{getAccountIcon(acc.type)}</span>
                  <p className="account-mini-name">{acc.name}</p>
                  <p className="account-mini-balance">
                    {formatCurrency(acc.balance, currency)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="section">
        <div className="section-header">
          <h3 className="section-title">Recent Transactions</h3>
          <Link to="/transactions" className="section-link">See all</Link>
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
