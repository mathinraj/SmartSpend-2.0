/**
 * Replaces everything personal in a bank SMS with placeholders before it's reported, keeping the wording
 * (which is what the parser needs). The user still sees and can edit the result before anything is sent.
 */
const STEPS: [RegExp, string | ((...m: string[]) => string)][] = [
  [/https?:\/?\/?\S+|\b[a-z0-9-]+\.(?:bank\.in|co\.in|io|in|com)\/\S*/gi, '{link}'],
  [/\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/gi, '{email}'],
  [/\b[a-z0-9][a-z0-9._*-]{1,63}@[a-z][a-z0-9]{1,20}\b/gi, '{vpa}'],
  [/\b(upi\/(?:dr|cr|p2a|p2m|p2p)\/)\d+\/[^/]+?(?=\s+not you|\/|\s+-\s|$)/gi, '$1{ref}/{payee}'],
  [/\b(imps-\[?)\d+(\]?-[A-Z]{4}-)[X\d*]+-[A-Za-z ]+/gi, '$1{ref}$2{acct}-{payee}'],
  [/\b(dear|hi|hello)\s+(?!customer|client|user|sir|madam|bsnl|sbi|upi|valued|card)[A-Z][A-Za-z.]+(?:\s+[A-Z][A-Za-z.]+)*/gi, '$1 {name}'],
  [/((?:₹|\brs\.?|\binr)\s*)[0-9][0-9,]*(?:\.\d{1,2})?/gi, '$1{amount}'],
  [/\b\d[\d,]*\.\d{1,2}\b/g, '{amount}'],
  [/\b\d{1,2}[-/. ]?(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[-, ]*\d{2,4}\b/gi, '{date}'],
  [/\b\d{4}-\d{1,2}-\d{1,2}\b|\b\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\b/g, '{date}'],
  [/\d{1,2}:\d{2}(?::\d{2})?(?:\s*[ap]m)?\b/gi, '{time}'],
  [/([x*]{1,})\d{2,6}\b/gi, '$1{acct}'],
  [/\b(ending|card|a\/c|acct|account)(\s*(?:no\.?)?\s*)\d{3,6}\b/gi, '$1$2{acct}'],
  // Codes mixing letters and digits: NEFT references, ATM IDs, application numbers.
  [/\b(?=\w*[A-Za-z])(?=\w*\d{3})\w+\b/g, '{ref}'],
  [/\+?\d{8,}/g, '{number}'],
  [/\b\d{3,7}\b/g, '{number}'],
];

export function redactSms(body: string): string {
  let text = body.replace(/\s+/g, ' ').trim();
  for (const [re, replacement] of STEPS) text = text.replace(re, replacement as string);
  return text;
}
