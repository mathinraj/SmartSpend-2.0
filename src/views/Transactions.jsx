'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/currencies';
import { formatDate, getAccountIcon, toDateInputValue } from '../utils/helpers';
import Modal from '../components/Modal';
import './Transactions.css';

const SEARCH_FIELDS = [
  { id: 'all', label: 'All' },
  { id: 'note', label: 'Note' },
  { id: 'category', label: 'Category' },
  { id: 'amount', label: 'Amount' },
  { id: 'account', label: 'Account' },
];

export default function Transactions() {
  const { state, dispatch } = useApp();
  const { accounts, transactions, categories, settings } = state;
  const currency = settings.currency;
  const router = useRouter();

  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [searchField, setSearchField] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Advanced filters
  const [filterCategoryId, setFilterCategoryId] = useState('');
  const [filterAccountId, setFilterAccountId] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterAmountMin, setFilterAmountMin] = useState('');
  const [filterAmountMax, setFilterAmountMax] = useState('');

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filterCategoryId) n++;
    if (filterAccountId) n++;
    if (filterDateFrom || filterDateTo) n++;
    if (filterAmountMin || filterAmountMax) n++;
    return n;
  }, [filterCategoryId, filterAccountId, filterDateFrom, filterDateTo, filterAmountMin, filterAmountMax]);

  function getCategoryName(txn) {
    if (txn.type === 'transfer') return 'Transfer';
    const catList = txn.type === 'income' ? categories.income : categories.expense;
    const cat = catList.find((c) => c.id === txn.categoryId);
    return cat ? cat.name : 'Unknown';
  }

  function getCategoryIcon(txn) {
    if (txn.type === 'transfer') return '🔄';
    const catList = txn.type === 'income' ? categories.income : categories.expense;
    const cat = catList.find((c) => c.id === txn.categoryId);
    return cat ? cat.icon : '📦';
  }

  function getCategoryColor(txn) {
    if (txn.type === 'transfer') return '#6C5CE7';
    const catList = txn.type === 'income' ? categories.income : categories.expense;
    const cat = catList.find((c) => c.id === txn.categoryId);
    return cat ? cat.color : '#B2BEC3';
  }

  function getSubcategoryName(txn) {
    if (txn.type !== 'expense' || !txn.subcategoryId) return null;
    const cat = categories.expense.find((c) => c.id === txn.categoryId);
    if (!cat) return null;
    const sub = cat.subcategories.find((s) => s.id === txn.subcategoryId);
    return sub ? sub.name : null;
  }

  function getAccountName(id) {
    const acc = accounts.find((a) => a.id === id);
    return acc ? acc.name : 'Deleted';
  }

  function matchesSearch(txn) {
    if (!search.trim()) return true;
    const q = search.toLowerCase();

    const noteMatch = txn.note && txn.note.toLowerCase().includes(q);
    const catMatch = getCategoryName(txn).toLowerCase().includes(q);
    const amountMatch = String(txn.amount).includes(q);
    const accountMatch = txn.type === 'transfer'
      ? (getAccountName(txn.fromAccountId).toLowerCase().includes(q) || getAccountName(txn.toAccountId).toLowerCase().includes(q))
      : (txn.accountId && getAccountName(txn.accountId).toLowerCase().includes(q));

    if (searchField === 'note') return noteMatch;
    if (searchField === 'category') return catMatch;
    if (searchField === 'amount') return amountMatch;
    if (searchField === 'account') return accountMatch;
    return noteMatch || catMatch || amountMatch || accountMatch;
  }

  const filtered = useMemo(() => {
    let result = [...transactions];

    if (typeFilter !== 'all') result = result.filter((t) => t.type === typeFilter);
    if (search.trim()) result = result.filter(matchesSearch);

    if (filterCategoryId) result = result.filter((t) => t.categoryId === filterCategoryId);
    if (filterAccountId) {
      result = result.filter((t) =>
        t.accountId === filterAccountId || t.fromAccountId === filterAccountId || t.toAccountId === filterAccountId
      );
    }
    if (filterDateFrom) result = result.filter((t) => t.date >= filterDateFrom);
    if (filterDateTo) result = result.filter((t) => t.date <= filterDateTo);
    if (filterAmountMin) result = result.filter((t) => t.amount >= parseFloat(filterAmountMin));
    if (filterAmountMax) result = result.filter((t) => t.amount <= parseFloat(filterAmountMax));

    return result;
  }, [transactions, typeFilter, search, searchField, filterCategoryId, filterAccountId, filterDateFrom, filterDateTo, filterAmountMin, filterAmountMax]);

  const grouped = useMemo(() => {
    const groups = {};
    filtered.forEach((t) => {
      if (!groups[t.date]) groups[t.date] = [];
      groups[t.date].push(t);
    });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  function handleDelete(id) {
    if (window.confirm('Delete this transaction?')) {
      dispatch({ type: 'DELETE_TRANSACTION', payload: id });
    }
  }

  function handleEdit(txn) {
    router.push(`/add?edit=${txn.id}`);
  }

  function clearFilters() {
    setFilterCategoryId('');
    setFilterAccountId('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterAmountMin('');
    setFilterAmountMax('');
  }

  const allCategories = [...categories.expense, ...categories.income];

  return (
    <div className="page">
      <h1 className="page-title">Transactions</h1>

      {/* Search bar with filter icon */}
      <div className="txn-search-bar">
        <i className="fa-solid fa-magnifying-glass txn-search-icon" />
        <input
          type="text"
          className="txn-search-input"
          placeholder="Search transactions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button className="txn-search-clear" onClick={() => { setSearch(''); setSearchField('all'); }}>
            <i className="fa-solid fa-xmark" />
          </button>
        )}
        <button className={`txn-filter-btn ${activeFilterCount > 0 ? 'has-filters' : ''}`} onClick={() => setShowFilters(true)}>
          <i className="fa-solid fa-sliders" />
          {activeFilterCount > 0 && <span className="filter-badge">{activeFilterCount}</span>}
        </button>
      </div>

      {/* Search field selector row */}
      {search.trim() && (
        <div className="search-field-row">
          <span className="search-field-label">Search in:</span>
          {SEARCH_FIELDS.map((f) => (
            <button
              key={f.id}
              className={`search-field-chip ${searchField === f.id ? 'active' : ''}`}
              onClick={() => setSearchField(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      <div className="tabs">
        {['all', 'income', 'expense', 'transfer'].map((f) => (
          <button key={f} className={`tab ${typeFilter === f ? 'active' : ''}`} onClick={() => setTypeFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <div className="active-filters-row">
          {filterCategoryId && (
            <span className="active-filter-chip">
              <i className="fa-solid fa-tag" /> {allCategories.find((c) => c.id === filterCategoryId)?.name}
              <button onClick={() => setFilterCategoryId('')}><i className="fa-solid fa-xmark" /></button>
            </span>
          )}
          {filterAccountId && (
            <span className="active-filter-chip">
              <i className="fa-solid fa-wallet" /> {getAccountName(filterAccountId)}
              <button onClick={() => setFilterAccountId('')}><i className="fa-solid fa-xmark" /></button>
            </span>
          )}
          {(filterDateFrom || filterDateTo) && (
            <span className="active-filter-chip">
              <i className="fa-regular fa-calendar" /> {filterDateFrom || '...'} — {filterDateTo || '...'}
              <button onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); }}><i className="fa-solid fa-xmark" /></button>
            </span>
          )}
          {(filterAmountMin || filterAmountMax) && (
            <span className="active-filter-chip">
              <i className="fa-solid fa-coins" /> {filterAmountMin || '0'} – {filterAmountMax || '∞'}
              <button onClick={() => { setFilterAmountMin(''); setFilterAmountMax(''); }}><i className="fa-solid fa-xmark" /></button>
            </span>
          )}
          <button className="clear-all-filters" onClick={clearFilters}>Clear all</button>
        </div>
      )}

      <p className="txn-result-count">{filtered.length} transaction{filtered.length !== 1 ? 's' : ''}</p>

      {grouped.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><i className="fa-solid fa-receipt" /></div>
          <p>No transactions found</p>
        </div>
      ) : (
        grouped.map(([date, txns]) => (
          <div key={date} className="txn-date-group">
            <p className="txn-date-label">{formatDate(date)}</p>
            <div className="txn-list">
              {txns.map((txn) => {
                const subName = getSubcategoryName(txn);
                return (
                  <div key={txn.id} className="txn-item" onClick={() => handleEdit(txn)}>
                    <div className="txn-icon" style={{ background: getCategoryColor(txn) + '20' }}>
                      {getCategoryIcon(txn)}
                    </div>
                    <div className="txn-info">
                      <p className="txn-name">
                        {txn.type === 'transfer'
                          ? `${getAccountName(txn.fromAccountId)} → ${getAccountName(txn.toAccountId)}`
                          : txn.note || getCategoryName(txn)}
                      </p>
                      <p className="txn-meta">
                        {getCategoryName(txn)}
                        {subName && ` · ${subName}`}
                        {txn.type !== 'transfer' && ` · ${getAccountName(txn.accountId)}`}
                        {txn.isSplit && <span className="txn-split-badge">{txn.splitSettled ? '✓ Split' : '⏳ Split'}</span>}
                      </p>
                    </div>
                    <div className="txn-right">
                      <p className={`txn-amount ${txn.type === 'income' ? 'amount-positive' : txn.type === 'expense' ? 'amount-negative' : ''}`}>
                        {txn.type === 'income' ? '+' : txn.type === 'expense' ? '-' : ''}
                        {formatCurrency(txn.amount, currency)}
                      </p>
                      <div className="txn-action-btns">
                        <button className="txn-action-btn edit" onClick={(e) => { e.stopPropagation(); handleEdit(txn); }} title="Edit">
                          <i className="fa-solid fa-pen" />
                        </button>
                        <button className="txn-action-btn delete" onClick={(e) => { e.stopPropagation(); handleDelete(txn.id); }} title="Delete">
                          <i className="fa-solid fa-trash-can" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* Filter Modal */}
      <Modal isOpen={showFilters} onClose={() => setShowFilters(false)} title="Filter Transactions">
        <div className="filter-panel">
          <div className="form-group">
            <label className="form-label"><i className="fa-solid fa-tag" style={{ marginRight: 6 }} />Category</label>
            <select className="form-select" value={filterCategoryId} onChange={(e) => setFilterCategoryId(e.target.value)}>
              <option value="">All Categories</option>
              <optgroup label="Expense">
                {categories.expense.map((c) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </optgroup>
              <optgroup label="Income">
                {categories.income.map((c) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </optgroup>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label"><i className="fa-solid fa-wallet" style={{ marginRight: 6 }} />Account</label>
            <select className="form-select" value={filterAccountId} onChange={(e) => setFilterAccountId(e.target.value)}>
              <option value="">All Accounts</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{getAccountIcon(a.type)} {a.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label"><i className="fa-regular fa-calendar" style={{ marginRight: 6 }} />Date Range</label>
            <div className="filter-date-row">
              <input type="date" className="form-input" placeholder="From" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
              <span className="filter-date-sep">to</span>
              <input type="date" className="form-input" placeholder="To" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label"><i className="fa-solid fa-coins" style={{ marginRight: 6 }} />Amount Range</label>
            <div className="filter-date-row">
              <input type="number" className="form-input" placeholder="Min" value={filterAmountMin} onChange={(e) => setFilterAmountMin(e.target.value)} />
              <span className="filter-date-sep">to</span>
              <input type="number" className="form-input" placeholder="Max" value={filterAmountMax} onChange={(e) => setFilterAmountMax(e.target.value)} />
            </div>
          </div>

          <div className="filter-actions">
            <button type="button" className="btn btn-outline" onClick={clearFilters}>
              <i className="fa-solid fa-rotate-left" /> Reset
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setShowFilters(false)}>
              <i className="fa-solid fa-check" /> Apply
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
