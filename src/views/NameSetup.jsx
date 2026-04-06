'use client';

import { useState } from 'react';
import { useApp } from '../context/AppContext';
import './NameSetup.css';

export default function NameSetup() {
  const { dispatch } = useApp();
  const [name, setName] = useState('');

  function handleContinue() {
    const trimmed = name.trim();
    if (trimmed) {
      dispatch({ type: 'SET_PROFILE_NAME', payload: trimmed });
    }
  }

  function handleSkip() {
    dispatch({ type: 'NEXT_ONBOARD_STEP' });
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && name.trim()) {
      handleContinue();
    }
  }

  return (
    <div className="name-page">
      <div className="name-page-content">
        <div className="name-header">
          <span className="name-header-icon">👋</span>
          <h1 className="name-page-title">What should we call you?</h1>
          <p className="name-page-subtitle">
            This name will be used to greet you across the app. You can always change it later in Preferences.
          </p>
        </div>

        <div className="name-input-wrap">
          <input
            type="text"
            className="name-input"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={30}
            autoFocus
          />
        </div>

        <div className="name-actions">
          <button
            className="name-continue-btn"
            onClick={handleContinue}
            disabled={!name.trim()}
          >
            Continue
            <span className="name-btn-arrow">→</span>
          </button>
          <button className="name-skip-btn" onClick={handleSkip}>
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
