'use client';

import { useState, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/Toast';
import { formatCurrency, getCurrencyEmoji } from '../utils/currencies';
import { getAccountIcon, getAccountColor } from '../utils/helpers';
import Modal from '../components/Modal';
import './Accounts.css';

function getAccountTypes(currencyCode) {
  return [
    { id: 'bank', label: 'Bank Account', icon: '🏦' },
    { id: 'card', label: 'Credit/Debit Card', icon: '💳' },
    { id: 'cash', label: 'Cash', icon: getAccountIcon('cash', currencyCode) },
    { id: 'wallet', label: 'Wallet / UPI', icon: '👛' },
  ];
}

const TYPE_SECTIONS = [
  { type: 'bank', title: 'Bank Accounts', icon: 'fa-solid fa-building-columns' },
  { type: 'card', title: 'Cards', icon: 'fa-solid fa-credit-card' },
  { type: 'wallet', title: 'Wallets & UPI', icon: 'fa-solid fa-mobile-screen-button' },
  { type: 'cash', title: 'Cash', icon: 'fa-solid fa-money-bill-wave' },
];

export default function Accounts() {
  const { state, dispatch } = useApp();
  const { accounts, settings } = state;
  const currency = settings.currency;
  const toast = useToast();
  const ACCOUNT_TYPES = getAccountTypes(currency);

  const [showModal, setShowModal] = useState(false);
  const [showPayBillModal, setShowPayBillModal] = useState(false);
  const [payBillCard, setPayBillCard] = useState(null);
  const [payBillAmount, setPayBillAmount] = useState('');
  const [payBillFrom, setPayBillFrom] = useState('');
  const [editAccount, setEditAccount] = useState(null);
  const [form, setForm] = useState({ name: '', type: 'bank', balance: '', billingDate: '', dueDate: '', creditLimit: '' });
  const [reorderMode, setReorderMode] = useState(false);
  const [didReorder, setDidReorder] = useState(false);
  const dragIndex = useRef(null);

  const [peekBalances, setPeekBalances] = useState(false);
  const hideBalances = settings.hideBalances === true && !peekBalances;
  const maskAmount = (val) => hideBalances ? 'xxxxx' : val;

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const bankAccounts = accounts.filter((a) => a.type === 'bank');

  const groupedAccounts = useMemo(() => {
    const groups = {};
    TYPE_SECTIONS.forEach((s) => { groups[s.type] = []; });
    accounts.forEach((acc) => {
      if (groups[acc.type]) groups[acc.type].push(acc);
      else groups[acc.type] = [acc];
    });
    return groups;
  }, [accounts]);

  const hasCustomOrder = useMemo(() => {
    if (didReorder) return true;
    const typeOrder = TYPE_SECTIONS.map((s) => s.type);
    let lastTypeIdx = -1;
    for (const acc of accounts) {
      const idx = typeOrder.indexOf(acc.type);
      if (idx < lastTypeIdx) return true;
      lastTypeIdx = idx;
    }
    return false;
  }, [accounts, didReorder]);

  function openAdd() {
    setEditAccount(null);
    setForm({ name: '', type: 'bank', balance: '', billingDate: '', dueDate: '', creditLimit: '' });
    setShowModal(true);
  }

  function openEdit(acc) {
    setEditAccount(acc);
    setForm({
      name: acc.name,
      type: acc.type,
      balance: acc.balance.toString(),
      billingDate: acc.billingDate || '',
      dueDate: acc.dueDate || '',
      creditLimit: acc.creditLimit ? acc.creditLimit.toString() : '',
    });
    setShowModal(true);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;

    const payload = { name: form.name.trim(), type: form.type };
    if (form.type === 'card') {
      payload.billingDate = form.billingDate ? parseInt(form.billingDate) : null;
      payload.dueDate = form.dueDate ? parseInt(form.dueDate) : null;
      payload.creditLimit = form.creditLimit ? parseFloat(form.creditLimit) : null;
    }

    if (editAccount) {
      dispatch({ type: 'UPDATE_ACCOUNT', payload: { id: editAccount.id, ...payload } });
    } else {
      dispatch({
        type: 'ADD_ACCOUNT',
        payload: { ...payload, balance: parseFloat(form.balance) || 0 },
      });
    }
    setShowModal(false);
  }

  function handleDelete(id) {
    if (window.confirm('Delete this account? All related data will be kept.')) {
      dispatch({ type: 'DELETE_ACCOUNT', payload: id });
    }
  }

  function openPayBill(acc) {
    setPayBillCard(acc);
    setPayBillAmount(acc.balance < 0 ? Math.abs(acc.balance).toString() : '');
    setPayBillFrom(bankAccounts[0]?.id || '');
    setShowPayBillModal(true);
  }

  function handlePayBill(e) {
    e.preventDefault();
    const amt = parseFloat(payBillAmount);
    if (!amt || amt <= 0 || !payBillFrom || !payBillCard) return;
    dispatch({
      type: 'ADD_TRANSACTION',
      payload: {
        type: 'transfer',
        amount: amt,
        fromAccountId: payBillFrom,
        toAccountId: payBillCard.id,
        note: `Bill payment — ${payBillCard.name}`,
        date: new Date().toISOString().split('T')[0],
      },
    });
    toast('Bill payment recorded!', 'success');
    setShowPayBillModal(false);
  }

  function moveAccount(fromIdx, toIdx) {
    if (toIdx < 0 || toIdx >= accounts.length) return;
    setDidReorder(true);
    dispatch({ type: 'REORDER_ACCOUNTS', payload: { fromIndex: fromIdx, toIndex: toIdx } });
  }

  function handleDragStart(idx) { dragIndex.current = idx; }
  function handleDragOver(e) { e.preventDefault(); }
  function handleDrop(idx) {
    if (dragIndex.current !== null && dragIndex.current !== idx) {
      moveAccount(dragIndex.current, idx);
    }
    dragIndex.current = null;
  }

  function getGlobalIndex(acc) {
    return accounts.findIndex((a) => a.id === acc.id);
  }

  function getBillingInfo(acc) {
    if (acc.type !== 'card') return null;
    const parts = [];
    if (acc.billingDate) parts.push(`Bills on ${acc.billingDate}${getOrdinal(acc.billingDate)}`);
    if (acc.dueDate) parts.push(`Due by ${acc.dueDate}${getOrdinal(acc.dueDate)}`);
    if (acc.creditLimit) parts.push(`Limit: ${formatCurrency(acc.creditLimit, currency)}`);
    return parts.length > 0 ? parts.join(' · ') : null;
  }

  function getOrdinal(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  }

  function renderAccountCard(acc) {
    const idx = getGlobalIndex(acc);
    const billingInfo = getBillingInfo(acc);
    return (
      <div
        key={acc.id}
        className={`account-card account-card-${acc.type} ${reorderMode ? 'reorder-active' : ''}`}
        onClick={() => !reorderMode && openEdit(acc)}
        draggable={reorderMode}
        onDragStart={() => handleDragStart(idx)}
        onDragOver={handleDragOver}
        onDrop={() => handleDrop(idx)}
      >
        {reorderMode && (
          <div className="reorder-controls">
            <button className="reorder-btn" disabled={idx === 0} onClick={(e) => { e.stopPropagation(); moveAccount(idx, idx - 1); }}>
              <i className="fa-solid fa-chevron-up" />
            </button>
            <span className="reorder-handle"><i className="fa-solid fa-grip-vertical" /></span>
            <button className="reorder-btn" disabled={idx === accounts.length - 1} onClick={(e) => { e.stopPropagation(); moveAccount(idx, idx + 1); }}>
              <i className="fa-solid fa-chevron-down" />
            </button>
          </div>
        )}
        <div className="account-icon-wrap" style={{ background: getAccountColor(acc.type) + '15' }}>
          <span className="account-icon">{getAccountIcon(acc.type, currency)}</span>
        </div>
        <div className="account-info">
          <p className="account-name">{acc.name}</p>
          <p className="account-type">{ACCOUNT_TYPES.find((t) => t.id === acc.type)?.label}</p>
          {billingInfo && <p className="account-billing-info">{billingInfo}</p>}
        </div>
        {!reorderMode && (
          <div className="account-balance-wrap">
            <p className={`account-balance ${acc.balance >= 0 ? 'amount-positive' : 'amount-negative'}`}>
              {maskAmount(formatCurrency(acc.balance, currency))}
            </p>
            <div className="account-card-actions">
              {acc.type === 'card' && acc.balance < 0 && (
                <button className="account-pay-btn" onClick={(e) => { e.stopPropagation(); openPayBill(acc); }} title="Pay Bill">
                  <i className="fa-solid fa-money-bill-transfer" />
                </button>
              )}
              <button className="account-delete" onClick={(e) => { e.stopPropagation(); handleDelete(acc.id); }}>
                <i className="fa-solid fa-trash-can" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="page">
      <div className="section-header">
        <h1 className="page-title" style={{ marginBottom: 0 }}>Accounts</h1>
        <div className="section-header-actions">
          {accounts.length > 1 && (
            <button
              className={`btn btn-sm ${reorderMode ? 'btn-outline' : 'btn-ghost'}`}
              onClick={() => setReorderMode(!reorderMode)}
            >
              <i className="fa-solid fa-arrows-up-down" /> {reorderMode ? 'Done' : 'Reorder'}
            </button>
          )}
          {!reorderMode && (
            <button className="btn btn-primary btn-sm" onClick={openAdd}><i className="fa-solid fa-plus" /> Add</button>
          )}
        </div>
      </div>

      <div className="accounts-total card">
        <div className="accounts-total-top">
          <p className="accounts-total-label">Total Balance</p>
          {settings.hideBalances && (
            <button className="balance-peek-btn" onClick={() => setPeekBalances((p) => !p)}>
              <i className={`fa-solid ${peekBalances ? 'fa-eye-slash' : 'fa-eye'}`} />
            </button>
          )}
        </div>
        <h2 className="accounts-total-amount">{maskAmount(formatCurrency(totalBalance, currency))}</h2>
      </div>

      {accounts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏦</div>
          <p>No accounts yet. Add your bank accounts, cards, or wallets.</p>
        </div>
      ) : reorderMode || hasCustomOrder ? (
        <div className="accounts-list">
          {accounts.map((acc, i) => {
            const prevType = i > 0 ? accounts[i - 1].type : null;
            const showDivider = acc.type !== prevType;
            const section = TYPE_SECTIONS.find((s) => s.type === acc.type);
            const sectionBalance = showDivider
              ? accounts.filter((a) => a.type === acc.type).reduce((s, a) => s + a.balance, 0)
              : 0;
            return (
              <div key={acc.id}>
                {showDivider && section && (
                  <div className={`account-section-header ${i > 0 ? 'account-section-header-gap' : ''}`}>
                    <div className="account-section-title-row">
                      <i className={`${section.icon} account-section-icon`} />
                      <h3 className="account-section-title">{section.title}</h3>
                    </div>
                    {!reorderMode && (
                      <span className={`account-section-total ${sectionBalance >= 0 ? 'amount-positive' : 'amount-negative'}`}>
                        {maskAmount(formatCurrency(sectionBalance, currency))}
                      </span>
                    )}
                  </div>
                )}
                {renderAccountCard(acc)}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="accounts-grouped">
          {TYPE_SECTIONS.map((section) => {
            const sectionAccounts = groupedAccounts[section.type] || [];
            if (sectionAccounts.length === 0) return null;
            const sectionBalance = sectionAccounts.reduce((s, a) => s + a.balance, 0);
            return (
              <div key={section.type} className="account-section">
                <div className="account-section-header">
                  <div className="account-section-title-row">
                    <i className={`${section.icon} account-section-icon`} />
                    <h3 className="account-section-title">{section.title}</h3>
                  </div>
                  <span className={`account-section-total ${sectionBalance >= 0 ? 'amount-positive' : 'amount-negative'}`}>
                    {maskAmount(formatCurrency(sectionBalance, currency))}
                  </span>
                </div>
                <div className="accounts-list">
                  {sectionAccounts.map((acc) => renderAccountCard(acc))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editAccount ? 'Edit Account' : 'Add Account'}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Account Type</label>
            <div className="account-type-grid">
              {ACCOUNT_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`account-type-option ${form.type === t.id ? 'selected' : ''}`}
                  onClick={() => setForm({ ...form, type: t.id })}
                >
                  <span>{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Account Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. HDFC Savings"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          {!editAccount && (
            <div className="form-group">
              <label className="form-label">Initial Balance {form.type === 'card' ? '(use negative for outstanding)' : ''}</label>
              <input
                type="number"
                className="form-input"
                placeholder="0.00"
                step="0.01"
                value={form.balance}
                onChange={(e) => setForm({ ...form, balance: e.target.value })}
              />
            </div>
          )}

          {form.type === 'card' && (
            <>
              <div className="form-group">
                <label className="form-label">Billing Date (day of month)</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="e.g. 15"
                  min="1"
                  max="31"
                  value={form.billingDate}
                  onChange={(e) => setForm({ ...form, billingDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Payment Due Date (day of month)</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="e.g. 5"
                  min="1"
                  max="31"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Credit Limit</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="e.g. 100000"
                  min="0"
                  step="0.01"
                  value={form.creditLimit}
                  onChange={(e) => setForm({ ...form, creditLimit: e.target.value })}
                />
              </div>
            </>
          )}

          <button type="submit" className="btn btn-primary btn-full">
            {editAccount ? 'Save Changes' : 'Add Account'}
          </button>
        </form>
      </Modal>

      <Modal isOpen={showPayBillModal} onClose={() => setShowPayBillModal(false)} title={`Pay Bill — ${payBillCard?.name || ''}`}>
        <form onSubmit={handlePayBill}>
          {payBillCard && (
            <div className="pay-bill-outstanding">
              <p className="pay-bill-outstanding-label">Outstanding Balance</p>
              <p className="pay-bill-outstanding-amount amount-negative">
                {formatCurrency(Math.abs(payBillCard.balance), currency)}
              </p>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Payment Amount</label>
            <input
              type="number"
              className="form-input"
              placeholder="0.00"
              min="0.01"
              step="0.01"
              value={payBillAmount}
              onChange={(e) => setPayBillAmount(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Pay From</label>
            <select
              className="form-select"
              value={payBillFrom}
              onChange={(e) => setPayBillFrom(e.target.value)}
              required
            >
              <option value="">Select account</option>
              {bankAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance, currency)})</option>
              ))}
              {accounts.filter((a) => a.type === 'wallet').map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance, currency)})</option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: 8 }}>
            <i className="fa-solid fa-money-bill-transfer" /> Pay Bill
          </button>
        </form>
      </Modal>
    </div>
  );
}
