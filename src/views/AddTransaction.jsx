'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/currencies';
import { toDateInputValue, getAccountIcon, getAccountColor } from '../utils/helpers';
import './AddTransaction.css';

export default function AddTransaction() {
  const { state, dispatch } = useApp();
  const { accounts, categories, settings } = state;
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateRef = useRef(null);

  const [editing, setEditing] = useState(null);

  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId) {
      const txn = state.transactions.find((t) => t.id === editId);
      if (txn) setEditing(txn);
    }
  }, [searchParams, state.transactions]);

  const [tab, setTab] = useState(settings.defaultTxnType || 'expense');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(toDateInputValue(new Date()));
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [paymentApp, setPaymentApp] = useState('');
  const [editingApps, setEditingApps] = useState(false);
  const [newAppName, setNewAppName] = useState('');
  const [isSplit, setIsSplit] = useState(false);
  const [splitAmount, setSplitAmount] = useState('');
  const [splitMode, setSplitMode] = useState('equal');
  const [selectedPeople, setSelectedPeople] = useState([]);
  const [customSplits, setCustomSplits] = useState({});

  const paymentApps = settings.paymentApps || ['GPay', 'PhonePe', 'Paytm', 'CRED', 'Amazon Pay', 'Cash', 'Card Swipe', 'Net Banking'];

  useEffect(() => {
    if (editing) {
      setTab(editing.type);
      setAmount(String(editing.amount));
      setNote(editing.note || '');
      setDate(editing.date);
      setAccountId(editing.accountId || accounts[0]?.id || '');
      setFromAccountId(editing.fromAccountId || '');
      setToAccountId(editing.toAccountId || '');
      setCategoryId(editing.categoryId || '');
      setSubcategoryId(editing.subcategoryId || '');
      setPaymentApp(editing.paymentApp || '');
      setIsSplit(editing.isSplit || false);
      setSplitAmount(editing.splitAmount ? String(editing.splitAmount) : '');
      setSplitMode('custom');
      if (editing.splitDetails) {
        setSelectedPeople(editing.splitDetails.map((d) => d.person));
        const cs = {};
        editing.splitDetails.forEach((d) => { cs[d.person] = String(d.amount); });
        setCustomSplits(cs);
      }
    }
  }, [editing]);

  const expenseCategories = categories.expense;
  const incomeCategories = categories.income;
  const selectedCategory = expenseCategories.find((c) => c.id === categoryId);

  function addPaymentApp() {
    if (!newAppName.trim()) return;
    const updated = [...paymentApps, newAppName.trim()];
    dispatch({ type: 'UPDATE_SETTINGS', payload: { paymentApps: updated } });
    setNewAppName('');
  }

  function removePaymentApp(app) {
    const updated = paymentApps.filter((a) => a !== app);
    dispatch({ type: 'UPDATE_SETTINGS', payload: { paymentApps: updated } });
    if (paymentApp === app) setPaymentApp('');
  }

  function handleSubmit(e) {
    e.preventDefault();
    const amountVal = parseFloat(amount);
    if (!amountVal || amountVal <= 0) return;

    const appField = settings.trackPaymentApp !== false ? (paymentApp.trim() || null) : null;
    const splitPeople = settings.splitPeople || [];
    let computedSplitAmount = 0;
    let splitDetails = [];
    if (tab === 'expense' && isSplit && settings.splitEnabled && selectedPeople.length > 0) {
      if (splitMode === 'equal') {
        const perPerson = amountVal / (selectedPeople.length + 1);
        splitDetails = selectedPeople.map((p) => ({ person: p, amount: Math.round(perPerson * 100) / 100 }));
      } else {
        splitDetails = selectedPeople.map((p) => ({ person: p, amount: parseFloat(customSplits[p]) || 0 }));
      }
      computedSplitAmount = splitDetails.reduce((s, d) => s + d.amount, 0);
    } else if (tab === 'expense' && isSplit && !settings.splitEnabled) {
      computedSplitAmount = parseFloat(splitAmount) || 0;
    }
    const splitFields = (tab === 'expense' && isSplit && computedSplitAmount > 0)
      ? { isSplit: true, splitAmount: computedSplitAmount, ...(splitDetails.length > 0 ? { splitDetails } : {}) }
      : { isSplit: false, splitAmount: 0 };

    if (editing) {
      const payload = { id: editing.id, type: tab, amount: amountVal, note: note.trim(), date, paymentApp: appField, ...splitFields };
      if (tab === 'transfer') {
        if (!fromAccountId || !toAccountId || fromAccountId === toAccountId) return;
        payload.fromAccountId = fromAccountId;
        payload.toAccountId = toAccountId;
      } else {
        if (!accountId || !categoryId) return;
        payload.accountId = accountId;
        payload.categoryId = categoryId;
        if (tab === 'expense') payload.subcategoryId = subcategoryId || null;
      }
      dispatch({ type: 'UPDATE_TRANSACTION', payload });
    } else {
      if (tab === 'expense') {
        if (!accountId || !categoryId) return;
        dispatch({ type: 'ADD_TRANSACTION', payload: { type: 'expense', amount: amountVal, accountId, categoryId, subcategoryId: subcategoryId || null, note: note.trim(), date, paymentApp: appField, ...splitFields } });
      } else if (tab === 'income') {
        if (!accountId || !categoryId) return;
        dispatch({ type: 'ADD_TRANSACTION', payload: { type: 'income', amount: amountVal, accountId, categoryId, note: note.trim(), date, paymentApp: appField } });
      } else {
        if (!fromAccountId || !toAccountId || fromAccountId === toAccountId) return;
        dispatch({ type: 'ADD_TRANSACTION', payload: { type: 'transfer', amount: amountVal, fromAccountId, toAccountId, note: note.trim(), date, paymentApp: appField } });
      }
    }
    if (splitFields.isSplit && splitDetails.length > 0 && !editing) {
      dispatch({
        type: 'ADD_SPLIT_ENTRIES',
        payload: splitDetails.map((d) => ({
          type: 'split_paid',
          person: d.person,
          amount: d.amount,
          note: note.trim() || 'Shared expense',
          date,
        })),
      });
    }
    router.push(editing ? '/transactions' : '/');
  }

  const dateObj = new Date(date + 'T00:00:00');
  const dateDisplay = dateObj.toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });

  if (accounts.length === 0) {
    return (
      <div className="page">
        <h1 className="page-title">Add Transaction</h1>
        <div className="empty-state">
          <div className="empty-state-icon"><i className="fa-solid fa-building-columns" /></div>
          <p>Please add an account first before creating transactions.</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => router.push('/accounts')}>
            <i className="fa-solid fa-plus" /> Add Account
          </button>
        </div>
      </div>
    );
  }

  function renderAccountCard(acc, isSelected, onClick) {
    return (
      <button key={acc.id} type="button" className={`acct-picker-card ${isSelected ? 'selected' : ''}`} onClick={onClick}>
        <span className="acct-picker-icon" style={{ background: getAccountColor(acc.type) + '18' }}>{getAccountIcon(acc.type, settings.currency)}</span>
        <span className="acct-picker-name">{acc.name}</span>
        <span className="acct-picker-bal">{formatCurrency(acc.balance, settings.currency)}</span>
        {isSelected && <span className="acct-picker-check"><i className="fa-solid fa-circle-check" /></span>}
      </button>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">{editing ? 'Edit Transaction' : 'Add Transaction'}</h1>

      {!editing && (
        <div className="tabs">
          <button className={`tab ${tab === 'expense' ? 'active' : ''}`} onClick={() => { setTab('expense'); setCategoryId(''); setSubcategoryId(''); }}>
            <i className="fa-solid fa-arrow-trend-down" style={{ marginRight: 6 }} />Expense
          </button>
          <button className={`tab ${tab === 'income' ? 'active' : ''}`} onClick={() => { setTab('income'); setCategoryId(''); setSubcategoryId(''); }}>
            <i className="fa-solid fa-arrow-trend-up" style={{ marginRight: 6 }} />Income
          </button>
          <button className={`tab ${tab === 'transfer' ? 'active' : ''}`} onClick={() => setTab('transfer')}>
            <i className="fa-solid fa-right-left" style={{ marginRight: 6 }} />Transfer
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="add-form">
        <div className={`amount-input-wrap ${tab === 'income' ? 'amount-wrap-income' : tab === 'expense' ? 'amount-wrap-expense' : 'amount-wrap-transfer'}`}>
          <span className="amount-currency">{settings.currency}</span>
          <input type="number" className="amount-input" placeholder="0.00" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required autoFocus />
        </div>

        <div className="form-group">
          <label className="form-label"><i className="fa-regular fa-calendar" style={{ marginRight: 6 }} />Date</label>
          <div className="date-picker-card" onClick={() => dateRef.current?.showPicker?.() || dateRef.current?.click()}>
            <div className="date-picker-display">
              <i className="fa-solid fa-calendar-day date-picker-icon" />
              <span className="date-picker-text">{dateDisplay}</span>
              <i className="fa-solid fa-chevron-down date-picker-arrow" />
            </div>
            <input ref={dateRef} type="date" className="date-picker-native" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
        </div>

        {tab !== 'transfer' ? (
          <div className="form-group">
            <label className="form-label"><i className="fa-solid fa-wallet" style={{ marginRight: 6 }} />Account</label>
            <div className="acct-picker-grid">
              {accounts.map((a) => renderAccountCard(a, accountId === a.id, () => setAccountId(a.id)))}
            </div>
          </div>
        ) : (
          <div className="transfer-accounts">
            <div className="form-group">
              <label className="form-label"><i className="fa-solid fa-arrow-right-from-bracket" style={{ marginRight: 6 }} />From</label>
              <div className="acct-picker-grid">
                {accounts.map((a) => renderAccountCard(a, fromAccountId === a.id, () => setFromAccountId(a.id)))}
              </div>
            </div>
            <div className="transfer-arrow-divider"><i className="fa-solid fa-arrow-down" /></div>
            <div className="form-group">
              <label className="form-label"><i className="fa-solid fa-arrow-right-to-bracket" style={{ marginRight: 6 }} />To</label>
              <div className="acct-picker-grid">
                {accounts.filter((a) => a.id !== fromAccountId).map((a) => renderAccountCard(a, toAccountId === a.id, () => setToAccountId(a.id)))}
              </div>
            </div>
          </div>
        )}

        {tab === 'expense' && (
          <>
            <div className="form-group">
              <label className="form-label"><i className="fa-solid fa-tag" style={{ marginRight: 6 }} />Category</label>
              <div className="category-grid">
                {expenseCategories.map((cat) => (
                  <button key={cat.id} type="button" className={`category-item ${categoryId === cat.id ? 'selected' : ''}`} onClick={() => { setCategoryId(cat.id); setSubcategoryId(''); }}>
                    <span className="category-icon">{cat.icon}</span>
                    <span className="category-name">{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>
            {selectedCategory && selectedCategory.subcategories.length > 0 && (
              <div className="form-group">
                <label className="form-label"><i className="fa-solid fa-tags" style={{ marginRight: 6 }} />Subcategory</label>
                <div className="subcategory-list">
                  {selectedCategory.subcategories.map((sub) => (
                    <button key={sub.id} type="button" className={`subcategory-chip ${subcategoryId === sub.id ? 'selected' : ''}`} onClick={() => setSubcategoryId(sub.id)}>{sub.name}</button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'income' && (
          <div className="form-group">
            <label className="form-label"><i className="fa-solid fa-tag" style={{ marginRight: 6 }} />Category</label>
            <div className="category-grid">
              {incomeCategories.map((cat) => (
                <button key={cat.id} type="button" className={`category-item ${categoryId === cat.id ? 'selected' : ''}`} onClick={() => setCategoryId(cat.id)}>
                  <span className="category-icon">{cat.icon}</span>
                  <span className="category-name">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="form-group">
          <label className="form-label"><i className="fa-regular fa-note-sticky" style={{ marginRight: 6 }} />Note (optional)</label>
          <input type="text" className="form-input" placeholder="What was this for?" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        {tab === 'expense' && settings.splitEnabled && (() => {
          const people = settings.splitPeople || [];
          const amountNum = parseFloat(amount) || 0;
          const equalPerPerson = selectedPeople.length > 0 ? amountNum / (selectedPeople.length + 1) : 0;
          const totalOthersOwe = splitMode === 'equal'
            ? Math.round(equalPerPerson * selectedPeople.length * 100) / 100
            : selectedPeople.reduce((s, p) => s + (parseFloat(customSplits[p]) || 0), 0);
          const yourShare = Math.max(0, amountNum - totalOthersOwe);
          return (
            <div className="split-section">
              <label className="split-toggle-row" onClick={() => { setIsSplit(!isSplit); if (isSplit) { setSplitAmount(''); setSelectedPeople([]); setCustomSplits({}); } }}>
                <div className="split-toggle-info">
                  <i className="fa-solid fa-people-arrows" style={{ marginRight: 8, color: 'var(--primary)' }} />
                  <span className="split-toggle-text">This is a shared expense</span>
                </div>
                <span className={`split-checkbox ${isSplit ? 'checked' : ''}`}>
                  {isSplit && <i className="fa-solid fa-check" />}
                </span>
              </label>
              {isSplit && (
                <div className="split-details">
                  {people.length === 0 ? (
                    <p className="split-no-people">No contacts yet. Add people in the <strong>Split Tracker</strong> page first.</p>
                  ) : (
                    <>
                      <label className="split-input-label">Split with</label>
                      <div className="split-people-picker">
                        {people.map((p) => (
                          <button
                            key={p}
                            type="button"
                            className={`split-person-chip ${selectedPeople.includes(p) ? 'selected' : ''}`}
                            onClick={() => {
                              if (selectedPeople.includes(p)) {
                                setSelectedPeople(selectedPeople.filter((x) => x !== p));
                                const cs = { ...customSplits }; delete cs[p]; setCustomSplits(cs);
                              } else {
                                setSelectedPeople([...selectedPeople, p]);
                              }
                            }}
                          >
                            <span className="split-person-avatar">{p.charAt(0).toUpperCase()}</span>
                            {p}
                            {selectedPeople.includes(p) && <i className="fa-solid fa-check" />}
                          </button>
                        ))}
                      </div>

                      {selectedPeople.length > 0 && (
                        <>
                          <div className="split-mode-row">
                            <button type="button" className={`split-mode-btn ${splitMode === 'equal' ? 'active' : ''}`} onClick={() => setSplitMode('equal')}>Equal split</button>
                            <button type="button" className={`split-mode-btn ${splitMode === 'custom' ? 'active' : ''}`} onClick={() => setSplitMode('custom')}>Custom</button>
                          </div>

                          {splitMode === 'custom' && (
                            <div className="split-custom-inputs">
                              {selectedPeople.map((p) => (
                                <div key={p} className="split-custom-row">
                                  <span className="split-custom-name">{p}</span>
                                  <div className="split-custom-input-wrap">
                                    <span className="split-input-currency">{settings.currency}</span>
                                    <input
                                      type="number"
                                      className="split-custom-input"
                                      placeholder="0"
                                      step="0.01"
                                      min="0"
                                      value={customSplits[p] || ''}
                                      onChange={(e) => setCustomSplits({ ...customSplits, [p]: e.target.value })}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {amountNum > 0 && (
                            <div className="split-summary">
                              <div className="split-summary-row">
                                <span>Total paid</span>
                                <span className="split-summary-val">{formatCurrency(amountNum, settings.currency)}</span>
                              </div>
                              {splitMode === 'equal' && (
                                <div className="split-summary-row">
                                  <span>Per person ({selectedPeople.length + 1})</span>
                                  <span className="split-summary-val">{formatCurrency(Math.round(equalPerPerson * 100) / 100, settings.currency)}</span>
                                </div>
                              )}
                              <div className="split-summary-row">
                                <span>Others owe you</span>
                                <span className="split-summary-val split-owe">{formatCurrency(totalOthersOwe, settings.currency)}</span>
                              </div>
                              <div className="split-summary-row split-summary-main">
                                <span>Your actual expense</span>
                                <span className="split-summary-val">{formatCurrency(yourShare, settings.currency)}</span>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {settings.trackPaymentApp !== false && (
          <div className="form-group">
            <div className="payment-app-header">
              <label className="form-label"><i className="fa-solid fa-mobile-screen-button" style={{ marginRight: 6 }} />Payment App (optional)</label>
              <button
                type="button"
                className="payment-app-edit-btn"
                onClick={() => setEditingApps(!editingApps)}
              >
                <i className={`fa-solid ${editingApps ? 'fa-check' : 'fa-pen'}`} />
              </button>
            </div>
            <div className="payment-app-picker">
              {paymentApps.map((app) => (
                <button
                  key={app}
                  type="button"
                  className={`payment-app-chip ${paymentApp === app ? 'selected' : ''} ${editingApps ? 'editing' : ''}`}
                  onClick={() => !editingApps && setPaymentApp(paymentApp === app ? '' : app)}
                >
                  {app}
                  {editingApps && (
                    <span className="payment-app-remove" onClick={(e) => { e.stopPropagation(); removePaymentApp(app); }}>
                      <i className="fa-solid fa-xmark" />
                    </span>
                  )}
                </button>
              ))}
              {editingApps && (
                <div className="payment-app-add-inline">
                  <input
                    type="text"
                    className="payment-app-add-input"
                    placeholder="New app..."
                    value={newAppName}
                    onChange={(e) => setNewAppName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addPaymentApp();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="payment-app-add-btn"
                    onClick={addPaymentApp}
                    disabled={!newAppName.trim()}
                  >
                    <i className="fa-solid fa-plus" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <button type="submit" className={`btn btn-full add-submit ${tab === 'income' ? 'btn-income' : tab === 'expense' ? 'btn-expense' : 'btn-primary'}`}>
          <i className={`fa-solid ${editing ? 'fa-save' : tab === 'transfer' ? 'fa-right-left' : 'fa-check'}`} />
          {editing ? 'Save Changes' : tab === 'expense' ? 'Add Expense' : tab === 'income' ? 'Add Income' : 'Transfer Money'}
        </button>
      </form>
    </div>
  );
}
