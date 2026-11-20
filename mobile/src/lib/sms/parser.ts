import { parseSender, type InstitutionKind } from './senders';

/**
 * Reads one bank SMS into a transaction suggestion. Pure (no React Native), so `node:test` runs it
 * against the fixtures in `fixtures.ts`. Strict about *what* counts as a completed transaction, lenient
 * about *how* it's phrased; banks reword their messages often.
 */

/** Bump when parsing changes, so stored unparsed messages are read again once. */
export const SMS_PARSER_VERSION = 1;

export type IgnoreReason =
  | 'personal'
  | 'promotion'
  | 'not-financial'
  | 'otp'
  | 'scam'
  | 'request'
  | 'failed'
  | 'future-debit'
  | 'mandate-setup'
  | 'blocked'
  | 'statement'
  | 'offer'
  | 'balance'
  | 'not-transaction';

export type UnparsedReason = 'no-amount' | 'no-direction' | 'foreign-currency';

export type SmsTxnKind = 'expense' | 'income' | 'card-payment' | 'atm';

export type PaymentMode = 'upi' | 'card' | 'atm' | 'neft' | 'imps' | 'rtgs' | 'netbanking' | 'wallet' | 'other';

export interface ParsedSms {
  kind: SmsTxnKind;
  direction: 'debit' | 'credit';
  /** Whole paise. */
  amountMinor: number;
  institution: string | null;
  institutionKind: InstitutionKind | null;
  /** Last 3–6 digits of the account or card the message is about. */
  accountHint: string | null;
  accountIsCard: boolean;
  mode: PaymentMode;
  merchant: string | null;
  /** A person rather than a business (UPI P2A, IMPS to a name). */
  toPerson: boolean;
  vpa: string | null;
  reference: string | null;
  /** Balance after the transaction, in paise, when the message states it. */
  balanceMinor: number | null;
  /** `YYYY-MM-DD` and `HH:mm`, from the text when present, else from the SMS time. */
  date: string;
  time: string | null;
  isRefund: boolean;
  /** Hard evidence that money moved: registered sender + 12-digit reference + settlement word. */
  settled: boolean;
}

export type SmsParseResult =
  | { kind: 'parsed'; txn: ParsedSms; confidence: number; key: string }
  | { kind: 'ignored'; reason: IgnoreReason }
  | { kind: 'unparsed'; reason: UnparsedReason; key: string };

export interface SmsInput {
  sender: string;
  body: string;
  /** Epoch milliseconds the phone received the SMS. */
  receivedAt: number;
}

/** Confidence at or above which an item can be added with one tap. */
export const READY_CONFIDENCE = 0.7;

const AMOUNT = /(?:₹|\brs\.?|\binr)\s*([0-9][0-9,]*(?:\.\d{1,2})?)/gi;
// SBI's UPI alerts omit the currency: "debited by 150.0".
const BARE_AMOUNT = /\b(?:debited|credited)\s+(?:by|with|for)\s+([0-9][0-9,]*(?:\.\d{1,2})?)\b/i;
const FOREIGN = /\b(usd|eur|gbp|aed|qar|sar|sgd|aud|cad|jpy|chf|thb|myr|omr|kwd|bhd|nzd|hkd|cny|lkr|npr)\s*[0-9][0-9,]*(?:\.\d+)?/i;
const NOT_AMOUNT_BEFORE = /(?:bal(?:ance)?|limit|outstanding|avl|available|due|fee|min(?:imum)?|total)\b[^0-9]{0,12}$/i;

const DEBIT_VERB = /\b(debited|debit(?!\s*card)|spent|paid|sent|withdrawn|withdrawal|purchase|deducted|charged|transferred)\b/gi;
const CREDIT_VERB = /\b(credited|received|deposited|refunded|refund|reversed|reversal)\b/gi;
const SETTLE_WORD = /\b(credited|debited|debit|credit|sent|received|paid|spent)\b/i;
const SETTLE_REF = /\b(?:rrn|utr|ref(?:erence)?|upi|imps|neft)\b.{0,12}?(?:^|[^\d])\d{12}(?!\d)/i;

