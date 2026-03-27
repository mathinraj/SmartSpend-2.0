'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import './LockScreen.css';

const PIN_LENGTH = 4;

function hashValue(val) {
  let hash = 0;
  for (let i = 0; i < val.length; i++) {
    const char = val.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'pin_' + Math.abs(hash).toString(36);
}

export default function LockScreen({ onUnlock }) {
  const [pin, setPin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const inputRef = useRef(null);
  const passwordRef = useRef(null);

  const storedHash = typeof window !== 'undefined'
    ? localStorage.getItem('spendtraq_app_lock')
    : null;
  const lockType = typeof window !== 'undefined'
    ? (localStorage.getItem('spendtraq_lock_type') || 'pin')
    : 'pin';

  const isPassword = lockType === 'password';

  useEffect(() => {
    if (isPassword) passwordRef.current?.focus();
    else inputRef.current?.focus();
  }, [isPassword]);

  const triggerError = useCallback((msg) => {
    setError(msg);
    setShake(true);
    setTimeout(() => { setShake(false); setPin(''); setPassword(''); setError(''); }, 1200);
  }, []);

  useEffect(() => {
    if (isPassword) return;
    if (pin.length === PIN_LENGTH) {
      if (hashValue(pin) === storedHash) {
        onUnlock();
      } else {
        triggerError('Wrong PIN. Try again.');
      }
    }
  }, [pin, storedHash, isPassword, onUnlock, triggerError]);

  function handlePasswordSubmit(e) {
    e.preventDefault();
    if (!password) return;
    if (hashValue(password) === storedHash) {
      onUnlock();
    } else {
      triggerError('Wrong password. Try again.');
    }
  }

  function handleKeyPress(digit) {
    if (pin.length < PIN_LENGTH) {
      setPin((p) => p + digit);
      setError('');
    }
  }

  function handleBackspace() {
    setPin((p) => p.slice(0, -1));
    setError('');
  }

  return (
    <div className="lock-screen">
      <div className="lock-content">
        <div className="lock-icon">
          <i className="fa-solid fa-lock" />
        </div>
        <h2 className="lock-title">SpendTrak</h2>
        <p className="lock-subtitle">
          {isPassword ? 'Enter your password to unlock' : 'Enter your PIN to unlock'}
        </p>

        {isPassword ? (
          <form className="lock-password-form" onSubmit={handlePasswordSubmit}>
            <div className={`lock-password-wrap ${shake ? 'lock-shake' : ''}`}>
              <input
                ref={passwordRef}
                type="password"
                className={`lock-password-input ${error ? 'lock-password-error' : ''}`}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="Password"
                autoFocus
              />
            </div>
            {error && <p className="lock-error">{error}</p>}
            <button type="submit" className="lock-unlock-btn" disabled={!password}>
              <i className="fa-solid fa-lock-open" /> Unlock
            </button>
          </form>
        ) : (
          <>
            <div className={`lock-dots ${shake ? 'lock-shake' : ''}`}>
              {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                <span key={i} className={`lock-dot ${i < pin.length ? 'filled' : ''} ${error && i < pin.length ? 'error' : ''}`} />
              ))}
            </div>

            {error && <p className="lock-error">{error}</p>}

            <div className="lock-keypad">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'del'].map((key, i) => (
                <button
                  key={i}
                  className={`lock-key ${key === null ? 'lock-key-empty' : ''} ${key === 'del' ? 'lock-key-action' : ''}`}
                  onClick={() => {
                    if (key === 'del') handleBackspace();
                    else if (key !== null) handleKeyPress(String(key));
                  }}
                  disabled={key === null}
                >
                  {key === 'del' ? <i className="fa-solid fa-delete-left" /> : key !== null ? key : ''}
                </button>
              ))}
            </div>

            <input
              ref={inputRef}
              type="tel"
              className="lock-hidden-input"
              maxLength={PIN_LENGTH}
              value={pin}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH);
                setPin(val);
                setError('');
              }}
              autoFocus
            />
          </>
        )}
      </div>
    </div>
  );
}
