import { generateId, toDateInputValue } from './helpers';

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toDateInputValue(d);
}

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return toDateInputValue(d);
}

export const SAMPLE_ACCOUNT_IDS = ['acc_hdfc', 'acc_sbi', 'acc_icici_cc', 'acc_hdfc_cc', 'acc_cash', 'acc_paytm'];

export function hasSampleData(accounts) {
  return SAMPLE_ACCOUNT_IDS.some((id) => accounts.some((a) => a.id === id));
}

export function generateSampleData() {
  const accounts = [
    { id: 'acc_hdfc', name: 'HDFC Savings', type: 'bank', subType: 'savings', balance: 45230.50 },
    { id: 'acc_sbi', name: 'SBI Salary', type: 'bank', subType: 'salary', balance: 128500.00 },
    {
      id: 'acc_icici_cc',
      name: 'ICICI Amazon Pay Card',
      type: 'card',
      subType: 'credit',
      balance: -18640.00,
      billingDate: 15,
      dueDate: 5,
      creditLimit: 150000,
    },
    {
      id: 'acc_hdfc_cc',
      name: 'HDFC Millennia Card',
      type: 'card',
      subType: 'credit',
      balance: -11280.00,
      billingDate: 28,
      dueDate: 18,
      creditLimit: 200000,
    },
    { id: 'acc_cash', name: 'Cash in Hand', type: 'cash', balance: 3200.00 },
    { id: 'acc_paytm', name: 'Paytm Wallet', type: 'wallet', balance: 1850.00 },
  ];

  const now = new Date().toISOString();

  const txns = [
    // ─── Month 1: current month (0–29 days ago) ───
    { type: 'expense', amount: 450, accountId: 'acc_paytm', categoryId: 'food', subcategoryId: 'food_delivery', note: 'Swiggy dinner', date: daysAgo(0), paymentApp: 'Paytm' },
    { type: 'expense', amount: 85, accountId: 'acc_cash', categoryId: 'transport', subcategoryId: 'transport_taxi', note: 'Auto to office', date: daysAgo(0) },
    { type: 'income', amount: 75000, accountId: 'acc_sbi', categoryId: 'income_salary', note: 'March Salary', date: daysAgo(1) },
    { type: 'expense', amount: 2340, accountId: 'acc_hdfc', categoryId: 'shopping', subcategoryId: 'shopping_clothes', note: 'Myntra order', date: daysAgo(1) },
    { type: 'transfer', amount: 5000, fromAccountId: 'acc_sbi', toAccountId: 'acc_paytm', note: 'Top up wallet', date: daysAgo(1) },
    { type: 'expense', amount: 180, accountId: 'acc_cash', categoryId: 'food', subcategoryId: 'food_cafe', note: 'Starbucks coffee', date: daysAgo(2) },
    { type: 'expense', amount: 1200, accountId: 'acc_hdfc', categoryId: 'bills', subcategoryId: 'bills_internet', note: 'Jio fiber bill', date: daysAgo(2) },
    { type: 'expense', amount: 3500, accountId: 'acc_icici_cc', categoryId: 'shopping', subcategoryId: 'shopping_electronics', note: 'Amazon - wireless earbuds', date: daysAgo(3), paymentApp: 'Amazon Pay' },
    { type: 'expense', amount: 650, accountId: 'acc_paytm', categoryId: 'food', subcategoryId: 'food_restaurant', note: 'Lunch at Haldirams', date: daysAgo(4), paymentApp: 'Paytm' },
    { type: 'expense', amount: 2800, accountId: 'acc_hdfc_cc', categoryId: 'shopping', subcategoryId: 'shopping_clothes', note: 'Zara shopping', date: daysAgo(5), paymentApp: 'Card Swipe' },
    { type: 'expense', amount: 4500, accountId: 'acc_hdfc', categoryId: 'health', subcategoryId: 'health_gym', note: 'Gym monthly', date: daysAgo(6) },
    { type: 'expense', amount: 350, accountId: 'acc_cash', categoryId: 'transport', subcategoryId: 'transport_fuel', note: 'Petrol', date: daysAgo(7) },
    { type: 'income', amount: 12000, accountId: 'acc_hdfc', categoryId: 'income_freelance', note: 'Logo design project', date: daysAgo(7) },
    { type: 'expense', amount: 8500, accountId: 'acc_icici_cc', categoryId: 'bills', subcategoryId: 'bills_rent', note: 'Room rent share', date: daysAgo(8) },
    { type: 'expense', amount: 250, accountId: 'acc_paytm', categoryId: 'entertainment', subcategoryId: 'ent_subscriptions', note: 'Netflix monthly', date: daysAgo(9) },
    { type: 'expense', amount: 1800, accountId: 'acc_hdfc', categoryId: 'food', subcategoryId: 'food_groceries', note: 'BigBasket groceries', date: daysAgo(10), isSplit: true, splitAmount: 1200, splitSettled: false },
    { type: 'expense', amount: 500, accountId: 'acc_cash', categoryId: 'personal', subcategoryId: 'personal_grooming', note: 'Haircut', date: daysAgo(12) },
    { type: 'transfer', amount: 10000, fromAccountId: 'acc_sbi', toAccountId: 'acc_hdfc', note: 'Monthly transfer', date: daysAgo(14) },
    { type: 'expense', amount: 1500, accountId: 'acc_hdfc', categoryId: 'education', subcategoryId: 'edu_books', note: 'O\'Reilly subscription', date: daysAgo(15) },
    { type: 'expense', amount: 2100, accountId: 'acc_hdfc', categoryId: 'bills', subcategoryId: 'bills_electricity', note: 'Electricity bill', date: daysAgo(18) },
    { type: 'expense', amount: 890, accountId: 'acc_hdfc', categoryId: 'bills', subcategoryId: 'bills_water', note: 'Water bill', date: daysAgo(18) },
    { type: 'expense', amount: 320, accountId: 'acc_cash', categoryId: 'food', subcategoryId: 'food_snacks', note: 'Street food', date: daysAgo(20) },
    { type: 'expense', amount: 1280, accountId: 'acc_icici_cc', categoryId: 'entertainment', subcategoryId: 'ent_movies', note: 'PVR tickets', date: daysAgo(22), isSplit: true, splitAmount: 640, splitSettled: true },

    // ─── Month 2: 30–59 days ago ───
    { type: 'income', amount: 75000, accountId: 'acc_sbi', categoryId: 'income_salary', note: 'February Salary', date: daysAgo(30) },
    { type: 'expense', amount: 8500, accountId: 'acc_icici_cc', categoryId: 'bills', subcategoryId: 'bills_rent', note: 'Room rent share', date: daysAgo(30) },
    { type: 'expense', amount: 1199, accountId: 'acc_hdfc', categoryId: 'bills', subcategoryId: 'bills_internet', note: 'Jio fiber bill', date: daysAgo(32) },
    { type: 'expense', amount: 6800, accountId: 'acc_icici_cc', categoryId: 'travel', subcategoryId: 'travel_flights', note: 'Flight to Goa', date: daysAgo(33), isSplit: true, splitAmount: 3400, splitSettled: false },
    { type: 'expense', amount: 3200, accountId: 'acc_icici_cc', categoryId: 'travel', subcategoryId: 'travel_hotel', note: 'Hotel booking Goa', date: daysAgo(33), isSplit: true, splitAmount: 1600, splitSettled: false },
    { type: 'expense', amount: 2800, accountId: 'acc_cash', categoryId: 'food', subcategoryId: 'food_restaurant', note: 'Goa beach shack dinner', date: daysAgo(34), isSplit: true, splitAmount: 1400, splitSettled: false },
    { type: 'expense', amount: 420, accountId: 'acc_cash', categoryId: 'transport', subcategoryId: 'transport_parking', note: 'Airport parking', date: daysAgo(35) },
    { type: 'expense', amount: 4500, accountId: 'acc_hdfc', categoryId: 'health', subcategoryId: 'health_gym', note: 'Gym monthly', date: daysAgo(36) },
    { type: 'expense', amount: 5200, accountId: 'acc_hdfc_cc', categoryId: 'shopping', subcategoryId: 'shopping_electronics', note: 'Flipkart - new phone case', date: daysAgo(38) },
    { type: 'transfer', amount: 15000, fromAccountId: 'acc_sbi', toAccountId: 'acc_icici_cc', note: 'CC bill payment', date: daysAgo(38) },
    { type: 'expense', amount: 1950, accountId: 'acc_paytm', categoryId: 'food', subcategoryId: 'food_groceries', note: 'Zepto grocery', date: daysAgo(40) },
    { type: 'expense', amount: 15000, accountId: 'acc_hdfc', categoryId: 'bills', subcategoryId: 'bills_insurance', note: 'Health insurance premium', date: daysAgo(42) },
    { type: 'income', amount: 8500, accountId: 'acc_hdfc', categoryId: 'income_investment', note: 'Mutual fund dividend', date: daysAgo(44) },
    { type: 'expense', amount: 3400, accountId: 'acc_icici_cc', categoryId: 'shopping', subcategoryId: 'shopping_personal', note: 'Nykaa order', date: daysAgo(45) },
    { type: 'expense', amount: 750, accountId: 'acc_paytm', categoryId: 'food', subcategoryId: 'food_cafe', note: 'Third Wave Coffee', date: daysAgo(47) },
    { type: 'expense', amount: 2200, accountId: 'acc_hdfc', categoryId: 'bills', subcategoryId: 'bills_electricity', note: 'Electricity bill', date: daysAgo(48) },
    { type: 'expense', amount: 350, accountId: 'acc_cash', categoryId: 'transport', subcategoryId: 'transport_fuel', note: 'Petrol', date: daysAgo(50) },
    { type: 'expense', amount: 1100, accountId: 'acc_hdfc_cc', categoryId: 'entertainment', subcategoryId: 'ent_subscriptions', note: 'YouTube Premium yearly', date: daysAgo(52) },
    { type: 'income', amount: 5000, accountId: 'acc_hdfc', categoryId: 'income_gift', note: 'Birthday gift from uncle', date: daysAgo(55) },
    { type: 'expense', amount: 680, accountId: 'acc_cash', categoryId: 'personal', subcategoryId: 'personal_grooming', note: 'Haircut + beard trim', date: daysAgo(58) },

    // ─── Month 3: 60–89 days ago ───
    { type: 'income', amount: 75000, accountId: 'acc_sbi', categoryId: 'income_salary', note: 'January Salary', date: daysAgo(60) },
    { type: 'expense', amount: 8500, accountId: 'acc_icici_cc', categoryId: 'bills', subcategoryId: 'bills_rent', note: 'Room rent share', date: daysAgo(60) },
    { type: 'expense', amount: 1199, accountId: 'acc_hdfc', categoryId: 'bills', subcategoryId: 'bills_internet', note: 'Jio fiber bill', date: daysAgo(62) },
    { type: 'expense', amount: 12500, accountId: 'acc_hdfc_cc', categoryId: 'shopping', subcategoryId: 'shopping_electronics', note: 'Flipkart Big Sale - headphones', date: daysAgo(63) },
    { type: 'income', amount: 18000, accountId: 'acc_hdfc', categoryId: 'income_freelance', note: 'Website redesign project', date: daysAgo(65) },
    { type: 'expense', amount: 4500, accountId: 'acc_hdfc', categoryId: 'health', subcategoryId: 'health_gym', note: 'Gym monthly', date: daysAgo(66) },
    { type: 'expense', amount: 2400, accountId: 'acc_hdfc', categoryId: 'food', subcategoryId: 'food_groceries', note: 'BigBasket monthly', date: daysAgo(68) },
    { type: 'expense', amount: 550, accountId: 'acc_paytm', categoryId: 'food', subcategoryId: 'food_delivery', note: 'Zomato order', date: daysAgo(70), paymentApp: 'Paytm' },
    { type: 'expense', amount: 9800, accountId: 'acc_icici_cc', categoryId: 'shopping', subcategoryId: 'shopping_clothes', note: 'Winter clearance sale', date: daysAgo(72) },
    { type: 'transfer', amount: 12000, fromAccountId: 'acc_sbi', toAccountId: 'acc_hdfc_cc', note: 'CC bill payment', date: daysAgo(73) },
    { type: 'expense', amount: 2100, accountId: 'acc_hdfc', categoryId: 'bills', subcategoryId: 'bills_electricity', note: 'Electricity bill', date: daysAgo(75) },
    { type: 'expense', amount: 850, accountId: 'acc_hdfc', categoryId: 'bills', subcategoryId: 'bills_water', note: 'Water bill', date: daysAgo(75) },
    { type: 'expense', amount: 1800, accountId: 'acc_icici_cc', categoryId: 'entertainment', subcategoryId: 'ent_movies', note: 'BookMyShow - concert tickets', date: daysAgo(78), isSplit: true, splitAmount: 900, splitSettled: true },
    { type: 'expense', amount: 420, accountId: 'acc_cash', categoryId: 'transport', subcategoryId: 'transport_taxi', note: 'Uber to concert', date: daysAgo(78) },
    { type: 'expense', amount: 250, accountId: 'acc_paytm', categoryId: 'entertainment', subcategoryId: 'ent_subscriptions', note: 'Netflix monthly', date: daysAgo(80) },
    { type: 'expense', amount: 3200, accountId: 'acc_hdfc', categoryId: 'education', subcategoryId: 'edu_courses', note: 'Udemy course bundle', date: daysAgo(82) },
    { type: 'expense', amount: 280, accountId: 'acc_cash', categoryId: 'food', subcategoryId: 'food_snacks', note: 'Tea & samosa', date: daysAgo(85) },
    { type: 'expense', amount: 1600, accountId: 'acc_hdfc_cc', categoryId: 'shopping', subcategoryId: 'shopping_personal', note: 'Amazon - desk organizer', date: daysAgo(87) },

    // ─── Month 4: 90–120 days ago ───
    { type: 'income', amount: 75000, accountId: 'acc_sbi', categoryId: 'income_salary', note: 'December Salary', date: daysAgo(90) },
    { type: 'expense', amount: 8500, accountId: 'acc_icici_cc', categoryId: 'bills', subcategoryId: 'bills_rent', note: 'Room rent share', date: daysAgo(90) },
    { type: 'expense', amount: 1199, accountId: 'acc_hdfc', categoryId: 'bills', subcategoryId: 'bills_internet', note: 'Jio fiber bill', date: daysAgo(92) },
    { type: 'expense', amount: 18000, accountId: 'acc_hdfc_cc', categoryId: 'travel', subcategoryId: 'travel_flights', note: 'Christmas trip flights', date: daysAgo(95), isSplit: true, splitAmount: 9000, splitSettled: true },
    { type: 'expense', amount: 8500, accountId: 'acc_hdfc_cc', categoryId: 'travel', subcategoryId: 'travel_hotel', note: 'Christmas trip hotel', date: daysAgo(95), isSplit: true, splitAmount: 4250, splitSettled: true },
    { type: 'expense', amount: 4200, accountId: 'acc_cash', categoryId: 'food', subcategoryId: 'food_restaurant', note: 'Christmas dinner', date: daysAgo(96), isSplit: true, splitAmount: 2100, splitSettled: false },
    { type: 'income', amount: 25000, accountId: 'acc_hdfc', categoryId: 'income_gift', note: 'Year-end bonus', date: daysAgo(98) },
    { type: 'expense', amount: 4500, accountId: 'acc_hdfc', categoryId: 'health', subcategoryId: 'health_gym', note: 'Gym monthly', date: daysAgo(100) },
    { type: 'expense', amount: 7500, accountId: 'acc_icici_cc', categoryId: 'shopping', subcategoryId: 'shopping_electronics', note: 'Christmas gifts - gadgets', date: daysAgo(102) },
    { type: 'expense', amount: 3800, accountId: 'acc_icici_cc', categoryId: 'shopping', subcategoryId: 'shopping_clothes', note: 'Party outfits', date: daysAgo(104) },
    { type: 'transfer', amount: 20000, fromAccountId: 'acc_sbi', toAccountId: 'acc_icici_cc', note: 'CC bill payment', date: daysAgo(105) },
    { type: 'expense', amount: 2100, accountId: 'acc_hdfc', categoryId: 'bills', subcategoryId: 'bills_electricity', note: 'Electricity bill', date: daysAgo(108) },
    { type: 'expense', amount: 1500, accountId: 'acc_paytm', categoryId: 'food', subcategoryId: 'food_groceries', note: 'Blinkit groceries', date: daysAgo(110) },
    { type: 'expense', amount: 250, accountId: 'acc_paytm', categoryId: 'entertainment', subcategoryId: 'ent_subscriptions', note: 'Netflix monthly', date: daysAgo(112) },
    { type: 'expense', amount: 380, accountId: 'acc_cash', categoryId: 'transport', subcategoryId: 'transport_fuel', note: 'Petrol', date: daysAgo(115) },
    { type: 'income', amount: 10000, accountId: 'acc_hdfc', categoryId: 'income_freelance', note: 'App icon design', date: daysAgo(118) },
    { type: 'expense', amount: 2800, accountId: 'acc_hdfc_cc', categoryId: 'entertainment', subcategoryId: 'ent_gaming', note: 'PS5 game', date: daysAgo(120) },
  ];

  const transactions = txns.map((t) => ({ ...t, id: generateId(), createdAt: now }));

  const today = new Date();

  function getNextDueDate(dueDay) {
    const d = new Date();
    d.setDate(dueDay);
    if (d < today) d.setMonth(d.getMonth() + 1);
    return toDateInputValue(d);
  }

  const plannedPaymentsData = [
    { name: 'ICICI Credit Card Bill', amount: 18640, frequency: 'monthly', nextDate: getNextDueDate(5), accountId: 'acc_sbi', categoryId: 'bills', note: 'Auto-pay from SBI', enabled: true },
    { name: 'HDFC Credit Card Bill', amount: 11280, frequency: 'monthly', nextDate: getNextDueDate(18), accountId: 'acc_hdfc', categoryId: 'bills', note: 'Pay from HDFC Savings', enabled: true },
    { name: 'Netflix Subscription', amount: 649, frequency: 'monthly', nextDate: daysFromNow(5), accountId: 'acc_icici_cc', categoryId: 'entertainment', note: 'Premium plan', enabled: true },
    { name: 'Jio Fiber Internet', amount: 1199, frequency: 'monthly', nextDate: daysFromNow(12), accountId: 'acc_hdfc', categoryId: 'bills', note: '100 Mbps plan', enabled: true },
    { name: 'Room Rent', amount: 8500, frequency: 'monthly', nextDate: daysFromNow(1), accountId: 'acc_sbi', categoryId: 'bills', note: 'Monthly rent share', enabled: true },
    { name: 'Gym Membership', amount: 4500, frequency: 'monthly', nextDate: daysFromNow(18), accountId: 'acc_hdfc', categoryId: 'health', note: 'Cult.fit yearly split', enabled: true },
    { name: 'Electricity Bill', amount: 2100, frequency: 'monthly', nextDate: daysFromNow(8), accountId: 'acc_hdfc', categoryId: 'bills', note: '', enabled: true },
    { name: 'Health Insurance', amount: 15000, frequency: 'quarterly', nextDate: daysFromNow(45), accountId: 'acc_hdfc', categoryId: 'bills', note: 'HDFC Ergo policy', enabled: true },
    { name: 'Spotify Premium', amount: 119, frequency: 'monthly', nextDate: daysFromNow(22), accountId: 'acc_paytm', categoryId: 'entertainment', note: 'Individual plan', enabled: true },
    { name: 'Domain Renewal', amount: 800, frequency: 'yearly', nextDate: daysFromNow(90), accountId: 'acc_hdfc', categoryId: 'bills', note: 'Personal website', enabled: false },
  ];

  const plannedPayments = plannedPaymentsData.map((p) => ({ ...p, id: generateId(), createdAt: now }));

  const splitLedgerData = [
    { type: 'split_paid', person: 'Rajesh', amount: 600, note: 'BigBasket groceries', date: daysAgo(10), isSample: true },
    { type: 'split_paid', person: 'Priya', amount: 600, note: 'BigBasket groceries', date: daysAgo(10), isSample: true },
    { type: 'split_paid', person: 'Rajesh', amount: 640, note: 'PVR tickets', date: daysAgo(22), isSample: true },
    { type: 'split_owed', person: 'Rajesh', amount: 250, note: 'Chai & snacks', date: daysAgo(15), isSample: true },
    { type: 'split_paid', person: 'Rajesh', amount: 3400, note: 'Flight to Goa', date: daysAgo(33), isSample: true },
    { type: 'split_paid', person: 'Priya', amount: 1600, note: 'Hotel booking Goa', date: daysAgo(33), isSample: true },
    { type: 'split_paid', person: 'Rajesh', amount: 1400, note: 'Goa beach dinner', date: daysAgo(34), isSample: true },
    { type: 'split_paid', person: 'Priya', amount: 1400, note: 'Goa beach dinner', date: daysAgo(34), isSample: true },
    { type: 'split_owed', person: 'Priya', amount: 800, note: 'Dinner at restaurant', date: daysAgo(40), isSample: true },
    { type: 'settlement', person: 'Rajesh', amount: 2000, direction: 'received', note: 'GPay settlement', date: daysAgo(5), isSample: true },
    { type: 'split_paid', person: 'Rajesh', amount: 900, note: 'Concert tickets', date: daysAgo(78), isSample: true },
    { type: 'split_paid', person: 'Priya', amount: 9000, note: 'Christmas flights', date: daysAgo(95), isSample: true },
    { type: 'split_paid', person: 'Priya', amount: 4250, note: 'Christmas hotel', date: daysAgo(95), isSample: true },
    { type: 'split_paid', person: 'Rajesh', amount: 2100, note: 'Christmas dinner', date: daysAgo(96), isSample: true },
    { type: 'settlement', person: 'Priya', amount: 5000, direction: 'received', note: 'Bank transfer', date: daysAgo(80), isSample: true },
  ];

  const splitLedger = splitLedgerData.map((e) => ({ ...e, id: generateId(), createdAt: now }));

  return { accounts, transactions, plannedPayments, splitLedger };
}
