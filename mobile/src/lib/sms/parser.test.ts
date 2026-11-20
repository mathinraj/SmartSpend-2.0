/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { SMS_FIXTURES } from '@/lib/sms/fixtures';
import { messageKey, parseSms, READY_CONFIDENCE } from '@/lib/sms/parser';
import { parseSender } from '@/lib/sms/senders';

function receivedAt(local: string): number {
  const [date, time] = local.split('T');
  const [y, m, d] = date.split('-').map(Number);
  const [h, min] = time.split(':').map(Number);
  return new Date(y, m - 1, d, h, min).getTime();
}

describe('SMS parser fixtures', () => {
  for (const fixture of SMS_FIXTURES) {
    test(fixture.name, () => {
      const result = parseSms({ sender: fixture.sender, body: fixture.body, receivedAt: receivedAt(fixture.received) });
      const expected = fixture.expect;
      if ('ignored' in expected) {
        assert.deepEqual(result.kind === 'ignored' ? result.reason : result, expected.ignored);
        return;
      }
      if ('unparsed' in expected) {
        assert.deepEqual(result.kind === 'unparsed' ? result.reason : result, expected.unparsed);
        return;
      }
      assert.equal(result.kind, 'parsed', JSON.stringify(result));
      if (result.kind !== 'parsed') return;
      const { amount, ready, ...fields } = expected;
      assert.equal(result.txn.amountMinor, Math.round(amount * 100), 'amount');
      for (const [key, value] of Object.entries(fields)) {
        assert.deepEqual(result.txn[key as keyof typeof result.txn], value, key);
      }
      if (ready) assert.ok(result.confidence >= READY_CONFIDENCE, `confidence ${result.confidence}`);
    });
  }
});

describe('SMS senders', () => {
  test('reads DLT headers and their category suffix', () => {
    assert.deepEqual(parseSender('VM-HDFCBK-S')?.code, 'HDFCBK');
    assert.equal(parseSender('AX-AXISBK-P')?.suffix, 'P');
    assert.equal(parseSender('JD-JIOPBS-S')?.institution?.name, 'Jio Payments Bank');
    assert.equal(parseSender('JX-BOBCRD-S')?.institution?.kind, 'card');
    assert.equal(parseSender('BA-BSNLSD-S')?.nonFinancial, true);
    assert.equal(parseSender('+919876543210'), null);
  });
});

describe('message keys', () => {
  test('ignore spacing, punctuation and case', () => {
    assert.equal(messageKey('INR 30.00 debited  A/c no. XX1'), messageKey('inr 30.00 Debited A/C No XX1'));
  });

  test('the same alert from two sender IDs gets the same key', () => {
    const body = 'INR 30.00 debited A/c no. XX4821 18-11-26, 14:07:51 UPI/P2M/600000000303/SHOP Not you? Axis Bank';
    const at = receivedAt('2026-11-18T14:08');
    const a = parseSms({ sender: 'JD-AXISBK-S', body, receivedAt: at });
    const b = parseSms({ sender: 'BG-AXISBK-S', body, receivedAt: at });
    assert.ok(a.kind === 'parsed' && b.kind === 'parsed');
    assert.equal(a.key, b.key);
  });
});
