import type { SQLiteDatabase } from 'expo-sqlite';

import { listAccounts } from '@/db/accounts';
import { listCategories } from '@/db/categories';
import {
  addSmsTransaction,
  findManualMatch,
  findSmsIdByKey,
  getAccountHint,
  getMerchantCategory,
  getSmsMessage,
  insertSmsMessage,
  knownSmsIds,
  listDedupCandidates,
  listReparseCandidates,
  updateSmsParse,
  type SmsChoice,
  type SmsMessage,
} from '@/db/sms';
import type { NewTransaction } from '@/db/transactions';
import { guessCategory, merchantKey } from '@/lib/sms/categorize';
import { duplicateScore, isCardPaymentPair, MERGE_SCORE, POSSIBLE_SCORE } from '@/lib/sms/dedup';
import type { InboxSms } from '@/lib/sms/native';
import { parseSms, READY_CONFIDENCE, SMS_PARSER_VERSION, type ParsedSms } from '@/lib/sms/parser';
import { parseSender } from '@/lib/sms/senders';
import type { Account } from '@/types/models';

const HOUR = 3_600_000;

export interface IngestOptions {
  ignoredSenders: string[];
  autoAdd: boolean;
}

export interface IngestResult {
  /** New items waiting in the review list. */
  pending: number;
  autoAdded: number;
}

/** Stores and parses inbox messages (oldest first), skipping ones already seen. */
export async function ingestMessages(db: SQLiteDatabase, messages: InboxSms[], options: IngestOptions): Promise<IngestResult> {
  const result: IngestResult = { pending: 0, autoAdded: 0 };
  const known = await knownSmsIds(db, messages.map((m) => m.id));
  for (const sms of messages) {
    if (known.has(sms.id)) continue;
    const id = await ingestOne(db, sms, options);
    if (!id) continue;
    const stored = await getSmsMessage(db, id);
    if (stored?.status !== 'pending') continue;
    if (options.autoAdd && (await tryAutoAdd(db, stored))) result.autoAdded += 1;
    else result.pending += 1;
  }
  return result;
}

async function ingestOne(db: SQLiteDatabase, sms: InboxSms, options: IngestOptions): Promise<string | null> {
  const senderCode = parseSender(sms.address)?.code ?? null;
  const base = { smsId: sms.id, sender: sms.address, senderCode, receivedAt: sms.date, parserVersion: SMS_PARSER_VERSION, dupScore: null, duplicateOf: null };

  if (senderCode && options.ignoredSenders.includes(senderCode)) {
    return insertSmsMessage(db, { ...base, key: `sms:${sms.id}`, body: null, result: 'ignored', reason: 'ignored-sender', parsed: null, confidence: null, status: 'ignored' });
  }
  const parse = parseSms({ sender: sms.address, body: sms.body, receivedAt: sms.date });
  if (parse.kind === 'ignored') {
    return insertSmsMessage(db, { ...base, key: `sms:${sms.id}`, body: null, result: 'ignored', reason: parse.reason, parsed: null, confidence: null, status: 'ignored' });
  }
  // The same alert again (another sender ID, or the UPI app quoting the bank's reference): log it as a
  // duplicate of the first, so it shows in the log and isn't read again.
  const existing = await findSmsIdByKey(db, parse.key);
  if (existing) {
    return insertSmsMessage(db, {
      ...base,
      key: `sms:${sms.id}`,
      body: null,
      result: parse.kind,
      reason: parse.kind === 'unparsed' ? parse.reason : null,
      parsed: parse.kind === 'parsed' ? parse.txn : null,
      confidence: parse.kind === 'parsed' ? parse.confidence : null,
      status: 'duplicate',
      duplicateOf: existing,
    });
  }
  if (parse.kind === 'unparsed') {
    return insertSmsMessage(db, { ...base, key: parse.key, body: sms.body, result: 'unparsed', reason: parse.reason, parsed: null, confidence: null, status: 'pending' });
  }

  const dup = await findDuplicate(db, parse.txn, sms.date);
  return insertSmsMessage(db, {
    ...base,
    key: parse.key,
    body: sms.body,
    result: 'parsed',
    reason: null,
    parsed: parse.txn,
    confidence: parse.confidence,
    status: dup && dup.score >= MERGE_SCORE ? 'duplicate' : 'pending',
    duplicateOf: dup?.of ?? null,
    dupScore: dup?.score ?? null,
  });
}

async function findDuplicate(db: SQLiteDatabase, txn: ParsedSms, at: number): Promise<{ of: string; score: number } | null> {
  let best: { of: string; score: number } | null = null;
  for (const other of await listDedupCandidates(db, at, 72 * HOUR)) {
    if (!other.parsed) continue;
    const score = duplicateScore({ txn, receivedAt: at }, { txn: other.parsed, receivedAt: other.receivedAt });
    // A card's "payment received" never merges away silently: it carries the card side of the transfer.
    const capped = isCardPaymentPair(txn, other.parsed) ? Math.min(score, MERGE_SCORE - 0.01) : score;
    if (capped >= POSSIBLE_SCORE && (!best || capped > best.score)) best = { of: other.id, score: capped };
  }
  if (best) return best;
  if (txn.kind === 'expense' || txn.kind === 'income') {
    const accountId = txn.institution && txn.accountHint ? await getAccountHint(db, txn.institution, txn.accountHint) : null;
    const manual = await findManualMatch(db, txn.kind, txn.amountMinor / 100, txn.date, accountId);
    if (manual) return { of: `txn:${manual}`, score: POSSIBLE_SCORE };
  }
  return null;
}

