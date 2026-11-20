import type { SQLiteDatabase } from 'expo-sqlite';

import { listAccounts } from '@/db/accounts';
import { addSmsTransaction, getSmsMessage, listSmsReview, markSmsAdded, rememberChoice, type SmsMessage } from '@/db/sms';
import { getTransaction, type NewTransaction } from '@/db/transactions';
import { merchantKey } from '@/lib/sms/categorize';
import { buildChoice, suggestFor, type SmsSuggestion } from '@/lib/sms/ingest';

export interface SmsDuplicateInfo {
  kind: 'sms' | 'txn';
  id: string;
  amount: number;
  label: string;
  date: string;
}

export interface SmsReviewItem {
  message: SmsMessage;
  suggestion: SmsSuggestion;
  duplicate: SmsDuplicateInfo | null;
}

/** The review list with account/category suggestions and what each possible duplicate matches. */
export async function loadSmsReview(db: SQLiteDatabase): Promise<SmsReviewItem[]> {
  const [messages, accounts] = await Promise.all([listSmsReview(db), listAccounts(db)]);
  const items: SmsReviewItem[] = [];
  for (const message of messages) {
    const suggestion = await suggestFor(db, message, accounts);
    let duplicate: SmsDuplicateInfo | null = null;
    if (message.duplicateOf?.startsWith('txn:')) {
      const txn = await getTransaction(db, message.duplicateOf.slice(4));
      if (txn) duplicate = { kind: 'txn', id: txn.id, amount: txn.amount, label: txn.note ?? txn.categoryName ?? 'Transaction', date: txn.date };
    } else if (message.duplicateOf) {
      const other = await getSmsMessage(db, message.duplicateOf);
      if (other?.parsed) {
        duplicate = {
          kind: 'sms',
          id: other.id,
          amount: other.parsed.amountMinor / 100,
          label: other.parsed.merchant ?? other.parsed.institution ?? 'Bank SMS',
          date: other.parsed.date,
        };
      }
    }
    items.push({ message, suggestion, duplicate });
  }
  return items;
}

/** Adds every item that needs nothing more from the user. Returns how many were added. */
export async function addAllReady(db: SQLiteDatabase, items: SmsReviewItem[]): Promise<number> {
  let added = 0;
  for (const item of items) {
    if (item.message.status !== 'pending' || !item.suggestion.ready) continue;
    const choice = buildChoice(item.message, item.suggestion);
    if (!choice) continue;
    await addSmsTransaction(db, item.message.id, choice);
    added += 1;
  }
  return added;
}

/** A prefilled transaction for the full form ("Edit"), from the SMS and its suggestion. */
export async function smsDraft(db: SQLiteDatabase, id: string): Promise<{ message: SmsMessage; draft: Partial<NewTransaction> } | null> {
  const message = await getSmsMessage(db, id);
  const t = message?.parsed;
  if (!message || !t) return null;
  const s = await suggestFor(db, message);
  const base: Partial<NewTransaction> = { amount: t.amountMinor / 100, date: t.date, time: t.time, source: 'sms', sourceRef: message.key };
  let draft: Partial<NewTransaction>;
  if (t.kind === 'card-payment') {
    draft = { ...base, type: 'transfer', fromAccountId: s.otherAccountId, toAccountId: s.accountId, note: 'Card bill payment' };
  } else if (t.kind === 'atm') {
    draft = { ...base, type: 'transfer', fromAccountId: s.accountId, toAccountId: s.otherAccountId, note: 'ATM withdrawal' };
  } else {
    draft = { ...base, type: t.kind, accountId: s.accountId, categoryId: s.categoryId, subcategoryId: s.subcategoryId, note: t.merchant };
  }
  return { message, draft };
}

/** After the full form saved an SMS-based transaction: mark the message added and learn from what was picked. */
export async function finishSmsDraft(db: SQLiteDatabase, message: SmsMessage, transactionId: string) {
  const [txn, t] = [await getTransaction(db, transactionId), message.parsed];
  if (!txn || !t) return;
  const accountId = txn.type === 'transfer' ? (t.kind === 'card-payment' ? txn.toAccountId : txn.fromAccountId) : txn.accountId;
  const institution = t.institution ?? message.senderCode;
  await db.withTransactionAsync(async () => {
    await markSmsAdded(db, message.id, transactionId);
    await rememberChoice(db, {
      hint: t.accountHint && institution && accountId ? { institution, digits: t.accountHint, accountId } : null,
      merchant: t.merchant && txn.categoryId ? { key: merchantKey(t.merchant), categoryId: txn.categoryId, subcategoryId: txn.subcategoryId } : null,
    });
  });
}
