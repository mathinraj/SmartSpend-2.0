/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type { SQLiteDatabase } from 'expo-sqlite';

import { createAccount, getAccount } from '@/db/accounts';
import { addSmsTransaction, getSmsMessage, linkSmsToTransaction, listSmsLog, listSmsReview, undoSmsAdd } from '@/db/sms';
import { migratedTestDb } from '@/db/test-db';
import { addTransaction, listTransactions } from '@/db/transactions';
import { updateSettings } from '@/db/settings';
import { autoAddReady, buildChoice, ingestMessages, suggestFor } from '@/lib/sms/ingest';
import type { InboxSms } from '@/lib/sms/native';

const options = { ignoredSenders: [], autoAdd: false };
const at = (h: number, m = 0) => new Date(2026, 10, 18, h, m).getTime();

let nextId = 1;
function sms(address: string, body: string, date: number): InboxSms {
  return { id: nextId++, address, body, date };
}

async function setup(): Promise<{ db: SQLiteDatabase; bank: string; card: string; cash: string }> {
  const db = await migratedTestDb();
  const base = { subType: null, icon: null, color: null, creditLimit: null, billingDay: null, dueDay: null, customTypeId: null, logoUrl: null };
  const bank = await createAccount(db, { ...base, name: 'Axis Savings', type: 'bank', balance: 10000 });
  const card = await createAccount(db, { ...base, name: 'BOBCARD 1357', type: 'card', subType: 'credit', balance: -2000 });
  const cash = await createAccount(db, { ...base, name: 'Cash', type: 'cash', balance: 500 });
  return { db, bank, card, cash };
}

const SWIGGY = 'INR 450.00 debited A/c no. XX4821 18-11-26, 14:07:51 UPI/P2M/600000000303/SWIGGY Not you? SMS BLOCKUPI Cust ID to 919951860002 Axis Bank';

