import type { ParsedSms } from './parser';

/**
 * Category suggestions for merchants SpendTrak hasn't learned yet. IDs are the built-in category IDs
 * (`src/constants/categories.ts`); the caller checks they still exist.
 */
export interface CategoryGuess {
  categoryId: string;
  subcategoryId: string | null;
}

const EXPENSE_KEYWORDS: [RegExp, string, string | null][] = [
  [/\b(instamart|blinkit|zepto|bigbasket|dmart|jiomart|grocer|supermarket|kirana|reliance fresh|more retail)\b/i, 'food', 'food_groceries'],
  [/\b(swiggy|zomato|eatsure|faasos|box8)\b/i, 'food', 'food_delivery'],
  [/\b(starbucks|chaayos|cafe|coffee|ccd|third wave)\b/i, 'food', 'food_cafe'],
  [/\b(restaurant|dhaba|kfc|mcdonald|burger king|pizza|domino|biryani|bakery|sweets)\b/i, 'food', 'food_restaurant'],
  [/\b(uber|ola|rapido|namma yatri|bluesmart|meru)\b/i, 'transport', 'transport_taxi'],
  [/\b(petrol|fuel|hpcl|bpcl|iocl|indian oil|bharat petroleum|hindustan petroleum|filling station|shell)\b/i, 'transport', 'transport_fuel'],
  [/\b(fastag|parking)\b/i, 'transport', 'transport_parking'],
  [/\b(irctc|redbus|metro|railway|abhibus|ksrtc|tnstc)\b/i, 'transport', 'transport_public'],
  [/\b(indigo|air india|vistara|akasa|spicejet|makemytrip|goibibo|cleartrip|easemytrip|ixigo)\b/i, 'travel', 'travel_flights'],
  [/\b(oyo|airbnb|booking\.com|treebo|fabhotel)\b/i, 'travel', 'travel_hotel'],
  [/\b(myntra|ajio|zara|h&m|max fashion|pantaloons|westside|trends)\b/i, 'shopping', 'shopping_clothes'],
  [/\b(croma|reliance digital|vijay sales|apple store)\b/i, 'shopping', 'shopping_electronics'],
  [/\b(ikea|pepperfry|urban ladder|home centre)\b/i, 'shopping', 'shopping_home'],
  [/\b(nykaa|purplle|lenskart)\b/i, 'shopping', 'shopping_personal'],
  [/\b(amazon|flipkart|meesho|snapdeal|tata cliq)\b/i, 'shopping', null],
  [/\b(electricity|bescom|tneb|tangedco|msedcl|tata power|adani electricity|power bill|eb bill)\b/i, 'bills', 'bills_electricity'],
  [/\b(water bill|water board|jal board)\b/i, 'bills', 'bills_water'],
  [/\b(airtel|vodafone|vi prepaid|jio recharge|bsnl|act fibernet|broadband|recharge|dth|tata play)\b/i, 'bills', 'bills_internet'],
  [/\b(rent|nobroker|housing\.com)\b/i, 'bills', 'bills_rent'],
  [/\b(insurance|lic|policybazaar|ergo|star health|acko|digit)\b/i, 'bills', 'bills_insurance'],
  [/\b(pharmacy|pharmeasy|netmeds|1mg|medplus|apollo pharmacy|chemist|medical)\b/i, 'health', 'health_pharmacy'],
  [/\b(hospital|clinic|diagnostic|lab|dental|apollo)\b/i, 'health', 'health_medical'],
  [/\b(gym|cult|cultfit|fitness)\b/i, 'health', 'health_gym'],
  [/\b(netflix|spotify|hotstar|prime video|youtube|google|apple\.com|zee5|sonyliv|jiocinema)\b/i, 'entertainment', 'ent_subscriptions'],
  [/\b(bookmyshow|pvr|inox|cinepolis|district)\b/i, 'entertainment', 'ent_movies'],
  [/\b(steam|playstation|xbox|play store)\b/i, 'entertainment', 'ent_games'],
  [/\b(udemy|coursera|unacademy|byju|school|college|tuition)\b/i, 'education', null],
  [/\b(annual fee|late fee|charges|penalty|gst on|finance charge|interest charged)\b/i, 'other', 'other_fees'],
  [/\b(donation|temple|charity|trust)\b/i, 'other', 'other_donations'],
];

/** Guesses a category from the merchant (and, for income, the message wording). */
export function guessCategory(txn: ParsedSms, body: string | null): CategoryGuess | null {
  if (txn.kind === 'income') {
    if (txn.isRefund) return { categoryId: 'income_refund', subcategoryId: null };
    const text = `${txn.merchant ?? ''} ${body ?? ''}`;
    if (/\bsalary|\bsal\b|payroll/i.test(text)) return { categoryId: 'income_salary', subcategoryId: null };
    if (/\b(interest|dividend)\b/i.test(text)) return { categoryId: 'income_investment', subcategoryId: null };
    if (/\bcashback\b/i.test(text)) return { categoryId: 'income_other', subcategoryId: null };
    return null;
  }
  if (txn.kind !== 'expense' || !txn.merchant) return null;
  const hit = EXPENSE_KEYWORDS.find(([re]) => re.test(txn.merchant!));
  return hit ? { categoryId: hit[1], subcategoryId: hit[2] } : null;
}

/** The key merchant → category memory is stored under: "SWIGGY BANGALORE 12345" and "Swiggy" match. */
export function merchantKey(merchant: string): string {
  return merchant
    .toLowerCase()
    .replace(/\d+/g, ' ')
    .replace(/\b(bangalore|bengaluru|mumbai|delhi|chennai|hyderabad|pune|kolkata|india|in)\b/g, ' ')
    .replace(/[^a-z&]+/g, ' ')
    .trim();
}