const RULES: [IgnoreReason, RegExp][] = [
  ['otp', /\b(otp|one[\s-]?time[\s-]?password|verification code|security code|passcode)\b/i],
  ['scam', /\bkyc\b.{0,60}\b(update|expir|suspend|block)|\b(lottery|lucky draw|you have won|prize money)\b|enter (?:your )?(?:upi )?pin to (?:receive|get)/i],
  ['request', /\b(has requested|have requested|requested (?:rs|inr|₹|money|payment)|collect request|payment request|is requesting)\b/i],
  ['failed', /\b(failed|declined|unsuccessful|insufficient (?:funds|balance)|could not be processed|was not successful|timed out)\b/i],
  ['future-debit', /\bwill be (?:auto[\s-]?)?debited\b|\bupcoming payment\b|\bscheduled (?:for|on)\b|\bdue for (?:auto)?debit\b|\bwill be deducted\b/i],
  ['mandate-setup', /\b(mandate|autopay|auto[\s-]pay|e-?mandate|standing instruction)\b.{0,80}\b(created|registered|set ?up|activated|modified|revoked|cancelled|paused)\b/i],
  ['blocked', /\b(asba|ipo)\b|\bamount (?:of [^.]{0,30})?(?:is |has been )?blocked\b|\blien marked\b/i],
];

const STATEMENT = /\bstatement\b.{0,60}\b(generated|is sent|sent to|is ready)\b|\b(min(?:imum)?\.?\s*(?:amt|amount)\s*due|total (?:amt|amount) due|minimum of (?:rs|inr|₹)|is due (?:by|on)|due by|due on|please ignore if paid|bill (?:of [^.]{0,30})?is due)\b/i;
const OFFER = /\b(offer|cashback offer|voucher|coupon|reward points?|pre[\s-]?approved|loan of up ?to|eligible for|apply now|limited period|congratulations|rummy|betting|jackpot|emi conversion|convert (?:it |this |the )?(?:in)?to emi)\b/i;
const BALANCE_ONLY = /\b(?:balance|bal)\b.{0,40}\b(?:is|as of|as on)\b|\bis the balance\b|\bavailable balance (?:in|of)\b/i;
const CARD_PAYMENT = /\bpayment of\b.{0,40}\b(?:has been )?received\b.{0,40}\b(?:towards|on|for|in)\b.{0,30}\b(?:credit card|card|bobcard)\b|\bpayment\b.{0,40}\breceived (?:towards|for|on) your\b.{0,40}\bcard\b|\bcredit card (?:bill )?payment\b.{0,40}\b(?:received|successful|credited)\b/i;
const REFUND = /\b(refund(?:ed)?|reversed|reversal)\b/i;