describe('SMS import', () => {
  test('stores transactions for review and ignored messages without their text', async () => {
    const { db } = await setup();
    const result = await ingestMessages(
      db,
      [sms('JD-AXISBK-S', SWIGGY, at(14, 8)), sms('JD-AXISBK-S', '654321 is the OTP to track your request status on Axis Bank website.', at(14, 9))],
      options
    );
    assert.equal(result.pending, 1);
    const log = await listSmsLog(db);
    const otp = log.find((m) => m.result === 'ignored');
    assert.equal(otp?.reason, 'otp');
    assert.equal(otp?.body, null);
    const [item] = await listSmsReview(db);
    assert.equal(item.parsed?.merchant, 'Swiggy');
    assert.equal(item.body, SWIGGY);
  });

  test('the same alert from two sender IDs, or read twice, is stored once', async () => {
    const { db } = await setup();
    const first = sms('JD-AXISBK-S', SWIGGY, at(14, 8));
    await ingestMessages(db, [first, sms('BG-AXISBK-S', SWIGGY, at(14, 8))], options);
    await ingestMessages(db, [first], options);
    assert.equal((await listSmsReview(db)).length, 1);
    const log = await listSmsLog(db);
    assert.equal(log.length, 2, 'the copy is logged once');
    assert.equal(log.filter((m) => m.status === 'duplicate').length, 1);
  });

  test('a UPI app alert for the same payment merges into the bank one', async () => {
    const { db } = await setup();
    await ingestMessages(db, [sms('JD-AXISBK-S', SWIGGY, at(14, 8))], options);
    await ingestMessages(db, [sms('VM-PHONPE-S', 'Paid Rs.450.00 to SWIGGY from Axis Bank a/c XX4821. UPI Ref 600000000303', at(14, 9))], options);
    const log = await listSmsLog(db);
    assert.equal(log.filter((m) => m.status === 'duplicate').length, 1);
    assert.equal((await listSmsReview(db)).length, 1);
  });

  test('adding learns the account and category, so the next one is ready', async () => {
    const { db, bank } = await setup();
    await ingestMessages(db, [sms('JD-AXISBK-S', SWIGGY, at(14, 8))], options);
    const [item] = await listSmsReview(db);
    const first = await suggestFor(db, item);
    assert.equal(first.accountId, null);
    assert.equal(first.categoryId, 'food');
    assert.equal(first.ready, false);

    const choice = buildChoice(item, { ...first, accountId: bank });
    assert.ok(choice);
    await addSmsTransaction(db, item.id, choice);
    assert.equal((await getAccount(db, bank))?.balance, 9550);
    assert.equal((await getSmsMessage(db, item.id))?.body, null);

    const next = SWIGGY.replace('450.00', '220.00').replace('600000000303', '600000000999');
    await ingestMessages(db, [sms('JD-AXISBK-S', next, at(20))], options);
    const [second] = await listSmsReview(db);
    const suggestion = await suggestFor(db, second);
    assert.equal(suggestion.accountId, bank);
    assert.equal(suggestion.ready, true);
  });

  test('automatic adding uses what was learned, and Undo reverses it', async () => {
    const { db, bank } = await setup();
    await ingestMessages(db, [sms('JD-AXISBK-S', SWIGGY, at(14, 8))], options);
    const [item] = await listSmsReview(db);
    await addSmsTransaction(db, item.id, buildChoice(item, { ...(await suggestFor(db, item)), accountId: bank })!);

    const next = SWIGGY.replace('450.00', '100.00').replace('600000000303', '600000000888');
    const result = await ingestMessages(db, [sms('JD-AXISBK-S', next, at(21))], { ...options, autoAdd: true });
    assert.equal(result.autoAdded, 1);
    assert.equal((await getAccount(db, bank))?.balance, 9450);

    const auto = (await listSmsReview(db)).find((m) => m.status === 'auto_added');
    assert.ok(auto);
    await undoSmsAdd(db, auto.id);
    assert.equal((await getAccount(db, bank))?.balance, 9550);
    assert.equal((await getSmsMessage(db, auto.id))?.status, 'pending');
  });

  test('card bill payments become transfers into the card, and ATM withdrawals into cash', async () => {
    const { db, bank, card, cash } = await setup();
    await ingestMessages(
      db,
      [
        sms('CP-BOBCRD-T', 'Update: Payment of Rs 1000.00 received for your BOBCARD ending 1357 on 2026-11-18.', at(10)),
        sms('AD-AXISBK-S', 'INR 300.00 withdrawn at ATM S1AB1234 from A/c XX4821 on 18-11-26. Avl Bal INR 5000.00 - Axis Bank', at(11)),
      ],
      options
    );
    const items = await listSmsReview(db);
    const payment = items.find((m) => m.parsed?.kind === 'card-payment')!;
    const atm = items.find((m) => m.parsed?.kind === 'atm')!;

    const cardSuggestion = await suggestFor(db, payment);
    assert.equal(cardSuggestion.accountId, card, 'card found by the digits in its name');
    await addSmsTransaction(db, payment.id, buildChoice(payment, { ...cardSuggestion, otherAccountId: bank })!);
    assert.equal((await getAccount(db, card))?.balance, -1000);
    assert.equal((await getAccount(db, bank))?.balance, 9000);

    const atmSuggestion = await suggestFor(db, atm);
    assert.equal(atmSuggestion.otherAccountId, cash);
    await addSmsTransaction(db, atm.id, buildChoice(atm, { ...atmSuggestion, accountId: bank })!);
    assert.equal((await getAccount(db, cash))?.balance, 800);
    const transfers = await listTransactions(db, { type: 'transfer' });
    assert.equal(transfers.length, 2);
  });

  test('a matching hand-entered transaction is flagged instead of added twice', async () => {
    const { db, bank } = await setup();
    const manual = await addTransaction(db, {
      type: 'expense', amount: 450, accountId: bank, fromAccountId: null, toAccountId: null, categoryId: 'food', subcategoryId: null,
      note: 'Lunch', date: '2026-11-18', time: '13:00', isSplit: false, splitAmount: null, deductMyShare: false, source: 'manual', sourceRef: null, paymentApp: null,
    });
    await ingestMessages(db, [sms('JD-AXISBK-S', SWIGGY, at(14, 8))], options);
    const [item] = await listSmsReview(db);
    assert.equal(item.duplicateOf, `txn:${manual}`);
    await linkSmsToTransaction(db, item.id, manual);
    assert.equal((await listSmsReview(db)).length, 0);
    assert.equal((await getAccount(db, bank))?.balance, 9550);
  });

  test('confirming one item auto-adds waiting ones from the same payee when automatic adding is on', async () => {
    const { db, bank } = await setup();
    await updateSettings(db, { smsAutoAdd: true });
    const second = SWIGGY.replace('450.00', '120.00').replace('600000000303', '600000000777');
    await ingestMessages(db, [sms('JD-AXISBK-S', SWIGGY, at(14, 8)), sms('JD-AXISBK-S', second, at(19))], options);
    const items = await listSmsReview(db);
    assert.equal(items.length, 2);
    const first = items.find((m) => m.parsed?.amountMinor === 45000)!;
    await addSmsTransaction(db, first.id, buildChoice(first, { ...(await suggestFor(db, first)), accountId: bank })!);
    assert.equal(await autoAddReady(db), 1);
    const left = await listSmsReview(db);
    assert.deepEqual(left.map((m) => m.status), ['auto_added']);
    assert.equal((await getAccount(db, bank))?.balance, 9430);
  });

  test("a bank's messages without account digits learn the account too", async () => {
    const { db, bank } = await setup();
    const body = (amount: string) => `Your A/c has been debited towards Google for INR ${amount} on 18-11-26. abcd@apl - Axis Bank`;
    await ingestMessages(db, [sms('AD-AXISBK-S', body('469.00'), at(6))], options);
    const [item] = await listSmsReview(db);
    await addSmsTransaction(db, item.id, buildChoice(item, { ...(await suggestFor(db, item)), accountId: bank })!);
    await ingestMessages(db, [sms('AD-AXISBK-S', body('129.00'), at(7))], options);
    const [next] = await listSmsReview(db);
    assert.equal((await suggestFor(db, next)).accountId, bank);
  });

  test('ignored senders are skipped', async () => {
    const { db } = await setup();
    await ingestMessages(db, [sms('JD-AXISBK-S', SWIGGY, at(14, 8))], { ...options, ignoredSenders: ['AXISBK'] });
    assert.equal((await listSmsReview(db)).length, 0);
    assert.equal((await listSmsLog(db))[0].reason, 'ignored-sender');
  });
});
