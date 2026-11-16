import type { Account, AccountType } from '@/types/models';

const CASH_EMOJI: Record<string, string> = {
  USD: '💵', AUD: '💵', CAD: '💵', SGD: '💵', MXN: '💵',
  EUR: '💶', GBP: '💷', JPY: '💴', CNY: '💴',
};

const TYPE_EMOJI: Record<AccountType, string> = {
  bank: '🏦',
  card: '💳',
  cash: '🪙',
  wallet: '👛',
  custom: '🪙',
};

const TYPE_COLOR: Record<AccountType, string> = {
  bank: '#0984E3',
  card: '#6C5CE7',
  cash: '#00B894',
  wallet: '#E17055',
  custom: '#636E72',
};

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  bank: 'Bank accounts',
  card: 'Cards',
  cash: 'Cash',
  wallet: 'Wallets',
  custom: 'Other',
};

export function accountEmoji(account: Pick<Account, 'type' | 'icon'>, currencyCode: string): string {
  if (account.icon) return account.icon;
  if (account.type === 'cash') return CASH_EMOJI[currencyCode] ?? TYPE_EMOJI.cash;
  return TYPE_EMOJI[account.type];
}

export function accountColor(account: Pick<Account, 'type' | 'color'>): string {
  return account.color ?? TYPE_COLOR[account.type];
}

/** Credit card balances are negative: the amount owed. */
export function isCreditCard(account: Pick<Account, 'type' | 'subType'>): boolean {
  return account.type === 'card' && account.subType === 'credit';
}
