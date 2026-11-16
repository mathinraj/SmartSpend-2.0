import type { SplitEntry } from '@/types/models';

/** How a balance reads from the user's point of view. Positive = they owe you. */
export function balanceSummary(person: string, balance: number, formatted: string): string {
  if (balance > 0) return `${person} owes you ${formatted}`;
  if (balance < 0) return `You owe ${person} ${formatted}`;
  return 'All settled up';
}

export function entryDisplay(entry: SplitEntry): { label: string; emoji: string; sign: '+' | '−' } {
  switch (entry.type) {
    case 'split_paid':
      return { label: 'You paid their share', emoji: '📤', sign: '+' };
    case 'split_owed':
      return { label: 'They paid your share', emoji: '📥', sign: '−' };
    case 'settlement':
      return entry.direction === 'received'
        ? { label: 'They paid you back', emoji: '🤝', sign: '−' }
        : { label: 'You paid them back', emoji: '🤝', sign: '+' };
  }
}
