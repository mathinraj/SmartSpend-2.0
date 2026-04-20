'use client';

import { useState } from 'react';

export default function FAQAccordion({ faqs }) {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <div className="mkt-faq-list">
      {faqs.map((faq, i) => (
        <div key={i} className={`mkt-faq-item ${openIndex === i ? 'open' : ''}`}>
          <button
            className="mkt-faq-question"
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            aria-expanded={openIndex === i}
          >
            <span>{faq.q}</span>
            <i className="fa-solid fa-chevron-down mkt-faq-chevron" />
          </button>
          <div className="mkt-faq-answer" role="region">
            <p className="mkt-faq-answer-inner">{faq.a}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