export function parseSms(input: SmsInput): SmsParseResult {
  const sender = parseSender(input.sender);
  if (!sender) return { kind: 'ignored', reason: 'personal' };
  if (sender.suffix === 'P') return { kind: 'ignored', reason: 'promotion' };
  if (sender.nonFinancial) return { kind: 'ignored', reason: 'not-financial' };

  const body = input.body.replace(/\s+/g, ' ').trim();
  const key = messageKey(body);

  const settled = sender.registered && SETTLE_REF.test(body) && SETTLE_WORD.test(body);
  const isRefund = REFUND.test(body);
  for (const [reason, rule] of RULES) {
    if (!rule.test(body)) continue;
    // "Refund for your failed transaction credited" is money coming back, not a failure.
    if (reason === 'failed' && isRefund && /\bcredited\b/i.test(body)) continue;
    return { kind: 'ignored', reason };
  }
  const cardPayment = CARD_PAYMENT.test(body);
  const verb = firstVerb(body);
  if (!settled && !cardPayment) {
    if (STATEMENT.test(body)) return { kind: 'ignored', reason: 'statement' };
    if (OFFER.test(body)) return { kind: 'ignored', reason: 'offer' };
    if (BALANCE_ONLY.test(body) && !verb) return { kind: 'ignored', reason: 'balance' };
  }

  const foreign = FOREIGN.exec(body);
  if (foreign && (!verb || foreign.index < verb.index + 60) && !firstAmount(body)) {
    return { kind: 'unparsed', reason: 'foreign-currency', key };
  }
  if (!verb && !cardPayment) {
    return firstAmount(body) && /\b(txn|transaction)\b/i.test(body)
      ? { kind: 'unparsed', reason: 'no-direction', key }
      : { kind: 'ignored', reason: 'not-transaction' };
  }

  const anchor = verb?.index ?? 0;
  const amountMinor = pickAmount(body, anchor);
  if (amountMinor === null) {
    return /\b(a\/c|acct|account|card|upi|txn|transaction)\b/i.test(body)
      ? { kind: 'unparsed', reason: 'no-amount', key }
      : { kind: 'ignored', reason: 'not-transaction' };
  }

  const direction: ParsedSms['direction'] = cardPayment || isRefund ? 'credit' : (verb?.direction ?? 'debit');
  const account = findAccount(body);
  const reference = findReference(body);
  const counterparty = findCounterparty(body, direction);
  const vpa = findVpa(body);
  const when = findDateTime(body, input.receivedAt);
  const mode = findMode(body, account?.isCard ?? false);
  const kind: SmsTxnKind = cardPayment ? 'card-payment' : mode === 'atm' && direction === 'debit' ? 'atm' : direction === 'debit' ? 'expense' : 'income';

  const txn: ParsedSms = {
    kind,
    direction,
    amountMinor,
    institution: sender.institution?.name ?? null,
    institutionKind: sender.institution?.kind ?? null,
    accountHint: account?.digits ?? null,
    accountIsCard: account?.isCard ?? (sender.institution?.kind === 'card' || /\bcredit card\b/i.test(body)),
    mode,
    merchant: counterparty?.name ?? null,
    toPerson: counterparty?.person ?? false,
    vpa,
    reference,
    balanceMinor: findBalance(body),
    date: when.date,
    time: when.time,
    isRefund,
    settled,
  };
  return { kind: 'parsed', txn, confidence: confidenceOf(txn, when.fromText), key: reference ? `${direction}:ref:${reference}` : key };
}

