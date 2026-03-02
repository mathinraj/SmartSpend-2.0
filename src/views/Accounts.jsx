'use client';

import { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/currencies';
import { getAccountIcon, getAccountColor } from '../utils/helpers';
import Modal from '../components/Modal';
import './Accounts.css';

const ACCOUNT_TYPES = [
  { id: 'bank', label: 'Bank Account', icon: '🏦' },
  { id: 'card', label: 'Credit/Debit Card', icon: '💳' },
  { id: 'cash', label: 'Cash', icon: '💵' },
  { id: 'wallet', label: 'Wallet / UPI', icon: '👛' },
];

export default function Accounts() {
  const { state, dispatch } = useApp();
  const { accounts, settings } = state;
  const currency = settings.currency;

  const [showModal, setShowModal] = useState(false);
  const [editAccount, setEditAccount] = useState(null);
  const [form, setForm] = useState({ name: '', type: 'bank', balance: '' });
  const [reorderMode, setReorderMode] = useState(false);
  const dragIndex = useRef(null);

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  function openAdd() {
    setEditAccount(null);
    setForm({ name: '', type: 'bank', balance: '' });
    setShowModal(true);
  }

  function openEdit(acc) {
    setEditAccount(acc);
    setForm({ name: acc.name, type: acc.type, balance: acc.balance.toString() });
    setShowModal(true);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;

    if (editAccount) {
      dispatch({
        type: 'UPDATE_ACCOUNT',
        payload: { id: editAccount.id, name: form.name.trim(), type: form.type },
      });
    } else {
      dispatch({
        type: 'ADD_ACCOUNT',
        payload: {
          name: form.name.trim(),
          type: form.type,
          balance: parseFloat(form.balance) || 0,
        },
      });
    }
    setShowModal(false);
  }

  function handleDelete(id) {
    if (window.confirm('Delete this account? All related data will be kept.')) {
      dispatch({ type: 'DELETE_ACCOUNT', payload: id });
    }
  }

  function moveAccount(fromIdx, toIdx) {
    if (toIdx < 0 || toIdx >= accounts.length) return;
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
        <p className="accounts-total-label">Total Balance</p>
        <h2 className="accounts-total-amount">{formatCurrency(totalBalance, currency)}</h2>
      </div>

      {accounts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏦</div>
          <p>No accounts yet. Add your bank accounts, cards, or wallets.</p>
        </div>
      ) : (
        <div className="accounts-list">
          {accounts.map((acc, idx) => (
            <div
              key={acc.id}
              className={`account-card ${reorderMode ? 'reorder-active' : ''}`}
              onClick={() => !reorderMode && openEdit(acc)}
              draggable={reorderMode}
              onDragStart={() => handleDragStart(idx)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(idx)}
            >
              {reorderMode && (
                <div className="reorder-controls">
                  <button
                    className="reorder-btn"
                    disabled={idx === 0}
                    onClick={(e) => { e.stopPropagation(); moveAccount(idx, idx - 1); }}
                  >
                    <i className="fa-solid fa-chevron-up" />
                  </button>
                  <span className="reorder-handle"><i className="fa-solid fa-grip-vertical" /></span>
                  <button
                    className="reorder-btn"
                    disabled={idx === accounts.length - 1}
                    onClick={(e) => { e.stopPropagation(); moveAccount(idx, idx + 1); }}
                  >
                    <i className="fa-solid fa-chevron-down" />
                  </button>
                </div>
              )}
              <div
                className="account-icon-wrap"
                style={{ background: getAccountColor(acc.type) + '15' }}
              >
                <span className="account-icon">{getAccountIcon(acc.type)}</span>
              </div>
              <div className="account-info">
                <p className="account-name">{acc.name}</p>
                <p className="account-type">
                  {ACCOUNT_TYPES.find((t) => t.id === acc.type)?.label}
                </p>
              </div>
              {!reorderMode && (
                <div className="account-balance-wrap">
                  <p className={`account-balance ${acc.balance >= 0 ? 'amount-positive' : 'amount-negative'}`}>
                    {formatCurrency(acc.balance, currency)}
                  </p>
                  <button
                    className="account-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(acc.id);
                    }}
                  >
                    <i className="fa-solid fa-trash-can" />
                  </button>
                </div>
              )}
            </div>
          ))}
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
              <label className="form-label">Initial Balance</label>
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

          <button type="submit" className="btn btn-primary btn-full">
            {editAccount ? 'Save Changes' : 'Add Account'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
