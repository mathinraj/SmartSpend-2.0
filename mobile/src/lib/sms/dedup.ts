import type { ParsedSms } from './parser';

/**
 * How likely two parsed messages are the same payment (bank SMS + UPI app SMS, or two wordings).
 * 1 = certainly the same, 0 = different. Merge at ≥ MERGE_SCORE; ask the user from POSSIBLE_SCORE.
 */
export const MERGE_SCORE = 0.75;
export const POSSIBLE_SCORE = 0.5;

export interface DedupItem {
  txn: ParsedSms;
  /** Epoch ms the SMS arrived. */
  receivedAt: number;
}

const HOUR = 3_600_000;

function words(text: string | null): Set<string> {
  return new Set((text ?? '').toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2));
}

/** A card's "payment received" and the bank's debit that paid it are one transfer seen from both ends. */
export function isCardPaymentPair(a: ParsedSms, b: ParsedSms): boolean {
  const [card, bank] = a.kind === 'card-payment' ? [a, b] : [b, a];
  return card.kind === 'card-payment' && bank.kind === 'expense' && card.amountMinor === bank.amountMinor;
}

export function duplicateScore(a: DedupItem, b: DedupItem): number {
  const x = a.txn;
  const y = b.txn;
  const gap = Math.abs(a.receivedAt - b.receivedAt);
  if (isCardPaymentPair(x, y)) return gap <= 72 * HOUR ? 0.6 : 0;
  if (x.amountMinor !== y.amountMinor || x.direction !== y.direction || gap > 24 * HOUR) return 0;
  if (x.reference && y.reference) return x.reference === y.reference ? 1 : 0;
  if (x.balanceMinor !== null && y.balanceMinor !== null) return x.balanceMinor === y.balanceMinor ? 1 : 0;

  let score = 0.15;
  if (x.accountHint && y.accountHint) score += x.accountHint === y.accountHint ? 0.25 : -0.5;
  score += gap <= 5 * 60_000 ? 0.45 : gap <= 30 * 60_000 ? 0.3 : gap <= 3 * HOUR ? 0.2 : 0.1;
  const wx = words(x.merchant);
  const wy = words(y.merchant);
  if (wx.size && wy.size) {
    const shared = [...wx].filter((w) => wy.has(w)).length;
    score += shared / Math.min(wx.size, wy.size) >= 0.5 ? 0.2 : -0.1;
  }
  // Banks don't send the same alert twice in different words: a repeat is more likely two real payments.
  if (x.institution && x.institution === y.institution) score -= 0.45;
  return Math.max(0, Math.min(1, Math.round(score * 100) / 100));
}