/** Identifies a message regardless of which sender ID delivered it: banks send one alert from several headers. */
export function messageKey(body: string): string {
  return `body:${body.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
}

function confidenceOf(t: ParsedSms, dateFromText: boolean): number {
  let score = 0.45;
  if (t.institution) score += 0.2;
  if (t.accountHint) score += 0.15;
  if (t.reference) score += 0.1;
  if (t.merchant || t.kind !== 'expense') score += 0.1;
  if (dateFromText) score += 0.05;
  if (!t.institution && !t.accountHint && !t.reference) score -= 0.2;
  return Math.max(0, Math.min(1, Math.round(score * 100) / 100));
}

interface Verb {
  index: number;
  direction: 'debit' | 'credit';
}

function firstVerb(body: string): Verb | null {
  const debit = matchAll(DEBIT_VERB, body)[0];
  const credit = matchAll(CREDIT_VERB, body)[0];
  if (!debit && !credit) return null;
  if (debit && (!credit || debit.index <= credit.index)) return { index: debit.index, direction: 'debit' };
  return { index: credit!.index, direction: 'credit' };
}

function matchAll(re: RegExp, text: string): RegExpExecArray[] {
  re.lastIndex = 0;
  const out: RegExpExecArray[] = [];
  for (let m = re.exec(text); m; m = re.exec(text)) out.push(m);
  return out;
}

function toMinor(text: string): number | null {
  const value = Number(text.replace(/,/g, ''));
  return Number.isFinite(value) && value > 0 ? Math.round(value * 100) : null;
}

function firstAmount(body: string): number | null {
  for (const m of matchAll(AMOUNT, body)) {
    const minor = toMinor(m[1]);
    if (minor !== null) return minor;
  }
  return null;
}

/** The amount nearest the transaction verb, skipping balances, limits and dues. */
function pickAmount(body: string, anchor: number): number | null {
  let best: { minor: number; distance: number } | null = null;
  for (const m of matchAll(AMOUNT, body)) {
    if (NOT_AMOUNT_BEFORE.test(body.slice(Math.max(0, m.index - 30), m.index))) continue;
    const minor = toMinor(m[1]);
    if (minor === null) continue;
    const distance = Math.abs(m.index - anchor);
    if (!best || distance < best.distance) best = { minor, distance };
  }
  if (best) return best.minor;
  const bare = BARE_AMOUNT.exec(body);
  return bare ? toMinor(bare[1]) : null;
}

function findAccount(body: string): { digits: string; isCard: boolean } | null {
  const candidates: { index: number; digits: string; isCard: boolean }[] = [];
  const patterns: [RegExp, boolean][] = [
    [/\b(?:a\/c|acct|account|ac\b)[^0-9]{0,15}?[x*]+\s?(\d{3,6})\b/i, false],
    [/\b(?:a\/c|acct|account)\s*(?:no\.?)?\s*(\d{4})\b/i, false],
    [/card\b[^0-9]{0,25}?(?:[x*]+\s?|ending\s+|no\.?\s*)?(\d{4})\b/i, true],
    [/\bfrom\s+[x*]+(\d{3,6})\b/i, false],
  ];
  for (const [re, isCard] of patterns) {
    const m = re.exec(body);
    if (m) candidates.push({ index: m.index, digits: m[1], isCard });
  }
  candidates.sort((a, b) => a.index - b.index);
  return candidates[0] ?? null;
}

function findReference(body: string): string | null {
  const m =
    /\bupi\/(?:dr|cr|p2a|p2m|p2p)\/(\d{8,22})/i.exec(body) ??
    /\bneft\/([A-Z0-9]{8,22})/i.exec(body) ??
    /\bimps[-\s]*\[(\d{8,22})\]/i.exec(body) ??
    /\bupi[:\s]+(\d{12})\b/i.exec(body) ??
    /\b(?:upi\s*ref(?:erence)?|rrn|utr|ref(?:erence)?)\.?\s*(?:no\.?|number)?\s*[:\-]?\s*([A-Z0-9]*\d[A-Z0-9]{7,21})\b/i.exec(body);
  return m ? m[1].toUpperCase() : null;
}

function findVpa(body: string): string | null {
  const m = /\b([a-z0-9][a-z0-9._-]{1,63}@[a-z][a-z0-9]{1,20})\b/i.exec(body);
  return m && !/\.(?:com|in|co|net|org)$/i.test(m[1]) ? m[1].toLowerCase() : null;
}

const STOP_AFTER = /\s+(?:not you|on\s|at\s|for\s|from\s|ref|avl|available|info|if not|-\s|\(|thru|through|via|using)|[.,;](?:\s|$)|\s*$/i;

function cleanCapture(raw: string): string {
  const cut = STOP_AFTER.exec(raw);
  return (cut ? raw.slice(0, cut.index) : raw).trim();
}

function findCounterparty(body: string, direction: 'debit' | 'credit'): { name: string; person: boolean } | null {
  const upi = /\bupi\/(dr|cr|p2a|p2m|p2p)\/\d+\/([^/]+?)(?:\s+not you|\/|\s+-\s|$)/i.exec(body);
  if (upi) {
    const name = cleanMerchant(upi[2], false);
    if (name) return { name, person: /p2a|p2p/i.test(upi[1]) };
  }
  const neft = /\b(?:neft|rtgs)\/[A-Z0-9]+\/([A-Za-z][A-Za-z0-9 &.]*?)(?=\.|\s|$)/i.exec(body);
  if (neft) return { name: cleanMerchant(neft[1], false) ?? neft[1], person: false };
  const imps = /\bimps-\[?\d+\]?-[A-Z]{4}-[X\d*]+-([A-Za-z][A-Za-z ]+?)(?:\.|,|$)/i.exec(body);
  if (imps) return { name: titleCase(imps[1].trim()), person: true };
  // ICICI: "Acct XX123 debited for Rs 199.00 on 06-Nov-26; NETFLIX credited."
  const payeeCredited = direction === 'debit' ? /;\s*([A-Za-z][\w&'. -]{1,40}?)\s+credited\b/i.exec(body) : null;
  if (payeeCredited) {
    const name = cleanMerchant(payeeCredited[1], true);
    if (name) return { name, person: false };
  }

  const patterns: RegExp[] =
    direction === 'debit'
      ? [
          /\btowards\s+(?!your\b)([A-Za-z][\w&'.\- ]{1,60})/i,
          /\bat\s+(?!\d)([A-Za-z][\w&'.\- ]{1,60})/i,
          /\bto\s+(?!(?:your|you|a\/c|ac|account|mobile|\+?\d)\b)([A-Za-z][\w&'.@\- ]{1,60})/i,
          /\bon\s+(?!(?:your|the|\d))([A-Za-z][\w&'.\- ]{1,60})/i,
        ]
      : [/\bfrom\s+(?!(?:your|a\/c|ac|account|mobile|\+?\d|x+\d)\b)([A-Za-z][\w&'.\- ]{1,60})/i, /\bby\s+(?!(?:a\/c|ac|account|mobile|rs|inr|\d))([A-Za-z][\w&'.\- ]{1,60})/i];
  for (const re of patterns) {
    const m = re.exec(body);
    if (!m) continue;
    const name = cleanMerchant(cleanCapture(m[1]), true);
    if (name) return { name, person: false };
  }
  return null;
}

const MERCHANT_NOISE = /\b(?:pvt|private|ltd|limited|llp|india|technologies|services|ipg|txn|pos)\b\.?/gi;
const BRANDS: [RegExp, string][] = [
  [/\binstamart\b/i, 'Swiggy Instamart'],
  [/\b(bundl|swiggy)\b/i, 'Swiggy'],
  [/\b(eternal|zomato)\b/i, 'Zomato'],
  [/\b(one97|paytm)\b/i, 'Paytm'],
  [/\b(amzn|amazon)\b/i, 'Amazon'],
  [/\bflipkart\b/i, 'Flipkart'],
  [/\b(ani technologies|olacabs)\b/i, 'Ola'],
  [/\buber\b/i, 'Uber'],
  [/\b(dreamplug|cred)\b/i, 'CRED'],
  [/\b(grofers|blinkit)\b/i, 'Blinkit'],
  [/\b(kiranakart|zepto)\b/i, 'Zepto'],
  [/\b(supermarket grocery|bigbasket)\b/i, 'BigBasket'],
  [/\bgoogle\b/i, 'Google'],
  [/\bnetflix\b/i, 'Netflix'],
  [/\bspotify\b/i, 'Spotify'],
  [/\birctc\b/i, 'IRCTC'],
  [/\bmyntra\b/i, 'Myntra'],
  [/\bredbus\b/i, 'redBus'],
];

/** Tidies a merchant as banks print it ("Upi-swiggy Instamart P", "BUNDL TECHNOLOGIES") into a display name. */
export function cleanMerchant(raw: string, business: boolean): string | null {
  let name = raw.replace(/^(?:upi|pos|vps|ecom|bil|ib|mb)[-/\s]+/i, '').replace(MERCHANT_NOISE, ' ');
  name = name.replace(/\b\d{4,}\b/g, ' ').replace(/[*_]+/g, ' ').replace(/\s+/g, ' ').trim();
  // Banks cut merchant names at a fixed width, often leaving a stray letter.
  if (business) name = name.replace(/\s+[A-Za-z]$/, '').trim();
  if (name.length < 2 || /^(?:the|your|a|an|you)$/i.test(name)) return null;
  return BRANDS.find(([re]) => re.test(name))?.[1] ?? titleCase(name);
}

function titleCase(text: string): string {
  if (text !== text.toUpperCase() && text !== text.toLowerCase()) return text;
  return text
    .split(' ')
    .map((w) => (w.length <= 3 && w === w.toUpperCase() && /[A-Z]/.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join(' ');
}

function findBalance(body: string): number | null {
  const m = /\b(?:avl\.?\s*bal(?:ance)?|available bal(?:ance)?|bal(?:ance)?)\s*[:\-.]?\s*(?:is\s*)?(?:rs\.?|inr|₹)\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i.exec(body);
  return m ? toMinor(m[1]) : null;
}

function findMode(body: string, isCard: boolean): PaymentMode {
  if (/\b(atm|cash withdrawal|withdrawn at|cash wdl|atm wdl)\b/i.test(body)) return 'atm';
  if (/\bupi\b|@[a-z]{2,}\b|\bvpa\b/i.test(body)) return 'upi';
  if (/\bimps\b/i.test(body)) return 'imps';
  if (/\bneft\b/i.test(body)) return 'neft';
  if (/\brtgs\b/i.test(body)) return 'rtgs';
  if (isCard) return 'card';
  if (/\b(net ?banking|netbanking)\b/i.test(body)) return 'netbanking';
  if (/\bwallet\b/i.test(body)) return 'wallet';
  return 'other';
}

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function fullYear(y: number): number {
  return y < 100 ? 2000 + y : y;
}

/** The transaction date and time from the text when present and plausible, else the SMS time. */
export function findDateTime(body: string, receivedAt: number): { date: string; time: string | null; fromText: boolean } {
  const received = new Date(receivedAt);
  const fallback = { date: `${received.getFullYear()}-${pad(received.getMonth() + 1)}-${pad(received.getDate())}`, time: `${pad(received.getHours())}:${pad(received.getMinutes())}`, fromText: false };

  let y = 0;
  let m = 0;
  let d = 0;
  const iso = /\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/.exec(body);
  const named = matchAll(/\b(\d{1,2})[\s-]?([A-Za-z]{3})[a-z]*[\s,-]*(\d{2,4})\b/g, body).find((x) => MONTHS[x[2].toLowerCase()]);
  const numeric = /\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/.exec(body);
  if (iso) [y, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  else if (named) [d, m, y] = [Number(named[1]), MONTHS[named[2].toLowerCase()], fullYear(Number(named[3]))];
  else if (numeric) [d, m, y] = [Number(numeric[1]), Number(numeric[2]), fullYear(Number(numeric[3]))];
  if (!y || m < 1 || m > 12 || d < 1 || d > 31) return fallback;
  const parsed = new Date(y, m - 1, d);
  const days = (parsed.getTime() - new Date(received.getFullYear(), received.getMonth(), received.getDate()).getTime()) / 86_400_000;
  if (days > 1 || days < -400) return fallback;

  const date = `${y}-${pad(m)}-${pad(d)}`;
  const t = /\b(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?\b/i.exec(body);
  let time: string | null = null;
  if (t) {
    let h = Number(t[1]);
    if (t[3]) h = (h % 12) + (/pm/i.test(t[3]) ? 12 : 0);
    if (h < 24 && Number(t[2]) < 60) time = `${pad(h)}:${t[2]}`;
  }
  if (!time && date === fallback.date) time = fallback.time;
  return { date, time, fromText: true };
}
