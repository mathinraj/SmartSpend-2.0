'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/Toast';
import { formatCurrency, getCurrencyEmoji } from '../utils/currencies';
import { formatDate, getAccountIcon, toDateInputValue } from '../utils/helpers';
import Modal from '../components/Modal';
import './SplitTracker.css';

export default function SplitTracker() {
  const { state, dispatch } = useApp();
  const toast = useToast();
  const { splitLedger, accounts, settings } = state;
  const currency = settings.currency;
  const people = settings.splitPeople || [];

  const [view, setView] = useState('overview');
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [showManagePeople, setShowManagePeople] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [showOweModal, setShowOweModal] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [showEditEntry, setShowEditEntry] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [editEntryForm, setEditEntryForm] = useState({ amount: '', note: '', date: '' });

  const [oweForm, setOweForm] = useState({ person: '', amount: '', totalAmount: '', note: '', date: toDateInputValue(new Date()), accountId: accounts[0]?.id || '', recordTransaction: false });
  const [settleForm, setSettleForm] = useState({ amount: '', direction: 'received', note: '', accountId: accounts[0]?.id || '', recordTransaction: true });

  const balances = useMemo(() => {
    const map = {};
    people.forEach((p) => { map[p] = 0; });
    splitLedger.forEach((e) => {
      if (!map.hasOwnProperty(e.person)) map[e.person] = 0;
      if (e.type === 'split_paid') map[e.person] += e.amount;
      else if (e.type === 'split_owed') map[e.person] -= e.amount;
      else if (e.type === 'settlement') {
        if (e.direction === 'received') map[e.person] -= e.amount;
        else map[e.person] += e.amount;
      }
    });
    return map;
  }, [splitLedger, people]);

  const totalOwedToYou = useMemo(() =>
    Object.values(balances).filter((v) => v > 0).reduce((s, v) => s + v, 0), [balances]);
  const totalYouOwe = useMemo(() =>
    Object.values(balances).filter((v) => v < 0).reduce((s, v) => s + Math.abs(v), 0), [balances]);

  const personEntries = useMemo(() => {
    if (!selectedPerson) return [];
    return splitLedger
      .filter((e) => e.person === selectedPerson)
      .sort((a, b) => (b.date || b.createdAt || '').localeCompare(a.date || a.createdAt || ''));
  }, [splitLedger, selectedPerson]);

  function addPerson() {
    const name = newPersonName.trim();
    if (!name) return;
    if (people.includes(name)) { toast('This person is already added', 'error'); return; }
    if (!/[a-zA-Z]/.test(name)) { toast('Name must contain at least one letter', 'error'); return; }
    dispatch({ type: 'UPDATE_SETTINGS', payload: { splitPeople: [...people, name] } });
    setNewPersonName('');
  }

  function removePerson(name) {
    if (!window.confirm(`Remove ${name}? Their split history will remain.`)) return;
    dispatch({ type: 'UPDATE_SETTINGS', payload: { splitPeople: people.filter((p) => p !== name) } });
  }

  function handleAddOwe() {
    const amt = parseFloat(oweForm.amount);
    if (!oweForm.person || !amt || amt <= 0) return;
    dispatch({
      type: 'ADD_SPLIT_OWE',
      payload: {
        person: oweForm.person,
        amount: amt,
        note: oweForm.note.trim() || `${oweForm.person} paid`,
        date: oweForm.date,
        accountId: oweForm.recordTransaction ? oweForm.accountId : null,
      },
    });
    setShowOweModal(false);
    setOweForm({ person: '', amount: '', totalAmount: '', note: '', date: toDateInputValue(new Date()), accountId: accounts[0]?.id || '', recordTransaction: false });
  }

  function handleSettle() {
    const amt = parseFloat(settleForm.amount);
    if (!selectedPerson || !amt || amt <= 0) return;
    dispatch({
      type: 'RECORD_SETTLEMENT',
      payload: {
        person: selectedPerson,
        amount: amt,
        direction: settleForm.direction,
        note: settleForm.note.trim(),
        accountId: settleForm.recordTransaction ? settleForm.accountId : null,
      },
    });
    setShowSettleModal(false);
    setSettleForm({ amount: '', direction: 'received', note: '', accountId: accounts[0]?.id || '', recordTransaction: true });
  }

  function openEditEntry(entry) {
    setEditEntry(entry);
    setEditEntryForm({ amount: String(entry.amount), note: entry.note || '', date: entry.date || toDateInputValue(new Date()) });
    setShowEditEntry(true);
  }

  function handleUpdateEntry() {
    const amt = parseFloat(editEntryForm.amount);
    if (!editEntry || !amt || amt <= 0) return;
    dispatch({
      type: 'UPDATE_SPLIT_ENTRY',
      payload: { id: editEntry.id, amount: amt, note: editEntryForm.note.trim(), date: editEntryForm.date },
    });
    setShowEditEntry(false);
    setEditEntry(null);
  }

  function handleDeleteEntry(id) {
    if (!window.confirm('Delete this entry?')) return;
    dispatch({ type: 'DELETE_SPLIT_ENTRY', payload: id });
  }

  function getEntryDisplay(entry) {
    const moneyIcon = getCurrencyEmoji(currency);
    if (entry.type === 'split_paid') return { sign: '+', color: 'var(--success)', label: 'You paid (their share)', icon: '📤' };
    if (entry.type === 'split_owed') return { sign: '-', color: 'var(--danger)', label: 'They paid (your share)', icon: '📥' };
    if (entry.type === 'settlement') {
      if (entry.direction === 'received') return { sign: '-', color: '#74B9FF', label: 'Received from them', icon: moneyIcon };
      return { sign: '+', color: '#74B9FF', label: 'Paid to them', icon: moneyIcon };
    }
    return { sign: '', color: 'var(--text)', label: '', icon: '📝' };
  }

  if (!settings.splitEnabled) {
    return (
      <div className="page">
        <h1 className="page-title">Split Tracker</h1>
        <div className="empty-state">
          <div className="empty-state-icon">🤝</div>
          <p>Split expense tracking is disabled.</p>
          <p className="split-empty-hint">Enable it in Preferences → Transactions → Split expense tracking</p>
          <Link href="/preferences" className="btn btn-primary" style={{ marginTop: 16 }}>
            <i className="fa-solid fa-gear" /> Go to Preferences
          </Link>
        </div>
      </div>
    );
  }

  if (view === 'person' && selectedPerson) {
    const bal = balances[selectedPerson] || 0;
    return (
      <div className="page">
        <div className="split-person-header">
          <button className="split-back-btn" onClick={() => { setView('overview'); setSelectedPerson(null); }}>
            <i className="fa-solid fa-arrow-left" />
          </button>
          <div>
            <h1 className="page-title" style={{ marginBottom: 0 }}>{selectedPerson}</h1>
            <p className={`split-person-bal ${bal > 0 ? 'positive' : bal < 0 ? 'negative' : ''}`}>
              {bal > 0 ? `Owes you ${formatCurrency(bal, currency)}` : bal < 0 ? `You owe ${formatCurrency(Math.abs(bal), currency)}` : 'Settled up'}
            </p>
          </div>
        </div>

        {bal !== 0 && (
          <button className="btn btn-primary btn-full split-settle-main-btn" onClick={() => {
            const absBal = Math.abs(bal);
            setSettleForm({
              amount: String(absBal),
              direction: bal > 0 ? 'received' : 'paid',
              note: '',
              accountId: accounts[0]?.id || '',
              recordTransaction: true,
            });
            setShowSettleModal(true);
          }}>
            <i className="fa-solid fa-handshake" /> Record Settlement
          </button>
        )}

        <h3 className="section-title" style={{ marginTop: 20, marginBottom: 12 }}>History</h3>
        {personEntries.length === 0 ? (
          <div className="empty-state">
            <p>No split history with {selectedPerson} yet.</p>
          </div>
        ) : (
          <div className="split-ledger-list">
            {personEntries.map((entry) => {
              const display = getEntryDisplay(entry);
              return (
                <div key={entry.id} className="split-ledger-item">
                  <span className="split-ledger-icon">{display.icon}</span>
                  <div className="split-ledger-info">
                    <p className="split-ledger-note">{entry.note || display.label}</p>
                    <p className="split-ledger-meta">{display.label} · {formatDate(entry.date)}</p>
                  </div>
                  <span className="split-ledger-amount" style={{ color: display.color }}>
                    {display.sign}{formatCurrency(entry.amount, currency)}
                  </span>
                  <div className="split-entry-actions">
                    <button className="split-entry-btn" onClick={() => openEditEntry(entry)} title="Edit">
                      <i className="fa-solid fa-pen" />
                    </button>
                    <button className="split-entry-btn danger" onClick={() => handleDeleteEntry(entry.id)} title="Delete">
                      <i className="fa-solid fa-trash-can" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Modal isOpen={showSettleModal} onClose={() => setShowSettleModal(false)} title={`Settle with ${selectedPerson}`}>
          <div className="settle-modal-content">
            <div className="form-group">
              <label className="form-label">Amount</label>
              <div className="split-input-wrap">
                <span className="split-input-currency">{currency}</span>
                <input type="number" className="split-input" placeholder="0.00" step="0.01" min="0.01" value={settleForm.amount} onChange={(e) => setSettleForm({ ...settleForm, amount: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Direction</label>
              <div className="split-mode-row">
                <button type="button" className={`split-mode-btn ${settleForm.direction === 'received' ? 'active' : ''}`} onClick={() => setSettleForm({ ...settleForm, direction: 'received' })}>
                  <i className="fa-solid fa-arrow-down" /> They paid me
                </button>
                <button type="button" className={`split-mode-btn ${settleForm.direction === 'paid' ? 'active' : ''}`} onClick={() => setSettleForm({ ...settleForm, direction: 'paid' })}>
                  <i className="fa-solid fa-arrow-up" /> I paid them
                </button>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Note (optional)</label>
              <input type="text" className="form-input" placeholder="e.g. Weekly settlement" value={settleForm.note} onChange={(e) => setSettleForm({ ...settleForm, note: e.target.value })} />
            </div>
            <div className="settle-record-toggle">
              <label className="split-toggle-row" onClick={() => setSettleForm({ ...settleForm, recordTransaction: !settleForm.recordTransaction })}>
                <span className="split-toggle-text" style={{ fontSize: '0.82rem' }}>Update account balance</span>
                <span className={`split-checkbox ${settleForm.recordTransaction ? 'checked' : ''}`}>
                  {settleForm.recordTransaction && <i className="fa-solid fa-check" />}
                </span>
              </label>
            </div>
            {settleForm.recordTransaction && (
              <div className="form-group">
                <label className="form-label"><i className="fa-solid fa-wallet" style={{ marginRight: 6 }} />Account</label>
                <div className="settle-account-grid">
                  {accounts.map((acc) => (
                    <button key={acc.id} type="button" className={`settle-account-card ${settleForm.accountId === acc.id ? 'selected' : ''}`} onClick={() => setSettleForm({ ...settleForm, accountId: acc.id })}>
                      <span className="settle-account-icon">{getAccountIcon(acc.type, currency)}</span>
                      <span className="settle-account-name">{acc.name}</span>
                      {settleForm.accountId === acc.id && <span className="settle-account-check"><i className="fa-solid fa-circle-check" /></span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button className="btn btn-primary btn-full" onClick={handleSettle}>
              <i className="fa-solid fa-check" /> Confirm Settlement
            </button>
          </div>
        </Modal>

        <Modal isOpen={showEditEntry} onClose={() => { setShowEditEntry(false); setEditEntry(null); }} title="Edit Entry">
          <div className="settle-modal-content">
            <div className="form-group">
              <label className="form-label">Amount</label>
              <div className="split-input-wrap">
                <span className="split-input-currency">{currency}</span>
                <input type="number" className="split-input" placeholder="0.00" step="0.01" min="0.01" value={editEntryForm.amount} onChange={(e) => setEditEntryForm({ ...editEntryForm, amount: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Note</label>
              <input type="text" className="form-input" placeholder="What was this for?" value={editEntryForm.note} onChange={(e) => setEditEntryForm({ ...editEntryForm, note: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input type="date" className="form-input" value={editEntryForm.date} onChange={(e) => setEditEntryForm({ ...editEntryForm, date: e.target.value })} />
            </div>
            <button className="btn btn-primary btn-full" onClick={handleUpdateEntry} disabled={!editEntryForm.amount}>
              <i className="fa-solid fa-check" /> Save Changes
            </button>
          </div>
        </Modal>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">Split Tracker</h1>

      <div className="split-stats-row">
        <div className="split-stat-card split-stat-pending">
          <p className="split-stat-label">They Owe You</p>
          <p className="split-stat-value">{formatCurrency(totalOwedToYou, currency)}</p>
        </div>
        <div className="split-stat-card split-stat-you-owe">
          <p className="split-stat-label">You Owe</p>
          <p className="split-stat-value">{formatCurrency(totalYouOwe, currency)}</p>
        </div>
      </div>

      <div className="split-actions-bar">
        <button className="split-action-btn" onClick={() => { setOweForm({ ...oweForm, person: people[0] || '' }); setShowOweModal(true); }}>
          <i className="fa-solid fa-plus" /> They paid for me
        </button>
        <button className="split-action-btn secondary" onClick={() => setShowManagePeople(true)}>
          <i className="fa-solid fa-user-group" /> People
        </button>
      </div>

      {people.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👥</div>
          <p>Add people you split expenses with to get started.</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowManagePeople(true)}>
            <i className="fa-solid fa-user-plus" /> Add People
          </button>
        </div>
      ) : (
        <div className="split-people-list">
          {Object.entries(balances)
            .filter(([name]) => people.includes(name))
            .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
            .map(([name, bal]) => (
              <button key={name} className="split-person-card" onClick={() => { setSelectedPerson(name); setView('person'); }}>
                <span className="split-person-card-avatar">{name.charAt(0).toUpperCase()}</span>
                <div className="split-person-card-info">
                  <p className="split-person-card-name">{name}</p>
                  <p className={`split-person-card-bal ${bal > 0 ? 'positive' : bal < 0 ? 'negative' : 'settled'}`}>
                    {bal > 0 ? `Owes you ${formatCurrency(bal, currency)}` : bal < 0 ? `You owe ${formatCurrency(Math.abs(bal), currency)}` : 'Settled ✓'}
                  </p>
                </div>
                <i className="fa-solid fa-chevron-right split-person-card-arrow" />
              </button>
            ))}
        </div>
      )}

      {/* Manage People Modal */}
      <Modal isOpen={showManagePeople} onClose={() => setShowManagePeople(false)} title="Manage People">
        <div className="manage-people-content">
          <div className="manage-people-add">
            <input
              type="text"
              className="form-input"
              placeholder="Enter name..."
              value={newPersonName}
              onChange={(e) => setNewPersonName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addPerson(); }}
            />
            <button className="btn btn-primary" onClick={addPerson} disabled={!newPersonName.trim()}>
              <i className="fa-solid fa-plus" />
            </button>
          </div>
          {people.length === 0 ? (
            <p className="manage-people-empty">No people added yet.</p>
          ) : (
            <div className="manage-people-list">
              {people.map((p) => (
                <div key={p} className="manage-people-item">
                  <span className="manage-people-avatar">{p.charAt(0).toUpperCase()}</span>
                  <span className="manage-people-name">{p}</span>
                  <button className="manage-people-remove" onClick={() => removePerson(p)}>
                    <i className="fa-solid fa-trash-can" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* They Paid For Me Modal */}
      <Modal isOpen={showOweModal} onClose={() => setShowOweModal(false)} title="They Paid for Me">
        <div className="owe-modal-content">
          <div className="form-group">
            <label className="form-label">Who paid?</label>
            <div className="split-people-picker">
              {people.map((p) => (
                <button key={p} type="button" className={`split-person-chip ${oweForm.person === p ? 'selected' : ''}`} onClick={() => setOweForm({ ...oweForm, person: p })}>
                  <span className="split-person-avatar">{p.charAt(0).toUpperCase()}</span>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Your share (what you owe them)</label>
            <div className="split-input-wrap">
              <span className="split-input-currency">{currency}</span>
              <input type="number" className="split-input" placeholder="0.00" step="0.01" min="0.01" value={oweForm.amount} onChange={(e) => setOweForm({ ...oweForm, amount: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">What was it for?</label>
            <input type="text" className="form-input" placeholder="e.g. Snacks, dinner..." value={oweForm.note} onChange={(e) => setOweForm({ ...oweForm, note: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Date</label>
            <input type="date" className="form-input" value={oweForm.date} onChange={(e) => setOweForm({ ...oweForm, date: e.target.value })} />
          </div>
          <div className="settle-record-toggle">
            <label className="split-toggle-row" onClick={() => setOweForm({ ...oweForm, recordTransaction: !oweForm.recordTransaction })}>
              <span className="split-toggle-text" style={{ fontSize: '0.82rem' }}>Update account balance</span>
              <span className={`split-checkbox ${oweForm.recordTransaction ? 'checked' : ''}`}>
                {oweForm.recordTransaction && <i className="fa-solid fa-check" />}
              </span>
            </label>
          </div>
          {oweForm.recordTransaction && (
            <div className="form-group">
              <label className="form-label"><i className="fa-solid fa-wallet" style={{ marginRight: 6 }} />Received in</label>
              <div className="settle-account-grid">
                {accounts.map((acc) => (
                  <button key={acc.id} type="button" className={`settle-account-card ${oweForm.accountId === acc.id ? 'selected' : ''}`} onClick={() => setOweForm({ ...oweForm, accountId: acc.id })}>
                    <span className="settle-account-icon">{getAccountIcon(acc.type, currency)}</span>
                    <span className="settle-account-name">{acc.name}</span>
                    {oweForm.accountId === acc.id && <span className="settle-account-check"><i className="fa-solid fa-circle-check" /></span>}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button className="btn btn-primary btn-full" onClick={handleAddOwe} disabled={!oweForm.person || !oweForm.amount}>
            <i className="fa-solid fa-plus" /> Add Entry
          </button>
        </div>
      </Modal>
    </div>
  );
}
