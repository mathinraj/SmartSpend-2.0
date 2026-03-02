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
    { id: 'acc_hdfc', name: 'HDFC Savings', type: 'bank', balance: 45230.50 },
    { id: 'acc_sbi', name: 'SBI Salary', type: 'bank', balance: 128500.00 },
    { 
      id: 'acc_icici_cc', 
      name: 'ICICI Credit Card', 
      type: 'card', 
      balance: -12340.00,
      billingDate: 15,
      dueDate: 5,
      creditLimit: 150000
    },
    { 
      id: 'acc_hdfc_cc', 
      name: 'HDFC Millennia Card', 
      type: 'card', 
      balance: -8750.00,
      billingDate: 28,
      dueDate: 18,
      creditLimit: 200000
    },
    { id: 'acc_cash', name: 'Cash in Hand', type: 'cash', balance: 3200.00 },
    { id: 'acc_paytm', name: 'Paytm Wallet', type: 'wallet', balance: 1850.00 },
  ];

  const now = new Date().toISOString();
  const txns = [
    { type: 'expense', amount: 450, accountId: 'acc_paytm', categoryId: 'food', subcategoryId: 'food_delivery', note: 'Swiggy dinner', date: daysAgo(0) },
    { type: 'expense', amount: 85, accountId: 'acc_cash', categoryId: 'transport', subcategoryId: 'transport_taxi', note: 'Auto to office', date: daysAgo(0) },
    { type: 'income', amount: 75000, accountId: 'acc_sbi', categoryId: 'income_salary', note: 'February Salary', date: daysAgo(1) },
    { type: 'expense', amount: 2340, accountId: 'acc_hdfc', categoryId: 'shopping', subcategoryId: 'shopping_clothes', note: 'Myntra order', date: daysAgo(1) },
    { type: 'transfer', amount: 5000, fromAccountId: 'acc_sbi', toAccountId: 'acc_paytm', note: 'Top up wallet', date: daysAgo(1) },
    { type: 'expense', amount: 180, accountId: 'acc_cash', categoryId: 'food', subcategoryId: 'food_cafe', note: 'Starbucks coffee', date: daysAgo(2) },
    { type: 'expense', amount: 1200, accountId: 'acc_hdfc', categoryId: 'bills', subcategoryId: 'bills_internet', note: 'Jio fiber bill', date: daysAgo(2) },
    { type: 'expense', amount: 3500, accountId: 'acc_icici_cc', categoryId: 'shopping', subcategoryId: 'shopping_electronics', note: 'Amazon - wireless earbuds', date: daysAgo(3), paymentApp: 'Amazon Pay' },
    { type: 'expense', amount: 650, accountId: 'acc_paytm', categoryId: 'food', subcategoryId: 'food_restaurant', note: 'Lunch at Haldirams', date: daysAgo(3), paymentApp: 'Paytm' },
    { type: 'expense', amount: 2800, accountId: 'acc_hdfc_cc', categoryId: 'shopping', subcategoryId: 'shopping_clothes', note: 'Zara shopping', date: daysAgo(4), paymentApp: 'Card Swipe' },
    { type: 'expense', amount: 4500, accountId: 'acc_hdfc', categoryId: 'health', subcategoryId: 'health_gym', note: 'Gym monthly', date: daysAgo(5) },
    { type: 'expense', amount: 350, accountId: 'acc_cash', categoryId: 'transport', subcategoryId: 'transport_fuel', note: 'Petrol', date: daysAgo(5) },
    { type: 'income', amount: 12000, accountId: 'acc_hdfc', categoryId: 'income_freelance', note: 'Logo design project', date: daysAgo(5) },
    { type: 'expense', amount: 8500, accountId: 'acc_icici_cc', categoryId: 'bills', subcategoryId: 'bills_rent', note: 'Room rent share', date: daysAgo(7) },
    { type: 'expense', amount: 250, accountId: 'acc_paytm', categoryId: 'entertainment', subcategoryId: 'ent_subscriptions', note: 'Netflix monthly', date: daysAgo(7) },
    { type: 'expense', amount: 1800, accountId: 'acc_hdfc', categoryId: 'food', subcategoryId: 'food_groceries', note: 'BigBasket groceries', date: daysAgo(10) },
    { type: 'expense', amount: 500, accountId: 'acc_cash', categoryId: 'personal', subcategoryId: 'personal_grooming', note: 'Haircut', date: daysAgo(10) },
    { type: 'transfer', amount: 10000, fromAccountId: 'acc_sbi', toAccountId: 'acc_hdfc', note: 'Monthly transfer', date: daysAgo(10) },
    { type: 'expense', amount: 2200, accountId: 'acc_icici_cc', categoryId: 'entertainment', subcategoryId: 'ent_movies', note: 'PVR IMAX tickets', date: daysAgo(14), paymentApp: 'Card Swipe' },
    { type: 'expense', amount: 750, accountId: 'acc_paytm', categoryId: 'food', subcategoryId: 'food_snacks', note: 'Movie snacks', date: daysAgo(14), paymentApp: 'Paytm' },
    { type: 'expense', amount: 5200, accountId: 'acc_hdfc_cc', categoryId: 'shopping', subcategoryId: 'shopping_electronics', note: 'Flipkart - new phone', date: daysAgo(15), paymentApp: 'Net Banking' },
    { type: 'expense', amount: 1500, accountId: 'acc_hdfc', categoryId: 'education', subcategoryId: 'edu_books', note: 'Programming books', date: daysAgo(18) },
    { type: 'income', amount: 5000, accountId: 'acc_hdfc', categoryId: 'income_gift', note: 'Birthday gift from uncle', date: daysAgo(18) },
    { type: 'expense', amount: 6800, accountId: 'acc_icici_cc', categoryId: 'travel', subcategoryId: 'travel_flights', note: 'Flight to Goa', date: daysAgo(22) },
    { type: 'expense', amount: 3200, accountId: 'acc_icici_cc', categoryId: 'travel', subcategoryId: 'travel_hotel', note: 'Hotel booking Goa', date: daysAgo(22) },
    { type: 'expense', amount: 420, accountId: 'acc_cash', categoryId: 'transport', subcategoryId: 'transport_parking', note: 'Airport parking', date: daysAgo(25) },
    { type: 'income', amount: 75000, accountId: 'acc_sbi', categoryId: 'income_salary', note: 'January Salary', date: daysAgo(25) },
    { type: 'expense', amount: 2100, accountId: 'acc_hdfc', categoryId: 'bills', subcategoryId: 'bills_electricity', note: 'Electricity bill', date: daysAgo(30) },
    { type: 'expense', amount: 890, accountId: 'acc_hdfc', categoryId: 'bills', subcategoryId: 'bills_water', note: 'Water bill', date: daysAgo(30) },
    { type: 'expense', amount: 1950, accountId: 'acc_paytm', categoryId: 'food', subcategoryId: 'food_groceries', note: 'Zepto grocery', date: daysAgo(35) },
    { type: 'expense', amount: 15000, accountId: 'acc_hdfc', categoryId: 'bills', subcategoryId: 'bills_insurance', note: 'Health insurance premium', date: daysAgo(35) },
    { type: 'income', amount: 8500, accountId: 'acc_hdfc', categoryId: 'income_investment', note: 'Mutual fund dividend', date: daysAgo(40) },
    { type: 'expense', amount: 3400, accountId: 'acc_icici_cc', categoryId: 'shopping', subcategoryId: 'shopping_personal', note: 'Nykaa order', date: daysAgo(40) },
  ];

  const transactions = txns.map((t) => ({ ...t, id: generateId(), createdAt: now }));

  const today = new Date();
  const currentDay = today.getDate();

  const iciciDueDay = 5;
  const hdfcDueDay = 18;
  
  function getNextDueDate(dueDay) {
    const d = new Date();
    d.setDate(dueDay);
    if (d < today) {
      d.setMonth(d.getMonth() + 1);
    }
    return toDateInputValue(d);
  }

  const plannedPaymentsData = [
    { name: 'ICICI Credit Card Bill', amount: 12340, frequency: 'monthly', nextDate: getNextDueDate(iciciDueDay), accountId: 'acc_sbi', categoryId: 'bills', note: 'Auto-pay from SBI', enabled: true },
    { name: 'HDFC Credit Card Bill', amount: 8750, frequency: 'monthly', nextDate: getNextDueDate(hdfcDueDay), accountId: 'acc_hdfc', categoryId: 'bills', note: 'Pay from HDFC Savings', enabled: true },
    { name: 'Netflix Subscription', amount: 649, frequency: 'monthly', nextDate: daysFromNow(5), accountId: 'acc_icici_cc', categoryId: 'entertainment', note: 'Premium plan', enabled: true },
    { name: 'Jio Fiber Internet', amount: 1199, frequency: 'monthly', nextDate: daysFromNow(12), accountId: 'acc_hdfc', categoryId: 'bills', note: '100 Mbps plan', enabled: true },
    { name: 'Room Rent', amount: 8500, frequency: 'monthly', nextDate: daysFromNow(1), accountId: 'acc_sbi', categoryId: 'bills', note: 'Monthly rent share', enabled: true },
    { name: 'Gym Membership', amount: 4500, frequency: 'monthly', nextDate: daysFromNow(18), accountId: 'acc_hdfc', categoryId: 'health', note: 'Cult.fit yearly split', enabled: true },
    { name: 'Electricity Bill', amount: 2100, frequency: 'monthly', nextDate: daysFromNow(8), accountId: 'acc_hdfc', categoryId: 'bills', note: '', enabled: true },
    { name: 'Health Insurance', amount: 15000, frequency: 'quarterly', nextDate: daysFromNow(45), accountId: 'acc_hdfc', categoryId: 'bills', note: 'HDFC Ergo policy', enabled: true },
    { name: 'Spotify Premium', amount: 119, frequency: 'monthly', nextDate: daysFromNow(22), accountId: 'acc_paytm', categoryId: 'entertainment', note: 'Individual plan', enabled: true },
    { name: 'Domain Renewal', amount: 800, frequency: 'yearly', nextDate: daysFromNow(90), accountId: 'acc_hdfc', categoryId: 'bills', note: 'Personal website', enabled: false },
  ];

  const plannedPayments = plannedPaymentsData.map((p) => ({
    ...p,
    id: generateId(),
    createdAt: now,
  }));

  return { accounts, transactions, plannedPayments };
}
