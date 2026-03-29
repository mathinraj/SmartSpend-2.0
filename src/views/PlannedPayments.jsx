'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/Toast';
import { formatCurrency } from '../utils/currencies';
import { formatDate } from '../utils/helpers';
import Modal from '../components/Modal';
import './PlannedPayments.css';

const FREQUENCY_OPTIONS = [
  { value: 'once', label: 'One-time' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

const EMPTY_FORM = {
  name: '',
  amount: '',
  accountId: '',
  categoryId: '',
  frequency: 'monthly',
  nextDate: '',
  note: '',
  enabled: true,
  autoPay: false,
};

export default function PlannedPayments() {
  const { state, dispatch } = useApp();
  const { plannedPayments, accounts, categories, settings } = state;
  const currency = settings.currency;
  const toast = useToast();

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filter, setFilter] = useState('all');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sortedPayments = useMemo(() => {
    let list = [...plannedPayments];
    if (filter === 'active') list = list.filter((p) => p.enabled);
    if (filter === 'paused') list = list.filter((p) => !p.enabled);
    if (filter === 'upcoming') {
      const weekFromNow = new Date(today);
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      list = list.filter((p) => {
        const d = new Date(p.nextDate);
        return d >= today && d <= weekFromNow;
      });
    }
    if (filter === 'overdue') {
      list = list.filter((p) => new Date(p.nextDate) < today && p.enabled);
    }
    return list.sort((a, b) => new Date(a.nextDate) - new Date(b.nextDate));
  }, [plannedPayments, filter]);

  const totalMonthly = useMemo(() => {
    return plannedPayments
      .filter((p) => p.enabled)
      .reduce((sum, p) => {
        const amt = p.amount || 0;
        switch (p.frequency) {
          case 'weekly': return sum + amt * 4.33;
          case 'biweekly': return sum + amt * 2.17;
          case 'monthly': return sum + amt;
          case 'quarterly': return sum + amt / 3;
          case 'yearly': return sum + amt / 12;
          default: return sum;
        }
      }, 0);
  }, [plannedPayments]);

  const overdueCount = plannedPayments.filter(
    (p) => new Date(p.nextDate) < today && p.enabled
  ).length;

  function openAdd() {
    const todayStr = new Date().toISOString().split('T')[0];
    setForm({ ...EMPTY_FORM, nextDate: todayStr, accountId: accounts[0]?.id || '' });
    setEditId(null);
    setShowModal(true);
  }

  function openEdit(payment) {
    setForm({
      name: payment.name || '',
      amount: payment.amount || '',
      accountId: payment.accountId || '',
      categoryId: payment.categoryId || '',
      frequency: payment.frequency || 'monthly',
      nextDate: payment.nextDate || '',
      note: payment.note || '',
      enabled: payment.enabled !== false,
      autoPay: payment.autoPay || false,
    });
    setEditId(payment.id);
    setShowModal(true);
  }

  function handleSave() {
    if (!form.name.trim()) {
      toast('Please enter a payment name', 'error');
      return;
    }
    if (!/[a-zA-Z]/.test(form.name)) {
      toast('Name must contain at least one letter', 'error');
      return;
    }
    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast('Please enter a valid amount', 'error');
      return;
    }
    if (!form.nextDate) {
      toast('Please select a due date', 'error');
      return;
    }

    const payload = {
      ...form,
      amount: parseFloat(form.amount),
    };

    if (editId) {
      dispatch({ type: 'UPDATE_PLANNED_PAYMENT', payload: { ...payload, id: editId } });
      toast('Payment updated!', 'success');
    } else {
      dispatch({ type: 'ADD_PLANNED_PAYMENT', payload });
      toast('Planned payment added!', 'success');
    }
    setShowModal(false);
  }

  function handleDelete(id) {
    if (window.confirm('Remove this planned payment?')) {
      dispatch({ type: 'DELETE_PLANNED_PAYMENT', payload: id });
      toast('Payment removed', 'info');
    }
  }

  function handleToggle(id) {
    dispatch({ type: 'TOGGLE_PLANNED_PAYMENT', payload: id });
  }

  function handleMarkPaid(payment) {
    if (!window.confirm(`Mark "${payment.name}" as paid? This will log ${formatCurrency(payment.amount, currency)} as an expense.`)) return;

    dispatch({ type: 'MARK_PLANNED_PAID', payload: payment.id });

    if (payment.accountId) {
      dispatch({
        type: 'ADD_TRANSACTION',
        payload: {
          type: 'expense',
          amount: payment.amount,
          accountId: payment.accountId,
          categoryId: payment.categoryId || '',
          subcategoryId: '',
          note: payment.name + (payment.note ? ` — ${payment.note}` : ''),
          date: new Date().toISOString().split('T')[0],
        },
      });
    }

    if (payment.frequency !== 'once') {
      const next = new Date(payment.nextDate);
      switch (payment.frequency) {
        case 'weekly': next.setDate(next.getDate() + 7); break;
        case 'biweekly': next.setDate(next.getDate() + 14); break;
        case 'monthly': next.setMonth(next.getMonth() + 1); break;
        case 'quarterly': next.setMonth(next.getMonth() + 3); break;
        case 'yearly': next.setFullYear(next.getFullYear() + 1); break;
      }
      dispatch({
        type: 'UPDATE_PLANNED_PAYMENT',
        payload: { id: payment.id, nextDate: next.toISOString().split('T')[0] },
      });
    }

    toast('Marked as paid & logged as expense!', 'success');
  }

  function getAccountName(id) {
    const acc = accounts.find((a) => a.id === id);
    return acc ? acc.name : '';
  }

  function getCategoryName(id) {
    const cat = categories.expense.find((c) => c.id === id);
    return cat ? cat.name : '';
  }

  function getCategoryIcon(id) {
    const cat = categories.expense.find((c) => c.id === id);
    return cat ? cat.icon : '📅';
  }

  function isOverdue(dateStr) {
    return new Date(dateStr) < today;
  }

  function getDaysUntil(dateStr) {
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
    if (diff < 0) return `${Math.abs(diff)}d overdue`;
    if (diff === 0) return 'Due today';
    if (diff === 1) return 'Tomorrow';
    return `In ${diff} days`;
  }

  if (!settings.plannedEnabled) {
    return (
      <div className="page">
        <h1 className="page-title">Planned Payments</h1>
        <div className="empty-state">
          <div className="empty-state-icon">📅</div>
          <p>Planned payments is disabled.</p>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-light)', marginTop: 8 }}>Enable it in Preferences → Transactions → Planned payments</p>
          <Link href="/preferences" className="btn btn-primary" style={{ marginTop: 16 }}>
            <i className="fa-solid fa-gear" /> Go to Preferences
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">Planned Payments</h1>

      <div className="planned-summary">
        <div className="planned-summary-card">
          <p className="planned-summary-label">Monthly estimate</p>
          <p className="planned-summary-amount">{formatCurrency(totalMonthly, currency)}</p>
        </div>
        <div className="planned-summary-card">
          <p className="planned-summary-label">Active</p>
          <p className="planned-summary-count">{plannedPayments.filter((p) => p.enabled).length}</p>
        </div>
        {overdueCount > 0 && (
          <div className="planned-summary-card planned-summary-overdue">
            <p className="planned-summary-label">Overdue</p>
            <p className="planned-summary-count">{overdueCount}</p>
          </div>
        )}
      </div>

      <div className="planned-filters">
        {['all', 'active', 'upcoming', 'overdue', 'paused'].map((f) => (
          <button
            key={f}
            className={`planned-filter-chip ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {sortedPayments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📅</div>
          <p>
            {filter === 'all'
              ? 'No planned payments yet. Add your bills, subscriptions, and recurring expenses!'
              : `No ${filter} payments found.`}
          </p>
        </div>
      ) : (
        <div className="planned-list">
          {sortedPayments.map((payment) => (
            <div key={payment.id} className={`planned-item ${!payment.enabled ? 'paused' : ''} ${isOverdue(payment.nextDate) && payment.enabled ? 'overdue' : ''} ${!isOverdue(payment.nextDate) && getDaysUntil(payment.nextDate) === 'Due today' && payment.enabled ? 'due-today' : ''}`}>
              <div className="planned-item-icon">
                {getCategoryIcon(payment.categoryId)}
              </div>
              <div className="planned-item-info">
                <p className="planned-item-name">{payment.name}</p>
                <p className="planned-item-meta">
                  {FREQUENCY_OPTIONS.find((f) => f.value === payment.frequency)?.label || payment.frequency}
                  {payment.accountId && ` · ${getAccountName(payment.accountId)}`}
                  {payment.categoryId && ` · ${getCategoryName(payment.categoryId)}`}
                </p>
                <p className={`planned-item-due ${isOverdue(payment.nextDate) && payment.enabled ? 'overdue-text' : ''} ${!isOverdue(payment.nextDate) && getDaysUntil(payment.nextDate) === 'Due today' && payment.enabled ? 'due-today-text' : ''}`}>
                  {getDaysUntil(payment.nextDate)} · {formatDate(payment.nextDate)}
                </p>
              </div>
              <div className="planned-item-right">
                <p className="planned-item-amount">{formatCurrency(payment.amount, currency)}</p>
                <div className="planned-item-actions">
                  {payment.enabled && (
                    <button className="planned-action-btn pay" onClick={() => handleMarkPaid(payment)} title="Mark as paid">
                      <i className="fa-solid fa-check" />
                    </button>
                  )}
                  <button className="planned-action-btn edit" onClick={() => openEdit(payment)} title="Edit">
                    <i className="fa-solid fa-pen" />
                  </button>
                  <button className="planned-action-btn toggle" onClick={() => handleToggle(payment.id)} title={payment.enabled ? 'Pause' : 'Resume'}>
                    <i className={`fa-solid ${payment.enabled ? 'fa-pause' : 'fa-play'}`} />
                  </button>
                  <button className="planned-action-btn delete" onClick={() => handleDelete(payment.id)} title="Delete">
                    <i className="fa-solid fa-trash-can" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <button className="planned-add-fab" onClick={openAdd}>
        <i className="fa-solid fa-plus" />
      </button>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editId ? 'Edit Payment' : 'Add Planned Payment'}>
        <div className="form-group">
          <label className="form-label">Payment name</label>
          <input
            className="form-input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Netflix, Rent, Insurance"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Amount</label>
          <input
            className="form-input"
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            placeholder="0.00"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Frequency</label>
          <select
            className="form-select"
            value={form.frequency}
            onChange={(e) => setForm({ ...form, frequency: e.target.value })}
          >
            {FREQUENCY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Next due date</label>
          <input
            className="form-input"
            type="date"
            value={form.nextDate}
            onChange={(e) => setForm({ ...form, nextDate: e.target.value })}
          />
        </div>

        {accounts.length > 0 && (
          <div className="form-group">
            <label className="form-label">Account (for auto-logging)</label>
            <select
              className="form-select"
              value={form.accountId}
              onChange={(e) => setForm({ ...form, accountId: e.target.value })}
            >
              <option value="">None</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Category</label>
          <select
            className="form-select"
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
          >
            <option value="">None</option>
            {categories.expense.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Note (optional)</label>
          <input
            className="form-input"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder="Additional details"
          />
        </div>

        <button className="btn btn-primary btn-full" onClick={handleSave} style={{ marginTop: 8 }}>
          {editId ? 'Update Payment' : 'Add Payment'}
        </button>
      </Modal>
    </div>
  );
}