/** Re-reads unparsed messages after a parser update, so fixes reach them without reading the inbox again. */
export async function reparseStored(db: SQLiteDatabase) {
  for (const m of await listReparseCandidates(db, SMS_PARSER_VERSION)) {
    if (!m.body) continue;
    const parse = parseSms({ sender: m.sender, body: m.body, receivedAt: m.receivedAt });
    await updateSmsParse(db, m.id, {
      result: parse.kind,
      reason: parse.kind === 'parsed' ? null : parse.reason,
      parsed: parse.kind === 'parsed' ? parse.txn : null,
      confidence: parse.kind === 'parsed' ? parse.confidence : null,
      parserVersion: SMS_PARSER_VERSION,
      status: parse.kind === 'ignored' ? 'ignored' : 'pending',
    });
  }
}

export interface SmsSuggestion {
  /** Expense/income account, the card for a card payment, or the bank account for an ATM withdrawal. */
  accountId: string | null;
  /** Card payments: the bank account it was paid from. ATM: the cash account. */
  otherAccountId: string | null;
  categoryId: string | null;
  subcategoryId: string | null;
  /** Everything needed is known and the parse is confident: one tap adds it. */
  ready: boolean;
}

/** Fills in account and category from what the user taught before, then from account names and keywords. */
export async function suggestFor(db: SQLiteDatabase, m: SmsMessage, accounts?: Account[]): Promise<SmsSuggestion> {
  const txn = m.parsed;
  const empty: SmsSuggestion = { accountId: null, otherAccountId: null, categoryId: null, subcategoryId: null, ready: false };
  if (!txn) return empty;
  const list = accounts ?? (await listAccounts(db));

  let accountId: string | null = null;
  if (txn.accountHint) {
    const institution = txn.institution ?? m.senderCode ?? '';
    accountId = await getAccountHint(db, institution, txn.accountHint);
    // An account named "Axis 4821" or "HDFC card ••1234" is clearly the one.
    accountId ??= list.find((a) => a.name.replace(/\D/g, '').endsWith(txn.accountHint!.slice(-4)))?.id ?? null;
  }
  if (accountId && !list.some((a) => a.id === accountId)) accountId = null;

  let otherAccountId: string | null = null;
  if (txn.kind === 'atm') otherAccountId = list.find((a) => a.type === 'cash')?.id ?? null;

  let categoryId: string | null = null;
  let subcategoryId: string | null = null;
  if (txn.kind === 'expense' || txn.kind === 'income') {
    const learned = txn.merchant ? await getMerchantCategory(db, merchantKey(txn.merchant)) : null;
    const guess = learned ?? guessCategory(txn, m.body);
    if (guess) {
      const categories = await listCategories(db, txn.kind);
      const category = categories.find((c) => c.id === guess.categoryId);
      if (category) {
        categoryId = category.id;
        subcategoryId = category.subcategories.some((s) => s.id === guess.subcategoryId) ? guess.subcategoryId : null;
      }
    }
  }

  const confident = (m.confidence ?? 0) >= READY_CONFIDENCE && !m.duplicateOf;
  const ready =
    confident &&
    accountId !== null &&
    (txn.kind === 'card-payment' || txn.kind === 'atm' ? otherAccountId !== null : categoryId !== null);
  return { accountId, otherAccountId, categoryId, subcategoryId, ready };
}

export interface SmsDraft {
  accountId: string | null;
  otherAccountId: string | null;
  categoryId: string | null;
  subcategoryId: string | null;
}

/** The transaction an SMS becomes with the chosen accounts and category, plus what to remember. */
export function buildChoice(m: SmsMessage, draft: SmsDraft): SmsChoice | null {
  const txn = m.parsed;
  if (!txn || !draft.accountId) return null;
  const amount = txn.amountMinor / 100;
  const common = {
    amount,
    date: txn.date,
    time: txn.time,
    isSplit: false,
    splitAmount: null,
    deductMyShare: false,
    source: 'sms' as const,
    sourceRef: m.key,
    paymentApp: null,
    subcategoryId: null,
    categoryId: null,
  };
  let transaction: NewTransaction;
  if (txn.kind === 'card-payment' || txn.kind === 'atm') {
    if (!draft.otherAccountId || draft.otherAccountId === draft.accountId) return null;
    const [from, to] = txn.kind === 'card-payment' ? [draft.otherAccountId, draft.accountId] : [draft.accountId, draft.otherAccountId];
    transaction = {
      ...common,
      type: 'transfer',
      accountId: null,
      fromAccountId: from,
      toAccountId: to,
      note: txn.kind === 'atm' ? 'ATM withdrawal' : 'Card bill payment',
    };
  } else {
    if (!draft.categoryId) return null;
    transaction = {
      ...common,
      type: txn.kind,
      accountId: draft.accountId,
      fromAccountId: null,
      toAccountId: null,
      categoryId: draft.categoryId,
      subcategoryId: txn.kind === 'expense' ? draft.subcategoryId : null,
      note: txn.merchant,
    };
  }
  const institution = txn.institution ?? m.senderCode;
  return {
    transaction,
    hint: txn.accountHint && institution ? { institution, digits: txn.accountHint, accountId: draft.accountId } : null,
    merchant: txn.merchant && draft.categoryId ? { key: merchantKey(txn.merchant), categoryId: draft.categoryId, subcategoryId: draft.subcategoryId } : null,
  };
}

async function tryAutoAdd(db: SQLiteDatabase, m: SmsMessage): Promise<boolean> {
  const suggestion = await suggestFor(db, m);
  if (!suggestion.ready) return false;
  const choice = buildChoice(m, suggestion);
  if (!choice) return false;
  await addSmsTransaction(db, m.id, choice, true);
  return true;
}
