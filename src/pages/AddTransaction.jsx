import { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/currencies';
import { toDateInputValue, getAccountIcon, getAccountColor } from '../utils/helpers';
import './AddTransaction.css';

export default function AddTransaction() {
  const { state, dispatch } = useApp();
  const { accounts, categories, settings } = state;
  const navigate = useNavigate();
  const location = useLocation();
  const dateRef = useRef(null);

  const editing = location.state?.txn || null;

  const [tab, setTab] = useState(editing?.type || settings.defaultTxnType || 'expense');
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '');
  const [note, setNote] = useState(editing?.note || '');
  const [date, setDate] = useState(editing?.date || toDateInputValue(new Date()));
  const [accountId, setAccountId] = useState(editing?.accountId || accounts[0]?.id || '');
  const [fromAccountId, setFromAccountId] = useState(editing?.fromAccountId || '');
  const [toAccountId, setToAccountId] = useState(editing?.toAccountId || '');
  const [categoryId, setCategoryId] = useState(editing?.categoryId || '');
  const [subcategoryId, setSubcategoryId] = useState(editing?.subcategoryId || '');

  const expenseCategories = categories.expense;
  const incomeCategories = categories.income;
  const selectedCategory = expenseCategories.find((c) => c.id === categoryId);

  function handleSubmit(e) {
    e.preventDefault();
    const amountVal = parseFloat(amount);
    if (!amountVal || amountVal <= 0) return;

    if (editing) {
      const payload = { id: editing.id, type: tab, amount: amountVal, note: note.trim(), date };
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
        dispatch({ type: 'ADD_TRANSACTION', payload: { type: 'expense', amount: amountVal, accountId, categoryId, subcategoryId: subcategoryId || null, note: note.trim(), date } });
      } else if (tab === 'income') {
        if (!accountId || !categoryId) return;
        dispatch({ type: 'ADD_TRANSACTION', payload: { type: 'income', amount: amountVal, accountId, categoryId, note: note.trim(), date } });
      } else {
        if (!fromAccountId || !toAccountId || fromAccountId === toAccountId) return;
        dispatch({ type: 'ADD_TRANSACTION', payload: { type: 'transfer', amount: amountVal, fromAccountId, toAccountId, note: note.trim(), date } });
      }
    }
    navigate(editing ? '/transactions' : '/');
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
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/accounts')}>
            <i className="fa-solid fa-plus" /> Add Account
          </button>
        </div>
      </div>
    );
  }

  function renderAccountCard(acc, isSelected, onClick) {
    return (
      <button key={acc.id} type="button" className={`acct-picker-card ${isSelected ? 'selected' : ''}`} onClick={onClick}>
        <span className="acct-picker-icon" style={{ background: getAccountColor(acc.type) + '18' }}>{getAccountIcon(acc.type)}</span>
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

        <button type="submit" className={`btn btn-full add-submit ${tab === 'income' ? 'btn-income' : tab === 'expense' ? 'btn-expense' : 'btn-primary'}`}>
          <i className={`fa-solid ${editing ? 'fa-save' : tab === 'transfer' ? 'fa-right-left' : 'fa-check'}`} />
          {editing ? 'Save Changes' : tab === 'expense' ? 'Add Expense' : tab === 'income' ? 'Add Income' : 'Transfer Money'}
        </button>
      </form>
    </div>
  );
}
