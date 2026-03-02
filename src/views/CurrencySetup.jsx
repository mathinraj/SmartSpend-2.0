'use client';

import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CURRENCIES } from '../utils/currencies';
import './CurrencySetup.css';

export default function CurrencySetup() {
  const { dispatch } = useApp();
  const [search, setSearch] = useState('');

  const filtered = CURRENCIES.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase())
  );

  function handleSelect(code) {
    dispatch({ type: 'SET_CURRENCY', payload: code });
  }

  return (
    <div className="currency-page">
      <div className="currency-page-content">
        <div className="currency-header">
          <span className="currency-header-icon">🌍</span>
          <h1 className="currency-page-title">Choose your currency</h1>
          <p className="currency-page-subtitle">
            Select the primary currency you use. This will be used across all your transactions.
          </p>
        </div>

        <div className="currency-search-wrap">
          <span className="currency-search-icon">🔍</span>
          <input
            type="text"
            className="currency-search"
            placeholder="Search currency..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="currency-grid">
          {filtered.map((currency) => (
            <button
              key={currency.code}
              className="currency-card"
              onClick={() => handleSelect(currency.code)}
            >
              <span className="currency-flag">{currency.flag}</span>
              <span className="currency-card-symbol">{currency.symbol}</span>
              <span className="currency-card-code">{currency.code}</span>
              <span className="currency-card-name">{currency.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
