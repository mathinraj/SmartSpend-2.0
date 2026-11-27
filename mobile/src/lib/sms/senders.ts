/**
 * Indian business SMS senders. Since TRAI's DLT rules they look like `VM-HDFCBK-S`: a 2-letter
 * operator/region prefix, the registered header, and an optional category suffix
 * (S = service, T = transactional, P = promotional, G = government).
 */

export type InstitutionKind = 'bank' | 'card' | 'wallet';

export interface Institution {
  name: string;
  kind: InstitutionKind;
}

export interface SenderInfo {
  /** The registered header, e.g. `HDFCBK`; for non-DLT alphanumeric senders, the whole ID. */
  code: string;
  suffix: 'S' | 'T' | 'P' | 'G' | null;
  /** DLT format (`XX-NAME[-S]`). Only these count for the hard-evidence rule. */
  registered: boolean;
  institution: Institution | null;
  /** A known sender that isn't a bank, card or wallet (broker, telecom, utility): its payment messages duplicate the bank's. */
  nonFinancial: boolean;
}

const DLT = /^[A-Z]{2}-([A-Z0-9]{3,9})(?:-([STPG]))?$/;
const PHONE = /^\+?\d[\d\s-]{5,}$/;

/** Matched by substring against the header, so variants like `HDFCBN` or `SBIUPI` resolve. Longer, more specific codes first. */
const INSTITUTIONS: [code: string, institution: Institution][] = [
  ['BOBCRD', { name: 'BOBCARD', kind: 'card' }],
  ['BOBCARD', { name: 'BOBCARD', kind: 'card' }],
  ['SBICRD', { name: 'SBI Card', kind: 'card' }],
  ['SBICARD', { name: 'SBI Card', kind: 'card' }],
  ['ONECRD', { name: 'OneCard', kind: 'card' }],
  ['ONECARD', { name: 'OneCard', kind: 'card' }],
  ['SLICEIT', { name: 'slice', kind: 'card' }],
  ['UNICRD', { name: 'Uni Card', kind: 'card' }],
  ['AMEXIN', { name: 'American Express', kind: 'card' }],
  ['JIOPBS', { name: 'Jio Payments Bank', kind: 'bank' }],
  ['PAYTMB', { name: 'Paytm Payments Bank', kind: 'bank' }],
  ['AIRBNK', { name: 'Airtel Payments Bank', kind: 'bank' }],
  ['IPBMSG', { name: 'India Post Payments Bank', kind: 'bank' }],
  ['FINOBK', { name: 'Fino Payments Bank', kind: 'bank' }],
  ['HDFC', { name: 'HDFC Bank', kind: 'bank' }],
  ['ICICI', { name: 'ICICI Bank', kind: 'bank' }],
  ['AXIS', { name: 'Axis Bank', kind: 'bank' }],
  ['KOTAK', { name: 'Kotak Mahindra Bank', kind: 'bank' }],
  ['KVBANK', { name: 'Karur Vysya Bank', kind: 'bank' }],
  ['SBI', { name: 'State Bank of India', kind: 'bank' }],
  ['IDFC', { name: 'IDFC FIRST Bank', kind: 'bank' }],
  ['YESBNK', { name: 'Yes Bank', kind: 'bank' }],
  ['INDUS', { name: 'IndusInd Bank', kind: 'bank' }],
  ['FEDBNK', { name: 'Federal Bank', kind: 'bank' }],
  ['FEDFIB', { name: 'Federal Bank', kind: 'bank' }],
  ['CANBNK', { name: 'Canara Bank', kind: 'bank' }],
  ['PNBSMS', { name: 'Punjab National Bank', kind: 'bank' }],
  ['PNB', { name: 'Punjab National Bank', kind: 'bank' }],
  ['BOBTXN', { name: 'Bank of Baroda', kind: 'bank' }],
  ['BOBSMS', { name: 'Bank of Baroda', kind: 'bank' }],
  ['UNIONB', { name: 'Union Bank of India', kind: 'bank' }],
  ['BOIIND', { name: 'Bank of India', kind: 'bank' }],
  ['IOBCHN', { name: 'Indian Overseas Bank', kind: 'bank' }],
  ['INDBNK', { name: 'Indian Bank', kind: 'bank' }],
  ['CENTBK', { name: 'Central Bank of India', kind: 'bank' }],
  ['UCOBNK', { name: 'UCO Bank', kind: 'bank' }],
  ['IDBI', { name: 'IDBI Bank', kind: 'bank' }],
  ['RBLBNK', { name: 'RBL Bank', kind: 'bank' }],
  ['AUBANK', { name: 'AU Small Finance Bank', kind: 'bank' }],
  ['SCBANK', { name: 'Standard Chartered', kind: 'bank' }],
  ['CITIBK', { name: 'Citibank', kind: 'bank' }],
  ['HSBC', { name: 'HSBC', kind: 'bank' }],
  ['DBSBNK', { name: 'DBS Bank', kind: 'bank' }],
  ['BANDHN', { name: 'Bandhan Bank', kind: 'bank' }],
  ['CSBBNK', { name: 'CSB Bank', kind: 'bank' }],
  ['SIBSMS', { name: 'South Indian Bank', kind: 'bank' }],
  ['TMBANK', { name: 'Tamilnad Mercantile Bank', kind: 'bank' }],
  ['CUBANK', { name: 'City Union Bank', kind: 'bank' }],
  ['KTKBNK', { name: 'Karnataka Bank', kind: 'bank' }],
  ['EQUTAS', { name: 'Equitas Bank', kind: 'bank' }],
  ['UJJIVN', { name: 'Ujjivan Bank', kind: 'bank' }],
  ['PHONPE', { name: 'PhonePe', kind: 'wallet' }],
  ['PAYTM', { name: 'Paytm', kind: 'wallet' }],
  ['AMZNPY', { name: 'Amazon Pay', kind: 'wallet' }],
  ['MOBIKW', { name: 'MobiKwik', kind: 'wallet' }],
];

/** Known senders whose messages mention money but duplicate what the bank reports (or aren't payments at all). */
const NON_FINANCIAL = ['ANGONE', 'ZERODH', 'UPSTOX', 'GROWW', 'BSNL', 'AIRTEL', 'JIONET', 'VIIND', 'ACTFBR', 'TATASK', 'TPDDL', 'BESCOM', 'TNEB'];

export function parseSender(address: string): SenderInfo | null {
  const raw = address.trim().toUpperCase();
  if (!raw || PHONE.test(raw)) return null;
  const dlt = DLT.exec(raw);
  const code = dlt ? dlt[1] : raw.replace(/[^A-Z0-9]/g, '');
  if (!code || !/[A-Z]/.test(code)) return null;
  const suffix = (dlt?.[2] as SenderInfo['suffix']) ?? null;
  const institution = INSTITUTIONS.find(([key]) => code.includes(key))?.[1] ?? null;
  return {
    code,
    suffix,
    registered: dlt !== null,
    institution,
    nonFinancial: institution === null && NON_FINANCIAL.some((key) => code.includes(key)),
  };
}

/** Whether an SMS address is a business sender worth reading at all (never a person's phone number). */
export function isBusinessSender(address: string): boolean {
  const info = parseSender(address);
  return info !== null && info.suffix !== 'P';
}
