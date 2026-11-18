import type { Transaction } from '@/types/models';

export type BalanceInput = Pick<
  Transaction,
  'type' | 'amount' | 'accountId' | 'fromAccountId' | 'toAccountId' | 'isSplit' | 'splitAmount' | 'deductMyShare'
>;

/** How a transaction changes account balances. Reversing it applies the same deltas negated. */
export function balanceDeltas(t: BalanceInput): [accountId: string, delta: number][] {
  switch (t.type) {
    case 'income':
      return t.accountId ? [[t.accountId, t.amount]] : [];
    case 'expense': {
      const othersPaid = t.isSplit && t.deductMyShare ? (t.splitAmount ?? 0) : 0;
      return t.accountId ? [[t.accountId, -(t.amount - othersPaid)]] : [];
    }
    case 'transfer': {
      const deltas: [string, number][] = [];
      if (t.fromAccountId) deltas.push([t.fromAccountId, -t.amount]);
      if (t.toAccountId) deltas.push([t.toAccountId, t.amount]);
      return deltas;
    }
  }
}
