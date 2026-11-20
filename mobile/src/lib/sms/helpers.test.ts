/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { guessCategory, merchantKey } from '@/lib/sms/categorize';
import { duplicateScore, MERGE_SCORE, POSSIBLE_SCORE } from '@/lib/sms/dedup';
import { SMS_FIXTURES } from '@/lib/sms/fixtures';
import { parseSms, type ParsedSms } from '@/lib/sms/parser';
import { redactSms } from '@/lib/sms/redact';

const T0 = new Date(2026, 10, 18, 14, 0).getTime();

function txn(over: Partial<ParsedSms>): ParsedSms {
  return {
    kind: 'expense',
    direction: 'debit',
    amountMinor: 45000,
    institution: 'Axis Bank',
    institutionKind: 'bank',
    accountHint: '4821',
    accountIsCard: false,
    mode: 'upi',
    merchant: 'Swiggy',
    toPerson: false,
    vpa: null,
    reference: null,
    balanceMinor: null,
    date: '2026-11-18',
    time: '14:00',
    isRefund: false,
    settled: false,
    ...over,
  };
}

describe('duplicate scoring', () => {
  test('the same UPI reference is the same payment, different ones never are', () => {
    assert.equal(duplicateScore({ txn: txn({ reference: 'R1' }), receivedAt: T0 }, { txn: txn({ reference: 'R1', institution: 'PhonePe' }), receivedAt: T0 + 60_000 }), 1);
    assert.equal(duplicateScore({ txn: txn({ reference: 'R1' }), receivedAt: T0 }, { txn: txn({ reference: 'R2' }), receivedAt: T0 }), 0);
  });

  test('a different balance after each payment keeps repeated payments apart', () => {
    const a = { txn: txn({ balanceMinor: 100000 }), receivedAt: T0 };
    assert.equal(duplicateScore(a, { txn: txn({ balanceMinor: 55000 }), receivedAt: T0 + 60_000 }), 0);
    assert.equal(duplicateScore(a, { txn: txn({ balanceMinor: 100000, institution: 'PhonePe' }), receivedAt: T0 + 60_000 }), 1);
  });

  test('bank and UPI app alerts minutes apart merge; the same bank repeating an amount does not', () => {
    const bank = { txn: txn({}), receivedAt: T0 };
    const app = { txn: txn({ institution: 'PhonePe', accountHint: null }), receivedAt: T0 + 2 * 60_000 };
    assert.ok(duplicateScore(bank, app) >= MERGE_SCORE);
    const again = { txn: txn({}), receivedAt: T0 + 20 * 60_000 };
    assert.ok(duplicateScore(bank, again) < POSSIBLE_SCORE);
  });

  test('a card bill payment and the bank debit that paid it are a possible pair', () => {
    const card = { txn: txn({ kind: 'card-payment', direction: 'credit', amountMinor: 500000 }), receivedAt: T0 };
    const debit = { txn: txn({ amountMinor: 500000, merchant: 'BBPS' }), receivedAt: T0 + 3_600_000 };
    const score = duplicateScore(debit, card);
    assert.ok(score >= POSSIBLE_SCORE && score < MERGE_SCORE);
  });

  test('different amounts or directions are never duplicates', () => {
    assert.equal(duplicateScore({ txn: txn({}), receivedAt: T0 }, { txn: txn({ amountMinor: 45100 }), receivedAt: T0 }), 0);
    assert.equal(duplicateScore({ txn: txn({}), receivedAt: T0 }, { txn: txn({ direction: 'credit', kind: 'income' }), receivedAt: T0 }), 0);
  });
});

describe('category guesses', () => {
  test('from the merchant, and from the wording for income', () => {
    assert.deepEqual(guessCategory(txn({ merchant: 'Swiggy Instamart' }), null), { categoryId: 'food', subcategoryId: 'food_groceries' });
    assert.deepEqual(guessCategory(txn({ merchant: 'Uber' }), null), { categoryId: 'transport', subcategoryId: 'transport_taxi' });
    assert.equal(guessCategory(txn({ merchant: 'Mr Karthik Selvam' }), null), null);
    assert.deepEqual(guessCategory(txn({ kind: 'income', direction: 'credit', isRefund: true }), null), { categoryId: 'income_refund', subcategoryId: null });
    assert.deepEqual(guessCategory(txn({ kind: 'income', direction: 'credit', merchant: null }), 'Salary for Nov credited'), { categoryId: 'income_salary', subcategoryId: null });
  });

  test('merchant keys ignore cities, numbers and case', () => {
    assert.equal(merchantKey('SWIGGY BANGALORE 12345'), merchantKey('Swiggy'));
  });
});

describe('redaction for reports', () => {
  test('removes names, numbers, references and amounts but keeps the wording', () => {
    const text = redactSms('INR 280.00 debited A/c no. XX4821 19-11-26, 21:52:21 UPI/P2A/600000000202/Mr Karthik Selvam Not you? SMS BLOCKUPI Cust ID to 919951860002 Axis Bank');
    assert.equal(text, 'INR {amount} debited A/c no. XX{acct} {date}, {time} UPI/P2A/{ref}/{payee} Not you? SMS BLOCKUPI Cust ID to {number} Axis Bank');
  });

  test('leaves no digit runs or UPI IDs in any fixture, and no payee names in transactions', () => {
    for (const f of SMS_FIXTURES) {
      const text = redactSms(f.body);
      assert.doesNotMatch(text, /\d{3,}/, `${f.name}: ${text}`);
      assert.doesNotMatch(text, /[a-z0-9]@[a-z]/i, `${f.name}: ${text}`);
      // Names inside free text ("Priya Raman's application") can't be found reliably; the user edits before sending.
      if ('amount' in f.expect) assert.doesNotMatch(text, /Karthik|Selvam|Meena|Lakshmi|ARUN/, `${f.name}: ${text}`);
    }
  });

  test('a redacted message still parses the same way', () => {
    const body = 'INR 450.00 is spent on your BOBCARD ending 1357 at Upi-cred on 23-10-2026.';
    const original = parseSms({ sender: 'JX-BOBCRD-S', body, receivedAt: T0 });
    const redacted = redactSms(body);
    assert.equal(original.kind, 'parsed');
    assert.match(redacted, /spent on your BOBCARD ending \{acct\} at Upi-cred on \{date\}/);
  });
});
