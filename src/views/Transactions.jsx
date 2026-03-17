'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '../context/AppContext';
import { useIsDesktop } from '../hooks/useMediaQuery';
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

  const isDesktop = useIsDesktop();
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!openMenuId) return;
    function handleTap(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenuId(null);
    }
    document.addEventListener('mousedown', handleTap);
    document.addEventListener('touchstart', handleTap);
    return () => { document.removeEventListener('mousedown', handleTap); document.removeEventListener('touchstart', handleTap); };
  }, [openMenuId]);

  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [searchField, setSearchField] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Advanced filters
  const [filterCategoryIds, setFilterCategoryIds] = useState([]);
  const [filterAccountIds, setFilterAccountIds] = useState([]);
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterAmountMin, setFilterAmountMin] = useState('');
  const [filterAmountMax, setFilterAmountMax] = useState('');

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filterCategoryIds.length) n++;
    if (filterAccountIds.length) n++;
    if (filterDateFrom || filterDateTo) n++;
    if (filterAmountMin || filterAmountMax) n++;
    return n;
  }, [filterCategoryIds, filterAccountIds, filterDateFrom, filterDateTo, filterAmountMin, filterAmountMax]);

  function toggleFilterCategory(id) {
    setFilterCategoryIds((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);
  }

  function toggleFilterAccount(id) {
    setFilterAccountIds((prev) => prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]);
  }

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

    if (filterCategoryIds.length) result = result.filter((t) => filterCategoryIds.includes(t.categoryId));
    if (filterAccountIds.length) {
      result = result.filter((t) =>
        filterAccountIds.includes(t.accountId) || filterAccountIds.includes(t.fromAccountId) || filterAccountIds.includes(t.toAccountId)
      );
    }
    if (filterDateFrom) result = result.filter((t) => t.date >= filterDateFrom);
    if (filterDateTo) result = result.filter((t) => t.date <= filterDateTo);
    if (filterAmountMin) result = result.filter((t) => t.amount >= parseFloat(filterAmountMin));
    if (filterAmountMax) result = result.filter((t) => t.amount <= parseFloat(filterAmountMax));

    return result;
  }, [transactions, typeFilter, search, searchField, filterCategoryIds, filterAccountIds, filterDateFrom, filterDateTo, filterAmountMin, filterAmountMax]);

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
    setFilterCategoryIds([]);
    setFilterAccountIds([]);
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
          {filterCategoryIds.map((cid) => {
            const cat = allCategories.find((c) => c.id === cid);
            return (
              <span key={cid} className="active-filter-chip">
                <i className="fa-solid fa-tag" /> {cat?.name || cid}
                <button onClick={() => toggleFilterCategory(cid)}><i className="fa-solid fa-xmark" /></button>
              </span>
            );
          })}
          {filterAccountIds.map((aid) => (
            <span key={aid} className="active-filter-chip">
              <i className="fa-solid fa-wallet" /> {getAccountName(aid)}
              <button onClick={() => toggleFilterAccount(aid)}><i className="fa-solid fa-xmark" /></button>
            </span>
          ))}
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
                      {isDesktop ? (
                        <div className="txn-action-btns">
                          <button className="txn-action-btn edit" onClick={(e) => { e.stopPropagation(); handleEdit(txn); }} title="Edit">
                            <i className="fa-solid fa-pen" />
                          </button>
                          <button className="txn-action-btn delete" onClick={(e) => { e.stopPropagation(); handleDelete(txn.id); }} title="Delete">
                            <i className="fa-solid fa-trash-can" />
                          </button>
                        </div>
                      ) : (
                        <div className="txn-menu-wrap" ref={openMenuId === txn.id ? menuRef : null}>
                          <button className="txn-menu-trigger" onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === txn.id ? null : txn.id); }}>
                            <i className="fa-solid fa-ellipsis-vertical" />
                          </button>
                          {openMenuId === txn.id && (
                            <div className="txn-menu-popover">
                              <button className="txn-menu-item" onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); handleEdit(txn); }}>
                                <i className="fa-solid fa-pen" /> Edit
                              </button>
                              <button className="txn-menu-item danger" onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); handleDelete(txn.id); }}>
                                <i className="fa-solid fa-trash-can" /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      )}
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
            <label className="form-label"><i className="fa-solid fa-tag" style={{ marginRight: 6 }} />Categories {filterCategoryIds.length > 0 && <span className="filter-count">({filterCategoryIds.length})</span>}</label>
            {categories.expense.length > 0 && (
              <div className="filter-chip-section">
                <p className="filter-chip-section-label">Expense</p>
                <div className="filter-chip-grid">
                  {categories.expense.map((c) => (
                    <button key={c.id} type="button" className={`filter-chip ${filterCategoryIds.includes(c.id) ? 'selected' : ''}`} onClick={() => toggleFilterCategory(c.id)}>
                      <span className="filter-chip-icon">{c.icon}</span>
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {categories.income.length > 0 && (
              <div className="filter-chip-section">
                <p className="filter-chip-section-label">Income</p>
                <div className="filter-chip-grid">
                  {categories.income.map((c) => (
                    <button key={c.id} type="button" className={`filter-chip ${filterCategoryIds.includes(c.id) ? 'selected' : ''}`} onClick={() => toggleFilterCategory(c.id)}>
                      <span className="filter-chip-icon">{c.icon}</span>
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label"><i className="fa-solid fa-wallet" style={{ marginRight: 6 }} />Accounts {filterAccountIds.length > 0 && <span className="filter-count">({filterAccountIds.length})</span>}</label>
            <div className="filter-chip-grid">
              {accounts.map((a) => (
                <button key={a.id} type="button" className={`filter-chip ${filterAccountIds.includes(a.id) ? 'selected' : ''}`} onClick={() => toggleFilterAccount(a.id)}>
                  <span className="filter-chip-icon">{getAccountIcon(a.type, currency)}</span>
                  {a.name}
                </button>
              ))}
            </div>
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
