'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line, Legend,
} from 'recharts';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatCurrencyPlain } from '../utils/currencies';
import { toDateInputValue, getAccountIcon } from '../utils/helpers';
import { captureChartAsImage, exportToPDF, exportToXLSXWithCharts } from '../utils/exportUtils';
import './Analytics.css';

const PERIOD_OPTIONS = [
  { id: 'this_month', label: 'This Month', icon: 'fa-calendar' },
  { id: 'last_month', label: 'Last Month', icon: 'fa-calendar-minus' },
  { id: 'this_year', label: 'This Year', icon: 'fa-calendar-check' },
  { id: 'last_30', label: '30 Days', icon: 'fa-clock-rotate-left' },
  { id: 'last_90', label: '90 Days', icon: 'fa-clock-rotate-left' },
  { id: 'custom', label: 'Custom', icon: 'fa-calendar-days' },
];

function computeDateRange(period, customStart, customEnd) {
  const now = new Date();
  let start, end;
  switch (period) {
    case 'this_month': start = new Date(now.getFullYear(), now.getMonth(), 1); end = new Date(now.getFullYear(), now.getMonth() + 1, 0); break;
    case 'last_month': start = new Date(now.getFullYear(), now.getMonth() - 1, 1); end = new Date(now.getFullYear(), now.getMonth(), 0); break;
    case 'this_year': start = new Date(now.getFullYear(), 0, 1); end = new Date(now.getFullYear(), 11, 31); break;
    case 'last_30': start = new Date(now.getTime() - 30 * 86400000); end = now; break;
    case 'last_90': start = new Date(now.getTime() - 90 * 86400000); end = now; break;
    case 'custom': start = new Date(customStart); end = new Date(customEnd); break;
    default: start = new Date(now.getFullYear(), now.getMonth(), 1); end = now;
  }
  return { start, end };
}

function getExpenseAmount(t, splitExpenseRecord = 'my_share') {
  if (!t.isSplit || !t.splitAmount) return t.amount;
  return splitExpenseRecord === 'full' ? t.amount : (t.amount - (t.splitAmount || 0));
}

function computeExpenseByCategory(txns, categories, amtFn) {
  const map = {};
  txns.filter((t) => t.type === 'expense').forEach((t) => {
    const cat = categories.expense.find((c) => c.id === t.categoryId);
    const name = cat ? cat.name : 'Other';
    const color = cat ? cat.color : '#B2BEC3';
    if (!map[t.categoryId]) map[t.categoryId] = { id: t.categoryId, name, value: 0, color };
    map[t.categoryId].value += amtFn(t);
  });
  return Object.values(map).sort((a, b) => b.value - a.value);
}

function filterByAccounts(txns, accountIds) {
  if (!accountIds.length) return txns;
  return txns.filter((t) => accountIds.includes(t.accountId) || accountIds.includes(t.fromAccountId) || accountIds.includes(t.toAccountId));
}

