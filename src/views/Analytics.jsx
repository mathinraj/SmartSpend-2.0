'use client';

import { useState, useMemo } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line, Legend,
} from 'recharts';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/currencies';
import { toDateInputValue } from '../utils/helpers';
import './Analytics.css';

const PERIOD_OPTIONS = [
  { id: 'this_month', label: 'This Month', icon: 'fa-calendar' },
  { id: 'last_month', label: 'Last Month', icon: 'fa-calendar-minus' },
  { id: 'this_year', label: 'This Year', icon: 'fa-calendar-check' },
  { id: 'last_30', label: '30 Days', icon: 'fa-clock-rotate-left' },
  { id: 'last_90', label: '90 Days', icon: 'fa-clock-rotate-left' },
  { id: 'custom', label: 'Custom', icon: 'fa-calendar-days' },
];

export default function Analytics() {
  const { state } = useApp();
  const { transactions, categories, settings } = state;
  const currency = settings.currency;

  const [period, setPeriod] = useState('this_month');
  const [customStart, setCustomStart] = useState(toDateInputValue(new Date()));
  const [customEnd, setCustomEnd] = useState(toDateInputValue(new Date()));
  const [view, setView] = useState('overview');

  const dateRange = useMemo(() => {
    const now = new Date();
    let start, end;

    switch (period) {
      case 'this_month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'last_month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'this_year':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        break;
      case 'last_30':
        start = new Date(now.getTime() - 30 * 86400000);
        end = now;
        break;
      case 'last_90':
        start = new Date(now.getTime() - 90 * 86400000);
        end = now;
        break;
      case 'custom':
        start = new Date(customStart);
        end = new Date(customEnd);
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = now;
    }
    return { start, end };
  }, [period, customStart, customEnd]);

  const filteredTxns = useMemo(() => {
    return transactions.filter((t) => {
      const d = new Date(t.date);
      return d >= dateRange.start && d <= dateRange.end && t.type !== 'transfer';
    });
  }, [transactions, dateRange]);

  const totals = useMemo(() => {
    const income = filteredTxns
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + t.amount, 0);
    const expense = filteredTxns
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0);
    return { income, expense, net: income - expense };
  }, [filteredTxns]);

  const expenseByCategory = useMemo(() => {
    const map = {};
    filteredTxns
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const cat = categories.expense.find((c) => c.id === t.categoryId);
        const name = cat ? cat.name : 'Other';
        const color = cat ? cat.color : '#B2BEC3';
        if (!map[t.categoryId]) map[t.categoryId] = { name, value: 0, color };
        map[t.categoryId].value += t.amount;
      });
    return Object.values(map).sort((a, b) => b.value - a.value);
  }, [filteredTxns, categories]);

  const incomeByCategory = useMemo(() => {
    const map = {};
    filteredTxns
      .filter((t) => t.type === 'income')
      .forEach((t) => {
        const cat = categories.income.find((c) => c.id === t.categoryId);
        const name = cat ? cat.name : 'Other';
        const color = cat ? cat.color : '#B2BEC3';
        if (!map[t.categoryId]) map[t.categoryId] = { name, value: 0, color };
        map[t.categoryId].value += t.amount;
      });
    return Object.values(map).sort((a, b) => b.value - a.value);
  }, [filteredTxns, categories]);

  const dailyData = useMemo(() => {
    const map = {};
    filteredTxns.forEach((t) => {
      if (!map[t.date]) map[t.date] = { date: t.date, income: 0, expense: 0 };
      if (t.type === 'income') map[t.date].income += t.amount;
      if (t.type === 'expense') map[t.date].expense += t.amount;
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredTxns]);

  const monthlyData = useMemo(() => {
    const map = {};
    transactions
      .filter((t) => t.type !== 'transfer')
      .forEach((t) => {
        const d = new Date(t.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
        if (!map[key]) map[key] = { month: label, key, income: 0, expense: 0 };
        if (t.type === 'income') map[key].income += t.amount;
        if (t.type === 'expense') map[key].expense += t.amount;
      });
    return Object.values(map).sort((a, b) => a.key.localeCompare(b.key)).slice(-12);
  }, [transactions]);

  const CustomTooltipContent = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="chart-tooltip">
        <p className="chart-tooltip-label">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }}>
            {p.name}: {formatCurrency(p.value, currency)}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="page">
      <h1 className="page-title">Analytics</h1>

      <div className="period-pills">
        {PERIOD_OPTIONS.map((p) => (
          <button
            key={p.id}
            className={`period-pill ${period === p.id ? 'active' : ''}`}
            onClick={() => setPeriod(p.id)}
          >
            <i className={`fa-regular ${p.icon}`} />
            <span>{p.label}</span>
          </button>
        ))}
      </div>

      {period === 'custom' && (
        <div className="custom-dates">
          <div className="custom-date-field">
            <i className="fa-regular fa-calendar" />
            <input type="date" className="form-input" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
          </div>
          <span className="custom-date-sep"><i className="fa-solid fa-arrow-right" /></span>
          <div className="custom-date-field">
            <i className="fa-regular fa-calendar" />
            <input type="date" className="form-input" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
          </div>
        </div>
      )}

      <div className="summary-cards">
        <div className="summary-card summary-income">
          <p className="summary-label">Income</p>
          <p className="summary-value">+{formatCurrency(totals.income, currency)}</p>
        </div>
        <div className="summary-card summary-expense">
          <p className="summary-label">Expense</p>
          <p className="summary-value">-{formatCurrency(totals.expense, currency)}</p>
        </div>
        <div className="summary-card summary-net">
          <p className="summary-label">Net</p>
          <p className={`summary-value ${totals.net >= 0 ? 'amount-positive' : 'amount-negative'}`}>
            {totals.net >= 0 ? '+' : '-'}{formatCurrency(Math.abs(totals.net), currency)}
          </p>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${view === 'overview' ? 'active' : ''}`} onClick={() => setView('overview')}>
          Overview
        </button>
        <button className={`tab ${view === 'categories' ? 'active' : ''}`} onClick={() => setView('categories')}>
          Categories
        </button>
        <button className={`tab ${view === 'trends' ? 'active' : ''}`} onClick={() => setView('trends')}>
          Trends
        </button>
      </div>

      {view === 'overview' && (
        <>
          {dailyData.length > 0 ? (
            <div className="chart-card card">
              <h3 className="chart-title">Daily Overview</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dailyData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8ECF4" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                    fontSize={11}
                    tick={{ fill: '#636E72' }}
                  />
                  <YAxis fontSize={11} tick={{ fill: '#636E72' }} />
                  <Tooltip content={<CustomTooltipContent />} />
                  <Bar dataKey="income" fill="#00B894" name="Income" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" fill="#FF6B6B" name="Expense" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📊</div>
              <p>No data for this period</p>
            </div>
          )}
        </>
      )}

      {view === 'categories' && (
        <>
          {expenseByCategory.length > 0 && (
            <div className="chart-card card">
              <h3 className="chart-title">Expenses by Category</h3>
              <div className="pie-container">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={expenseByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {expenseByCategory.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatCurrency(value, currency)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="cat-legend">
                {expenseByCategory.map((cat, i) => (
                  <div key={i} className="cat-legend-item">
                    <div className="cat-legend-left">
                      <span className="cat-dot" style={{ background: cat.color }} />
                      <span className="cat-legend-name">{cat.name}</span>
                    </div>
                    <span className="cat-legend-value">
                      {formatCurrency(cat.value, currency)}
                      <span className="cat-legend-pct">
                        ({((cat.value / totals.expense) * 100).toFixed(1)}%)
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {incomeByCategory.length > 0 && (
            <div className="chart-card card">
              <h3 className="chart-title">Income by Category</h3>
              <div className="pie-container">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={incomeByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {incomeByCategory.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatCurrency(value, currency)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="cat-legend">
                {incomeByCategory.map((cat, i) => (
                  <div key={i} className="cat-legend-item">
                    <div className="cat-legend-left">
                      <span className="cat-dot" style={{ background: cat.color }} />
                      <span className="cat-legend-name">{cat.name}</span>
                    </div>
                    <span className="cat-legend-value">
                      {formatCurrency(cat.value, currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {expenseByCategory.length === 0 && incomeByCategory.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">🗂️</div>
              <p>No category data for this period</p>
            </div>
          )}
        </>
      )}

      {view === 'trends' && (
        <>
          {monthlyData.length > 0 ? (
            <div className="chart-card card">
              <h3 className="chart-title">Monthly Trends</h3>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={monthlyData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8ECF4" />
                  <XAxis dataKey="month" fontSize={11} tick={{ fill: '#636E72' }} />
                  <YAxis fontSize={11} tick={{ fill: '#636E72' }} />
                  <Tooltip content={<CustomTooltipContent />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="income"
                    stroke="#00B894"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                    name="Income"
                  />
                  <Line
                    type="monotone"
                    dataKey="expense"
                    stroke="#FF6B6B"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                    name="Expense"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📈</div>
              <p>Not enough data for trends yet</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