export default function Analytics() {
  const { state } = useApp();
  const { transactions, accounts, categories, settings } = state;
  const currency = settings.currency;
  const isDark = settings.theme === 'dark';
  const splitRecord = settings.splitExpenseRecord || 'my_share';
  const expAmt = (t) => getExpenseAmount(t, splitRecord);
  const gridColor = isDark ? '#333' : '#E8ECF4';
  const tickColor = isDark ? '#9e9e9e' : '#636E72';
  const searchParams = useSearchParams();

  const [period, setPeriod] = useState('this_month');
  const [customStart, setCustomStart] = useState(toDateInputValue(new Date()));
  const [customEnd, setCustomEnd] = useState(toDateInputValue(new Date()));
  const [view, setView] = useState('overview');
  const [filterAccountIds, setFilterAccountIds] = useState([]);
  const [compareMode, setCompareMode] = useState(false);
  const [compareMonthA, setCompareMonthA] = useState('');
  const [compareMonthB, setCompareMonthB] = useState('');
  const [compareCategoryIds, setCompareCategoryIds] = useState([]);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const chartsRef = useRef(null);

  useEffect(() => {
    const accParam = searchParams.get('account');
    if (accParam && accounts.find((a) => a.id === accParam)) {
      setSelectedAccountId(accParam);
      setView('accounts');
    }
  }, [searchParams, accounts]);

  function toggleFilterAccount(id) {
    setFilterAccountIds((prev) => prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]);
  }

  function toggleCompareCategory(id) {
    setCompareCategoryIds((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);
  }

  const dateRange = useMemo(() => computeDateRange(period, customStart, customEnd), [period, customStart, customEnd]);

  const availableMonths = useMemo(() => {
    const monthSet = new Set();
    transactions.forEach((t) => {
      if (t.date) {
        const d = new Date(t.date);
        monthSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }
    });
    const now = new Date();
    monthSet.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    return Array.from(monthSet).sort().reverse().map((key) => {
      const [y, m] = key.split('-');
      const d = new Date(parseInt(y), parseInt(m) - 1, 1);
      return { key, label: d.toLocaleString('default', { month: 'long', year: 'numeric' }) };
    });
  }, [transactions]);

  useEffect(() => {
    if (availableMonths.length > 0 && !compareMonthA) setCompareMonthA(availableMonths[0]?.key || '');
    if (availableMonths.length > 1 && !compareMonthB) setCompareMonthB(availableMonths[1]?.key || '');
  }, [availableMonths]);

  const compareRangeA = useMemo(() => {
    if (!compareMonthA) return { start: new Date(), end: new Date() };
    const [y, m] = compareMonthA.split('-').map(Number);
    return { start: new Date(y, m - 1, 1), end: new Date(y, m, 0) };
  }, [compareMonthA]);

  const compareRangeB = useMemo(() => {
    if (!compareMonthB) return { start: new Date(), end: new Date() };
    const [y, m] = compareMonthB.split('-').map(Number);
    return { start: new Date(y, m - 1, 1), end: new Date(y, m, 0) };
  }, [compareMonthB]);

  const filteredTxns = useMemo(() => {
    let txns = transactions.filter((t) => {
      const d = new Date(t.date);
      return d >= dateRange.start && d <= dateRange.end && t.type !== 'transfer';
    });
    return filterByAccounts(txns, filterAccountIds);
  }, [transactions, dateRange, filterAccountIds]);

  const compareTxnsA = useMemo(() => {
    if (!compareMode) return [];
    let txns = transactions.filter((t) => {
      const d = new Date(t.date);
      return d >= compareRangeA.start && d <= compareRangeA.end && t.type !== 'transfer';
    });
    return filterByAccounts(txns, filterAccountIds);
  }, [transactions, compareRangeA, compareMode, filterAccountIds]);

  const compareTxnsB = useMemo(() => {
    if (!compareMode) return [];
    let txns = transactions.filter((t) => {
      const d = new Date(t.date);
      return d >= compareRangeB.start && d <= compareRangeB.end && t.type !== 'transfer';
    });
    return filterByAccounts(txns, filterAccountIds);
  }, [transactions, compareRangeB, compareMode, filterAccountIds]);

  const totals = useMemo(() => {
    const income = filteredTxns.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = filteredTxns.filter((t) => t.type === 'expense').reduce((s, t) => s + expAmt(t), 0);
    return { income, expense, net: income - expense };
  }, [filteredTxns]);

  const expenseByCategory = useMemo(() => computeExpenseByCategory(filteredTxns, categories, expAmt), [filteredTxns, categories, splitRecord]);
  const compareExpByCatA = useMemo(() => compareMode ? computeExpenseByCategory(compareTxnsA, categories, expAmt) : [], [compareTxnsA, categories, compareMode, splitRecord]);
  const compareExpByCatB = useMemo(() => compareMode ? computeExpenseByCategory(compareTxnsB, categories, expAmt) : [], [compareTxnsB, categories, compareMode, splitRecord]);

  const incomeByCategory = useMemo(() => {
    const map = {};
    filteredTxns.filter((t) => t.type === 'income').forEach((t) => {
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
      if (t.type === 'expense') map[t.date].expense += expAmt(t);
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredTxns]);

  const topExpenses = useMemo(() => {
    return filteredTxns.filter((t) => t.type === 'expense').sort((a, b) => b.amount - a.amount).slice(0, 5).map((t) => {
      const cat = categories.expense.find((c) => c.id === t.categoryId);
      return { ...t, categoryName: cat?.name || 'Other', categoryIcon: cat?.icon || '📦', categoryColor: cat?.color || '#B2BEC3' };
    });
  }, [filteredTxns, categories]);

  const avgDaily = useMemo(() => {
    const expenses = filteredTxns.filter((t) => t.type === 'expense');
    if (expenses.length === 0) return 0;
    const total = expenses.reduce((s, t) => s + expAmt(t), 0);
    const days = new Set(expenses.map((t) => t.date)).size;
    return days > 0 ? total / days : 0;
  }, [filteredTxns]);

  const savingsRate = useMemo(() => totals.income === 0 ? null : ((totals.income - totals.expense) / totals.income) * 100, [totals]);

  const weekdayData = useMemo(() => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const map = dayNames.map((name) => ({ name, expense: 0 }));
    filteredTxns.filter((t) => t.type === 'expense').forEach((t) => {
      const day = new Date(t.date + 'T00:00:00').getDay();
      map[day].expense += expAmt(t);
    });
    return map;
  }, [filteredTxns]);

  const monthlyData = useMemo(() => {
    const map = {};
    let txns = transactions.filter((t) => t.type !== 'transfer');
    txns = filterByAccounts(txns, filterAccountIds);
    txns.forEach((t) => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      if (!map[key]) map[key] = { month: label, key, income: 0, expense: 0 };
      if (t.type === 'income') map[key].income += t.amount;
      if (t.type === 'expense') map[key].expense += expAmt(t);
    });
    return Object.values(map).sort((a, b) => a.key.localeCompare(b.key)).slice(-12);
  }, [transactions, filterAccountIds]);

  // Comparison data: Period A vs Period B, optionally filtered to selected categories
  const comparisonData = useMemo(() => {
    if (!compareMode) return [];
    let catA = compareExpByCatA;
    let catB = compareExpByCatB;
    if (compareCategoryIds.length > 0) {
      catA = catA.filter((c) => compareCategoryIds.includes(c.id));
      catB = catB.filter((c) => compareCategoryIds.includes(c.id));
    }
    const allNames = new Set([...catA.map((c) => c.name), ...catB.map((c) => c.name)]);
    return Array.from(allNames).map((name) => {
      const a = catA.find((c) => c.name === name);
      const b = catB.find((c) => c.name === name);
      const valA = a?.value || 0;
      const valB = b?.value || 0;
      const change = valB > 0 ? ((valA - valB) / valB) * 100 : valA > 0 ? 100 : 0;
      return { name, periodA: valA, periodB: valB, change, color: a?.color || b?.color || '#B2BEC3' };
    }).sort((a, b) => b.periodA - a.periodA);
  }, [compareMode, compareExpByCatA, compareExpByCatB, compareCategoryIds]);

  const creditCards = useMemo(() => accounts.filter((a) => a.type === 'card' && a.subType === 'credit'), [accounts]);

  const creditCardSpending = useMemo(() => {
    return creditCards.map((card) => {
      const cardTxns = filteredTxns.filter((t) => t.type === 'expense' && t.accountId === card.id);
      const spent = cardTxns.reduce((s, t) => s + expAmt(t), 0);
      return { id: card.id, name: card.name, spent, balance: card.balance, limit: card.creditLimit || 0 };
    });
  }, [creditCards, filteredTxns]);

  const creditCardPayments = useMemo(() => {
    const cardIds = new Set(creditCards.map((c) => c.id));
    return transactions.filter((t) => t.type === 'transfer' && cardIds.has(t.toAccountId))
      .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10)
      .map((t) => {
        const card = creditCards.find((c) => c.id === t.toAccountId);
        const from = accounts.find((a) => a.id === t.fromAccountId);
        return { ...t, cardName: card?.name || '', fromName: from?.name || '' };
      });
  }, [transactions, creditCards, accounts]);

  const accountAnalytics = useMemo(() => {
    if (!selectedAccountId) return null;
    const accTxns = transactions.filter((t) => {
      const d = new Date(t.date);
      if (d < dateRange.start || d > dateRange.end) return false;
      return t.accountId === selectedAccountId || t.fromAccountId === selectedAccountId || t.toAccountId === selectedAccountId;
    });
    const income = accTxns.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = accTxns.filter((t) => t.type === 'expense').reduce((s, t) => s + expAmt(t), 0);
    const catBreakdown = computeExpenseByCategory(accTxns, categories, expAmt);
    const dailyMap = {};
    accTxns.filter((t) => t.type !== 'transfer').forEach((t) => {
      if (!dailyMap[t.date]) dailyMap[t.date] = { date: t.date, income: 0, expense: 0 };
      if (t.type === 'income') dailyMap[t.date].income += t.amount;
      if (t.type === 'expense') dailyMap[t.date].expense += expAmt(t);
    });
    const daily = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
    const monthMap = {};
    transactions.filter((t) => t.accountId === selectedAccountId || t.fromAccountId === selectedAccountId || t.toAccountId === selectedAccountId)
      .filter((t) => t.type !== 'transfer').forEach((t) => {
        const d = new Date(t.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
        if (!monthMap[key]) monthMap[key] = { month: label, key, income: 0, expense: 0 };
        if (t.type === 'income') monthMap[key].income += t.amount;
        if (t.type === 'expense') monthMap[key].expense += expAmt(t);
      });
    const monthly = Object.values(monthMap).sort((a, b) => a.key.localeCompare(b.key)).slice(-12);
    return { income, expense, txnCount: accTxns.length, catBreakdown, daily, monthly };
  }, [selectedAccountId, transactions, dateRange, categories]);

  const fmtPlain = useCallback((val) => formatCurrencyPlain(val, currency), [currency]);

  const handleExportPDF = useCallback(async () => {
    setExporting(true);
    setShowExportMenu(false);
    try {
      const chartImages = [];
      if (chartsRef.current) {
        const cards = chartsRef.current.querySelectorAll('.chart-card');
        for (const card of cards) {
          const img = await captureChartAsImage(card);
          if (img) chartImages.push({ data: img, width: 170, height: 70, label: card.querySelector('.chart-title')?.textContent || '' });
        }
      }
      const tables = [{
        title: 'Summary',
        headers: ['Metric', 'Value'],
        rows: [
          ['Period', PERIOD_OPTIONS.find((p) => p.id === period)?.label || period],
          ['Income', fmtPlain(totals.income)],
          ['Expense', fmtPlain(totals.expense)],
          ['Net', fmtPlain(totals.net)],
          ['Avg Daily Spend', fmtPlain(avgDaily)],
          ['Savings Rate', savingsRate !== null ? `${savingsRate.toFixed(1)}%` : 'N/A'],
        ],
      }];
      if (expenseByCategory.length > 0) {
        tables.push({
          title: 'Expense by Category',
          headers: ['Category', 'Amount', '%'],
          rows: expenseByCategory.map((c) => [c.name, fmtPlain(c.value), totals.expense > 0 ? `${((c.value / totals.expense) * 100).toFixed(1)}%` : '0%']),
        });
      }
      exportToPDF({ title: 'SpendTrak Analytics', subtitle: `${PERIOD_OPTIONS.find((p) => p.id === period)?.label || 'Custom'} Report`, tables, chartImages, filename: `spendtrak-analytics-${new Date().toISOString().slice(0, 10)}.pdf` });
    } catch { /* ignore */ }
    setExporting(false);
  }, [period, totals, avgDaily, savingsRate, expenseByCategory, fmtPlain]);

  const handleExportXLSX = useCallback(async () => {
    setExporting(true);
    setShowExportMenu(false);
    try {
      const chartImages = [];
      if (chartsRef.current) {
        const cards = chartsRef.current.querySelectorAll('.chart-card');
        for (const card of cards) {
          const img = await captureChartAsImage(card);
          if (img) chartImages.push({ data: img, label: card.querySelector('.chart-title')?.textContent || '' });
        }
      }
      const sheets = [
        { name: 'Summary', headers: ['Metric', 'Value'], rows: [['Income', totals.income], ['Expense', totals.expense], ['Net', totals.net], ['Avg Daily', avgDaily], ['Savings Rate %', savingsRate ?? 'N/A'], ['Transactions', filteredTxns.length]] },
        { name: 'Daily', headers: ['Date', 'Income', 'Expense'], rows: dailyData.map((d) => [d.date, d.income, d.expense]) },
        { name: 'Expense Categories', headers: ['Category', 'Amount', '%'], rows: expenseByCategory.map((c) => [c.name, c.value, totals.expense > 0 ? +((c.value / totals.expense) * 100).toFixed(1) : 0]) },
        { name: 'Income Categories', headers: ['Category', 'Amount'], rows: incomeByCategory.map((c) => [c.name, c.value]) },
        { name: 'Monthly Trends', headers: ['Month', 'Income', 'Expense'], rows: monthlyData.map((m) => [m.month, m.income, m.expense]) },
      ];
      await exportToXLSXWithCharts({ sheets, chartImages, filename: `spendtrak-analytics-${new Date().toISOString().slice(0, 10)}.xlsx` });
    } catch { /* ignore */ }
    setExporting(false);
  }, [totals, avgDaily, savingsRate, filteredTxns, dailyData, expenseByCategory, incomeByCategory, monthlyData]);

  const CustomTooltipContent = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="chart-tooltip">
        <p className="chart-tooltip-label">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }}>{p.name}: {formatCurrency(p.value, currency)}</p>
        ))}
      </div>
    );
  };

  const allExpenseCategories = categories.expense || [];
  const periodALabel = availableMonths.find((m) => m.key === compareMonthA)?.label || compareMonthA;
  const periodBLabel = availableMonths.find((m) => m.key === compareMonthB)?.label || compareMonthB;

  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'categories', label: 'Categories' },
    ...(creditCards.length > 0 ? [{ id: 'cards', label: 'Cards' }] : []),
    { id: 'accounts', label: 'Accounts' },
    { id: 'trends', label: 'Trends' },
  ];

  return (
    <div className="page">
      <div className="analytics-header">
        <h1 className="page-title" style={{ marginBottom: 0 }}>Analytics</h1>
        <div className="analytics-header-actions">
          <div className="export-menu-wrap">
            <button className={`btn btn-sm btn-ghost ${exporting ? 'disabled' : ''}`} onClick={() => setShowExportMenu(!showExportMenu)} disabled={exporting}>
              <i className={`fa-solid ${exporting ? 'fa-spinner fa-spin' : 'fa-download'}`} /> Export
            </button>
            {showExportMenu && (
              <div className="export-dropdown">
                <button className="export-dropdown-item" onClick={handleExportPDF}><i className="fa-solid fa-file-pdf" /> PDF (with charts)</button>
                <button className="export-dropdown-item" onClick={handleExportXLSX}><i className="fa-solid fa-file-excel" /> Excel (with charts)</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="period-pills">
        {PERIOD_OPTIONS.map((p) => (
          <button key={p.id} className={`period-pill ${period === p.id ? 'active' : ''}`} onClick={() => setPeriod(p.id)}>
            <i className={`fa-regular ${p.icon}`} /><span>{p.label}</span>
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

      {/* Multi-select account filter */}
      {accounts.length > 0 && (
        <div className="account-filter-row">
          <button className={`af-chip ${filterAccountIds.length === 0 ? 'active' : ''}`} onClick={() => setFilterAccountIds([])}>All</button>
          {accounts.map((a) => (
            <button key={a.id} className={`af-chip ${filterAccountIds.includes(a.id) ? 'active' : ''}`} onClick={() => toggleFilterAccount(a.id)}>
              <span className="af-chip-icon">{getAccountIcon(a.type, currency)}</span> {a.name}
            </button>
          ))}
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
        {TABS.map((t) => (
          <button key={t.id} className={`tab ${view === t.id ? 'active' : ''}`} onClick={() => setView(t.id)}>{t.label}</button>
        ))}
      </div>

      <div ref={chartsRef}>
        {/* ── OVERVIEW ── */}
        {view === 'overview' && (
          <>
            {filteredTxns.length > 0 && (
              <div className="quick-stats">
                <div className="quick-stat-card">
                  <i className="fa-solid fa-chart-line quick-stat-icon" style={{ color: '#6C5CE7' }} />
                  <div><p className="quick-stat-label">Avg. Daily Spend</p><p className="quick-stat-value">{formatCurrency(avgDaily, currency)}</p></div>
                </div>
                <div className="quick-stat-card">
                  <i className="fa-solid fa-piggy-bank quick-stat-icon" style={{ color: savingsRate !== null && savingsRate >= 0 ? '#00B894' : '#FF6B6B' }} />
                  <div><p className="quick-stat-label">Savings Rate</p><p className="quick-stat-value">{savingsRate !== null ? `${savingsRate.toFixed(1)}%` : '—'}</p></div>
                </div>
                <div className="quick-stat-card">
                  <i className="fa-solid fa-receipt quick-stat-icon" style={{ color: '#E17055' }} />
                  <div><p className="quick-stat-label">Transactions</p><p className="quick-stat-value">{filteredTxns.length}</p></div>
                </div>
              </div>
            )}
            {dailyData.length > 0 ? (
              <div className="chart-card card">
                <h3 className="chart-title">Daily Overview</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={dailyData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} fontSize={11} tick={{ fill: tickColor }} />
                    <YAxis fontSize={11} tick={{ fill: tickColor }} />
                    <Tooltip content={<CustomTooltipContent />} />
                    <Bar dataKey="income" fill="#00B894" name="Income" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" fill="#FF6B6B" name="Expense" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (<div className="empty-state"><div className="empty-state-icon">📊</div><p>No data for this period</p></div>)}
            {weekdayData.some((d) => d.expense > 0) && (
              <div className="chart-card card">
                <h3 className="chart-title">Spending by Day of Week</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={weekdayData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="name" fontSize={11} tick={{ fill: tickColor }} />
                    <YAxis fontSize={11} tick={{ fill: tickColor }} />
                    <Tooltip content={<CustomTooltipContent />} />
                    <Bar dataKey="expense" fill="#A29BFE" name="Expense" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            {topExpenses.length > 0 && (
              <div className="chart-card card">
                <h3 className="chart-title">Top Expenses</h3>
                <div className="top-expenses-list">
                  {topExpenses.map((t, i) => (
                    <div key={t.id} className="top-expense-item">
                      <span className="top-expense-rank">#{i + 1}</span>
                      <span className="top-expense-icon" style={{ background: t.categoryColor + '18' }}>{t.categoryIcon}</span>
                      <div className="top-expense-info">
                        <p className="top-expense-note">{t.note || t.categoryName}</p>
                        <p className="top-expense-meta">{t.categoryName} · {new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                      </div>
                      <span className="top-expense-amount">{formatCurrency(t.amount, currency)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── CATEGORIES ── */}
        {view === 'categories' && (
          <>
            <div className="compare-toggle-row">
              <button className={`compare-toggle ${compareMode ? 'active' : ''}`} onClick={() => { setCompareMode(!compareMode); setCompareCategoryIds([]); }}>
                <i className="fa-solid fa-code-compare" /> {compareMode ? 'Comparing' : 'Compare'}
              </button>
            </div>

            {compareMode && (
              <div className="compare-controls">
                <div className="compare-period-row">
                  <div className="compare-period-col">
                    <span className="compare-period-label">Month A</span>
                    <select className="compare-period-select" value={compareMonthA} onChange={(e) => setCompareMonthA(e.target.value)}>
                      {availableMonths.map((m) => (<option key={m.key} value={m.key}>{m.label}</option>))}
                    </select>
                  </div>
                  <span className="compare-vs">vs</span>
                  <div className="compare-period-col">
                    <span className="compare-period-label">Month B</span>
                    <select className="compare-period-select" value={compareMonthB} onChange={(e) => setCompareMonthB(e.target.value)}>
                      {availableMonths.map((m) => (<option key={m.key} value={m.key}>{m.label}</option>))}
                    </select>
                  </div>
                </div>
                {allExpenseCategories.length > 0 && (
                  <div className="compare-cat-filter">
                    <span className="compare-cat-label">Categories {compareCategoryIds.length > 0 ? `(${compareCategoryIds.length})` : '(all)'}</span>
                    <div className="compare-cat-chips">
                      {allExpenseCategories.map((c) => (
                        <button key={c.id} className={`af-chip ${compareCategoryIds.includes(c.id) ? 'active' : ''}`} onClick={() => toggleCompareCategory(c.id)}>
                          {c.icon} {c.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {compareMode && comparisonData.length > 0 ? (
              <div className="chart-card card">
                <h3 className="chart-title">{periodALabel} vs {periodBLabel}</h3>
                <ResponsiveContainer width="100%" height={Math.max(200, comparisonData.length * 45)}>
                  <BarChart data={comparisonData} layout="vertical" margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis type="number" fontSize={10} tick={{ fill: tickColor }} />
                    <YAxis type="category" dataKey="name" width={80} fontSize={11} tick={{ fill: tickColor }} />
                    <Tooltip content={<CustomTooltipContent />} />
                    <Legend />
                    <Bar dataKey="periodA" fill="#6C5CE7" name={periodALabel} radius={[0, 4, 4, 0]} />
                    <Bar dataKey="periodB" fill="#B2BEC3" name={periodBLabel} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="comparison-table">
                  <div className="comparison-row comparison-header-row">
                    <span className="cat-dot" style={{ background: 'transparent' }} />
                    <span className="comparison-name">Category</span>
                    <span className="comparison-curr">{periodALabel}</span>
                    <span className="comparison-prev">{periodBLabel}</span>
                    <span className="comparison-change">Change</span>
                  </div>
                  {comparisonData.map((row, i) => (
                    <div key={i} className="comparison-row">
                      <span className="cat-dot" style={{ background: row.color }} />
                      <span className="comparison-name">{row.name}</span>
                      <span className="comparison-curr">{formatCurrency(row.periodA, currency)}</span>
                      <span className="comparison-prev">{formatCurrency(row.periodB, currency)}</span>
                      <span className={`comparison-change ${row.change > 0 ? 'up' : row.change < 0 ? 'down' : ''}`}>
                        {row.change > 0 ? '▲' : row.change < 0 ? '▼' : '—'} {Math.abs(row.change).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : !compareMode ? (
              <>
                {expenseByCategory.length > 0 && (
                  <div className="chart-card card">
                    <h3 className="chart-title">Expenses by Category</h3>
                    <div className="pie-container">
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart><Pie data={expenseByCategory} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                          {expenseByCategory.map((entry, index) => (<Cell key={index} fill={entry.color} />))}
                        </Pie><Tooltip formatter={(value) => formatCurrency(value, currency)} /></PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="cat-legend">
                      {expenseByCategory.map((cat, i) => (
                        <div key={i} className="cat-legend-item">
                          <div className="cat-legend-left"><span className="cat-dot" style={{ background: cat.color }} /><span className="cat-legend-name">{cat.name}</span></div>
                          <span className="cat-legend-value">{formatCurrency(cat.value, currency)}<span className="cat-legend-pct">({((cat.value / totals.expense) * 100).toFixed(1)}%)</span></span>
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
                        <PieChart><Pie data={incomeByCategory} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                          {incomeByCategory.map((entry, index) => (<Cell key={index} fill={entry.color} />))}
                        </Pie><Tooltip formatter={(value) => formatCurrency(value, currency)} /></PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="cat-legend">
                      {incomeByCategory.map((cat, i) => (
                        <div key={i} className="cat-legend-item">
                          <div className="cat-legend-left"><span className="cat-dot" style={{ background: cat.color }} /><span className="cat-legend-name">{cat.name}</span></div>
                          <span className="cat-legend-value">{formatCurrency(cat.value, currency)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {expenseByCategory.length === 0 && incomeByCategory.length === 0 && (
                  <div className="empty-state"><div className="empty-state-icon">🗂️</div><p>No category data for this period</p></div>
                )}
              </>
            ) : (
              <div className="empty-state"><div className="empty-state-icon">📊</div><p>No comparison data available</p></div>
            )}
          </>
        )}

        {/* ── TRENDS ── */}
        {view === 'trends' && (
          <>
            {monthlyData.length > 0 ? (
              <div className="chart-card card">
                <h3 className="chart-title">Monthly Trends</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={monthlyData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="month" fontSize={11} tick={{ fill: tickColor }} />
                    <YAxis fontSize={11} tick={{ fill: tickColor }} />
                    <Tooltip content={<CustomTooltipContent />} />
                    <Legend />
                    <Line type="monotone" dataKey="income" stroke="#00B894" strokeWidth={2.5} dot={{ r: 4 }} name="Income" />
                    <Line type="monotone" dataKey="expense" stroke="#FF6B6B" strokeWidth={2.5} dot={{ r: 4 }} name="Expense" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (<div className="empty-state"><div className="empty-state-icon">📈</div><p>Not enough data for trends yet</p></div>)}
          </>
        )}

        {/* ── CREDIT CARDS ── */}
        {view === 'cards' && (
          <>
            {creditCards.length === 0 ? (
              <div className="empty-state"><div className="empty-state-icon">💳</div><p>No credit cards found. Add a credit card in Accounts.</p></div>
            ) : (
              <>
                <div className="cc-cards-grid">
                  {creditCards.map((card) => {
                    const util = card.creditLimit ? (Math.abs(card.balance) / card.creditLimit) * 100 : 0;
                    const utilClass = util < 30 ? 'low' : util < 70 ? 'mid' : 'high';
                    return (
                      <div key={card.id} className="cc-util-card card">
                        <div className="cc-util-header">
                          <span className="cc-util-name">💳 {card.name}</span>
                          <span className={`cc-util-pct ${utilClass}`}>{util.toFixed(0)}%</span>
                        </div>
                        <div className="cc-util-bar-bg"><div className={`cc-util-bar-fill ${utilClass}`} style={{ width: `${Math.min(util, 100)}%` }} /></div>
                        <div className="cc-util-details">
                          <span>Balance: {formatCurrency(Math.abs(card.balance), currency)}</span>
                          <span>Limit: {card.creditLimit ? formatCurrency(card.creditLimit, currency) : 'N/A'}</span>
                        </div>
                        {card.creditLimit && (<p className="cc-util-avail">Available: {formatCurrency(Math.max(0, card.creditLimit - Math.abs(card.balance)), currency)}</p>)}
                      </div>
                    );
                  })}
                </div>
                {creditCardSpending.some((c) => c.spent > 0) && (
                  <div className="chart-card card">
                    <h3 className="chart-title">Spending by Card</h3>
                    <ResponsiveContainer width="100%" height={Math.max(150, creditCardSpending.length * 50)}>
                      <BarChart data={creditCardSpending} layout="vertical" margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                        <XAxis type="number" fontSize={10} tick={{ fill: tickColor }} />
                        <YAxis type="category" dataKey="name" width={90} fontSize={11} tick={{ fill: tickColor }} />
                        <Tooltip content={<CustomTooltipContent />} />
                        <Bar dataKey="spent" fill="#6C5CE7" name="Spent" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {creditCardPayments.length > 0 && (
                  <div className="chart-card card">
                    <h3 className="chart-title">Recent Bill Payments</h3>
                    <div className="cc-payments-list">
                      {creditCardPayments.map((p) => (
                        <div key={p.id} className="cc-payment-item">
                          <span className="cc-payment-icon">💳</span>
                          <div className="cc-payment-info">
                            <p className="cc-payment-name">{p.cardName}</p>
                            <p className="cc-payment-meta">From {p.fromName} · {new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                          </div>
                          <span className="cc-payment-amount">{formatCurrency(p.amount, currency)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ── PER-ACCOUNT ── */}
        {view === 'accounts' && (
          <>
            <div className="account-filter-row" style={{ marginBottom: 16 }}>
              {accounts.map((a) => (
                <button key={a.id} className={`af-chip ${selectedAccountId === a.id ? 'active' : ''}`} onClick={() => setSelectedAccountId(selectedAccountId === a.id ? '' : a.id)}>
                  <span className="af-chip-icon">{getAccountIcon(a.type, currency)}</span> {a.name}
                </button>
              ))}
            </div>
            {!selectedAccountId ? (
              <div className="empty-state"><div className="empty-state-icon">🏦</div><p>Select an account above to see its analytics</p></div>
            ) : accountAnalytics && (
              <>
                <div className="quick-stats">
                  <div className="quick-stat-card">
                    <i className="fa-solid fa-arrow-down quick-stat-icon" style={{ color: '#00B894' }} />
                    <div><p className="quick-stat-label">Income</p><p className="quick-stat-value">{formatCurrency(accountAnalytics.income, currency)}</p></div>
                  </div>
                  <div className="quick-stat-card">
                    <i className="fa-solid fa-arrow-up quick-stat-icon" style={{ color: '#FF6B6B' }} />
                    <div><p className="quick-stat-label">Expense</p><p className="quick-stat-value">{formatCurrency(accountAnalytics.expense, currency)}</p></div>
                  </div>
                  <div className="quick-stat-card">
                    <i className="fa-solid fa-receipt quick-stat-icon" style={{ color: '#E17055' }} />
                    <div><p className="quick-stat-label">Transactions</p><p className="quick-stat-value">{accountAnalytics.txnCount}</p></div>
                  </div>
                </div>
                {accountAnalytics.daily.length > 0 && (
                  <div className="chart-card card">
                    <h3 className="chart-title">Income vs Expense</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={accountAnalytics.daily} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                        <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} fontSize={10} tick={{ fill: tickColor }} />
                        <YAxis fontSize={10} tick={{ fill: tickColor }} />
                        <Tooltip content={<CustomTooltipContent />} />
                        <Bar dataKey="income" fill="#00B894" name="Income" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="expense" fill="#FF6B6B" name="Expense" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {accountAnalytics.catBreakdown.length > 0 && (
                  <div className="chart-card card">
                    <h3 className="chart-title">Expense Categories</h3>
                    <div className="pie-container">
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart><Pie data={accountAnalytics.catBreakdown} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3} dataKey="value">
                          {accountAnalytics.catBreakdown.map((entry, index) => (<Cell key={index} fill={entry.color} />))}
                        </Pie><Tooltip formatter={(value) => formatCurrency(value, currency)} /></PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="cat-legend">
                      {accountAnalytics.catBreakdown.map((cat, i) => (
                        <div key={i} className="cat-legend-item">
                          <div className="cat-legend-left"><span className="cat-dot" style={{ background: cat.color }} /><span className="cat-legend-name">{cat.name}</span></div>
                          <span className="cat-legend-value">{formatCurrency(cat.value, currency)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {accountAnalytics.monthly.length > 0 && (
                  <div className="chart-card card">
                    <h3 className="chart-title">Monthly Flow</h3>
                    <ResponsiveContainer width="100%" height={240}>
                      <LineChart data={accountAnalytics.monthly} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                        <XAxis dataKey="month" fontSize={11} tick={{ fill: tickColor }} />
                        <YAxis fontSize={11} tick={{ fill: tickColor }} />
                        <Tooltip content={<CustomTooltipContent />} />
                        <Legend />
                        <Line type="monotone" dataKey="income" stroke="#00B894" strokeWidth={2} dot={{ r: 3 }} name="Income" />
                        <Line type="monotone" dataKey="expense" stroke="#FF6B6B" strokeWidth={2} dot={{ r: 3 }} name="Expense" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
