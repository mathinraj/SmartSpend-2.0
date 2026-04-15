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

export const SAMPLE_ACCOUNT_IDS = ['acc_hdfc', 'acc_sbi', 'acc_icici_cc', 'acc_hdfc_cc', 'acc_axis_debit', 'acc_cash', 'acc_paytm', 'acc_gpay'];

export function hasSampleData(accounts) {
  return SAMPLE_ACCOUNT_IDS.some((id) => accounts.some((a) => a.id === id));
}

export function generateSampleData() {
  const accounts = [
    { id: 'acc_hdfc', name: 'HDFC Savings', type: 'bank', subType: 'savings', balance: 52780.50 },
    { id: 'acc_sbi', name: 'SBI Salary', type: 'bank', subType: 'salary', balance: 134200.00 },
    { id: 'acc_icici_cc', name: 'ICICI Amazon Pay Card', type: 'card', subType: 'credit', balance: -22450.00, billingDate: 15, dueDate: 5, creditLimit: 150000 },
    { id: 'acc_hdfc_cc', name: 'HDFC Millennia Card', type: 'card', subType: 'credit', balance: -14680.00, billingDate: 28, dueDate: 18, creditLimit: 200000 },
    { id: 'acc_axis_debit', name: 'Axis Debit Card', type: 'card', subType: 'debit', balance: 18500.00 },
    { id: 'acc_cash', name: 'Cash in Hand', type: 'cash', balance: 2850.00 },
    { id: 'acc_paytm', name: 'Paytm Wallet', type: 'wallet', balance: 1420.00 },
    { id: 'acc_gpay', name: 'Google Pay', type: 'wallet', balance: 0 },
  ];

  const now = new Date().toISOString();

  const txns = [
    // ─── Month 1: current month (0–29 days ago) ───
    { type: 'expense', amount: 389, accountId: 'acc_paytm', categoryId: 'food', subcategoryId: 'food_delivery', note: 'Swiggy dinner - biryani', date: daysAgo(0), time: '21:15', paymentApp: 'Paytm' },
    { type: 'expense', amount: 85, accountId: 'acc_cash', categoryId: 'transport', subcategoryId: 'transport_taxi', note: 'Auto to office', date: daysAgo(0), time: '09:10' },
    { type: 'expense', amount: 140, accountId: 'acc_gpay', categoryId: 'food', subcategoryId: 'food_cafe', note: 'Filter coffee + sandwich', date: daysAgo(0), time: '16:30', paymentApp: 'GPay' },
    { type: 'income', amount: 75000, accountId: 'acc_sbi', categoryId: 'income_salary', note: 'March Salary', date: daysAgo(1), time: '10:00' },
    { type: 'expense', amount: 2340, accountId: 'acc_hdfc', categoryId: 'shopping', subcategoryId: 'shopping_clothes', note: 'Myntra order - 3 t-shirts', date: daysAgo(1), time: '13:45' },
    { type: 'transfer', amount: 5000, fromAccountId: 'acc_sbi', toAccountId: 'acc_paytm', note: 'Top up wallet', date: daysAgo(1), time: '10:30' },
    { type: 'expense', amount: 180, accountId: 'acc_cash', categoryId: 'food', subcategoryId: 'food_cafe', note: 'Starbucks latte', date: daysAgo(2), time: '11:00' },
    { type: 'expense', amount: 1199, accountId: 'acc_hdfc', categoryId: 'bills', subcategoryId: 'bills_internet', note: 'Jio fiber bill', date: daysAgo(2), time: '18:20' },
    { type: 'expense', amount: 3499, accountId: 'acc_icici_cc', categoryId: 'shopping', subcategoryId: 'shopping_electronics', note: 'Amazon - JBL earbuds', date: daysAgo(3), time: '22:10', paymentApp: 'Amazon Pay' },
    { type: 'expense', amount: 299, accountId: 'acc_paytm', categoryId: 'bills', subcategoryId: 'bills_mobile', note: 'Airtel recharge', date: daysAgo(3), time: '09:00', paymentApp: 'Paytm' },
    { type: 'expense', amount: 620, accountId: 'acc_gpay', categoryId: 'food', subcategoryId: 'food_restaurant', note: 'Lunch at Meghana Foods', date: daysAgo(4), time: '13:30', paymentApp: 'GPay' },
    { type: 'expense', amount: 2800, accountId: 'acc_hdfc_cc', categoryId: 'shopping', subcategoryId: 'shopping_clothes', note: 'Zara - jacket', date: daysAgo(5), time: '17:45', paymentApp: 'Card Swipe' },
    { type: 'expense', amount: 4500, accountId: 'acc_hdfc', categoryId: 'health', subcategoryId: 'health_gym', note: 'Cult.fit monthly', date: daysAgo(6), time: '07:00' },
    { type: 'expense', amount: 350, accountId: 'acc_cash', categoryId: 'transport', subcategoryId: 'transport_fuel', note: 'Petrol - Honda Activa', date: daysAgo(7), time: '08:15' },
    { type: 'income', amount: 12000, accountId: 'acc_hdfc', categoryId: 'income_freelance', note: 'Logo design - TechCorp', date: daysAgo(7), time: '16:00' },
    { type: 'expense', amount: 8500, accountId: 'acc_icici_cc', categoryId: 'bills', subcategoryId: 'bills_rent', note: 'Room rent share', date: daysAgo(8), time: '10:00' },
    { type: 'expense', amount: 199, accountId: 'acc_icici_cc', categoryId: 'entertainment', subcategoryId: 'ent_subscriptions', note: 'Netflix standard', date: daysAgo(9), time: '20:00' },
    { type: 'expense', amount: 1800, accountId: 'acc_axis_debit', categoryId: 'food', subcategoryId: 'food_groceries', note: 'BigBasket groceries', date: daysAgo(10), time: '19:30', isSplit: true, splitAmount: 900, splitSettled: false },
    { type: 'expense', amount: 500, accountId: 'acc_cash', categoryId: 'personal', subcategoryId: 'personal_grooming', note: 'Haircut at salon', date: daysAgo(12), time: '11:30' },
    { type: 'expense', amount: 750, accountId: 'acc_gpay', categoryId: 'food', subcategoryId: 'food_delivery', note: 'Zomato - pizza party', date: daysAgo(13), time: '20:45', paymentApp: 'GPay', isSplit: true, splitAmount: 375, splitSettled: true },
    { type: 'transfer', amount: 15000, fromAccountId: 'acc_sbi', toAccountId: 'acc_hdfc', note: 'Monthly savings transfer', date: daysAgo(14), time: '10:00' },
    { type: 'expense', amount: 1500, accountId: 'acc_hdfc', categoryId: 'education', subcategoryId: 'edu_books', note: 'O\'Reilly annual renewal', date: daysAgo(15) },
    { type: 'expense', amount: 2100, accountId: 'acc_hdfc', categoryId: 'bills', subcategoryId: 'bills_electricity', note: 'Electricity bill - March', date: daysAgo(18) },
    { type: 'expense', amount: 890, accountId: 'acc_hdfc', categoryId: 'bills', subcategoryId: 'bills_water', note: 'Water bill', date: daysAgo(18) },
    { type: 'expense', amount: 320, accountId: 'acc_cash', categoryId: 'food', subcategoryId: 'food_snacks', note: 'Pani puri & chaat', date: daysAgo(20), time: '18:00' },
    { type: 'expense', amount: 1280, accountId: 'acc_icici_cc', categoryId: 'entertainment', subcategoryId: 'ent_movies', note: 'PVR IMAX - Avengers', date: daysAgo(22), time: '19:00', isSplit: true, splitAmount: 640, splitSettled: true },
    { type: 'expense', amount: 450, accountId: 'acc_cash', categoryId: 'transport', subcategoryId: 'transport_taxi', note: 'Uber to mall & back', date: daysAgo(22), time: '16:30' },
    { type: 'expense', amount: 1200, accountId: 'acc_axis_debit', categoryId: 'personal', subcategoryId: 'personal_gifts', note: 'Birthday gift for friend', date: daysAgo(25), time: '14:00' },
    { type: 'expense', amount: 250, accountId: 'acc_paytm', categoryId: 'food', subcategoryId: 'food_cafe', note: 'Chai Point - office delivery', date: daysAgo(27), time: '15:30' },

    // ─── Month 2: 30–59 days ago ───
    { type: 'income', amount: 75000, accountId: 'acc_sbi', categoryId: 'income_salary', note: 'February Salary', date: daysAgo(30), time: '10:00' },
    { type: 'expense', amount: 8500, accountId: 'acc_icici_cc', categoryId: 'bills', subcategoryId: 'bills_rent', note: 'Room rent share', date: daysAgo(30) },
    { type: 'expense', amount: 1199, accountId: 'acc_hdfc', categoryId: 'bills', subcategoryId: 'bills_internet', note: 'Jio fiber bill', date: daysAgo(32) },
    { type: 'expense', amount: 6800, accountId: 'acc_icici_cc', categoryId: 'travel', subcategoryId: 'travel_flights', note: 'Flight to Goa - IndiGo', date: daysAgo(33), isSplit: true, splitAmount: 3400, splitSettled: false },
    { type: 'expense', amount: 3200, accountId: 'acc_icici_cc', categoryId: 'travel', subcategoryId: 'travel_hotel', note: 'OYO Goa - 2 nights', date: daysAgo(33), isSplit: true, splitAmount: 1600, splitSettled: false },
    { type: 'expense', amount: 2800, accountId: 'acc_cash', categoryId: 'food', subcategoryId: 'food_restaurant', note: 'Goa beach shack dinner', date: daysAgo(34), isSplit: true, splitAmount: 1400, splitSettled: false },
    { type: 'expense', amount: 1500, accountId: 'acc_cash', categoryId: 'transport', subcategoryId: 'transport_taxi', note: 'Goa scooter rental', date: daysAgo(34), isSplit: true, splitAmount: 750, splitSettled: false },
    { type: 'expense', amount: 420, accountId: 'acc_cash', categoryId: 'transport', subcategoryId: 'transport_parking', note: 'Airport parking', date: daysAgo(35) },
    { type: 'expense', amount: 4500, accountId: 'acc_hdfc', categoryId: 'health', subcategoryId: 'health_gym', note: 'Cult.fit monthly', date: daysAgo(36) },
    { type: 'expense', amount: 5200, accountId: 'acc_hdfc_cc', categoryId: 'shopping', subcategoryId: 'shopping_electronics', note: 'Flipkart - phone case + charger', date: daysAgo(38) },
    { type: 'transfer', amount: 18000, fromAccountId: 'acc_sbi', toAccountId: 'acc_icici_cc', note: 'ICICI CC bill payment', date: daysAgo(38) },
    { type: 'expense', amount: 1950, accountId: 'acc_paytm', categoryId: 'food', subcategoryId: 'food_groceries', note: 'Zepto grocery order', date: daysAgo(40), time: '10:15', paymentApp: 'Paytm' },
    { type: 'expense', amount: 15000, accountId: 'acc_hdfc', categoryId: 'bills', subcategoryId: 'bills_insurance', note: 'Health insurance - HDFC Ergo', date: daysAgo(42) },
    { type: 'income', amount: 8500, accountId: 'acc_hdfc', categoryId: 'income_investment', note: 'Mutual fund dividend - SBI MF', date: daysAgo(44) },
    { type: 'expense', amount: 3400, accountId: 'acc_icici_cc', categoryId: 'shopping', subcategoryId: 'shopping_personal', note: 'Nykaa - skincare haul', date: daysAgo(45), paymentApp: 'Amazon Pay' },
    { type: 'expense', amount: 750, accountId: 'acc_gpay', categoryId: 'food', subcategoryId: 'food_cafe', note: 'Third Wave Coffee - team outing', date: daysAgo(47), time: '16:00', paymentApp: 'GPay' },
    { type: 'expense', amount: 2200, accountId: 'acc_hdfc', categoryId: 'bills', subcategoryId: 'bills_electricity', note: 'Electricity bill - February', date: daysAgo(48) },
    { type: 'expense', amount: 380, accountId: 'acc_cash', categoryId: 'transport', subcategoryId: 'transport_fuel', note: 'Petrol', date: daysAgo(50) },
    { type: 'expense', amount: 1100, accountId: 'acc_hdfc_cc', categoryId: 'entertainment', subcategoryId: 'ent_subscriptions', note: 'YouTube Premium family', date: daysAgo(52) },
    { type: 'income', amount: 5000, accountId: 'acc_hdfc', categoryId: 'income_gift', note: 'Cash gift from uncle', date: daysAgo(55) },
    { type: 'expense', amount: 680, accountId: 'acc_cash', categoryId: 'personal', subcategoryId: 'personal_grooming', note: 'Haircut + beard trim', date: daysAgo(58), time: '11:00' },
    { type: 'expense', amount: 2500, accountId: 'acc_axis_debit', categoryId: 'health', subcategoryId: 'health_medical', note: 'Doctor consultation + meds', date: daysAgo(55) },
    { type: 'expense', amount: 450, accountId: 'acc_gpay', categoryId: 'food', subcategoryId: 'food_delivery', note: 'Swiggy lunch', date: daysAgo(53), time: '13:00', paymentApp: 'GPay' },

    // ─── Month 3: 60–89 days ago ───
    { type: 'income', amount: 75000, accountId: 'acc_sbi', categoryId: 'income_salary', note: 'January Salary', date: daysAgo(60), time: '10:00' },
    { type: 'expense', amount: 8500, accountId: 'acc_icici_cc', categoryId: 'bills', subcategoryId: 'bills_rent', note: 'Room rent share', date: daysAgo(60) },
    { type: 'expense', amount: 1199, accountId: 'acc_hdfc', categoryId: 'bills', subcategoryId: 'bills_internet', note: 'Jio fiber bill', date: daysAgo(62) },
    { type: 'expense', amount: 12500, accountId: 'acc_hdfc_cc', categoryId: 'shopping', subcategoryId: 'shopping_electronics', note: 'Flipkart - Sony headphones', date: daysAgo(63) },
    { type: 'income', amount: 18000, accountId: 'acc_hdfc', categoryId: 'income_freelance', note: 'Website redesign - StartupXYZ', date: daysAgo(65) },
    { type: 'expense', amount: 4500, accountId: 'acc_hdfc', categoryId: 'health', subcategoryId: 'health_gym', note: 'Cult.fit monthly', date: daysAgo(66) },
    { type: 'expense', amount: 2400, accountId: 'acc_axis_debit', categoryId: 'food', subcategoryId: 'food_groceries', note: 'BigBasket monthly stock-up', date: daysAgo(68), time: '20:00' },
    { type: 'expense', amount: 550, accountId: 'acc_paytm', categoryId: 'food', subcategoryId: 'food_delivery', note: 'Zomato - dal makhani combo', date: daysAgo(70), paymentApp: 'Paytm' },
    { type: 'expense', amount: 9800, accountId: 'acc_icici_cc', categoryId: 'shopping', subcategoryId: 'shopping_clothes', note: 'Winter clearance - 5 items', date: daysAgo(72) },
    { type: 'transfer', amount: 14000, fromAccountId: 'acc_sbi', toAccountId: 'acc_hdfc_cc', note: 'HDFC CC bill payment', date: daysAgo(73) },
    { type: 'expense', amount: 2100, accountId: 'acc_hdfc', categoryId: 'bills', subcategoryId: 'bills_electricity', note: 'Electricity bill - January', date: daysAgo(75) },
    { type: 'expense', amount: 850, accountId: 'acc_hdfc', categoryId: 'bills', subcategoryId: 'bills_water', note: 'Water bill', date: daysAgo(75) },
    { type: 'expense', amount: 1800, accountId: 'acc_icici_cc', categoryId: 'entertainment', subcategoryId: 'ent_movies', note: 'BookMyShow - Diljit concert', date: daysAgo(78), time: '19:00', isSplit: true, splitAmount: 900, splitSettled: true },
    { type: 'expense', amount: 420, accountId: 'acc_cash', categoryId: 'transport', subcategoryId: 'transport_taxi', note: 'Uber to concert venue', date: daysAgo(78), time: '17:30' },
    { type: 'expense', amount: 199, accountId: 'acc_icici_cc', categoryId: 'entertainment', subcategoryId: 'ent_subscriptions', note: 'Netflix standard', date: daysAgo(80) },
    { type: 'expense', amount: 3200, accountId: 'acc_hdfc', categoryId: 'education', subcategoryId: 'edu_courses', note: 'Udemy - React + Next.js bundle', date: daysAgo(82) },
    { type: 'expense', amount: 280, accountId: 'acc_cash', categoryId: 'food', subcategoryId: 'food_snacks', note: 'Tea & samosa near office', date: daysAgo(85), time: '17:00' },
    { type: 'expense', amount: 1600, accountId: 'acc_hdfc_cc', categoryId: 'shopping', subcategoryId: 'shopping_personal', note: 'Amazon - desk lamp + organizer', date: daysAgo(87) },
    { type: 'expense', amount: 350, accountId: 'acc_cash', categoryId: 'transport', subcategoryId: 'transport_fuel', note: 'Petrol fill-up', date: daysAgo(85) },
    { type: 'income', amount: 3500, accountId: 'acc_hdfc', categoryId: 'income_refund', note: 'Amazon return refund - shoes', date: daysAgo(83) },

    // ─── Month 4: 90–120 days ago ───
    { type: 'income', amount: 75000, accountId: 'acc_sbi', categoryId: 'income_salary', note: 'December Salary', date: daysAgo(90), time: '10:00' },
    { type: 'expense', amount: 8500, accountId: 'acc_icici_cc', categoryId: 'bills', subcategoryId: 'bills_rent', note: 'Room rent share', date: daysAgo(90) },
    { type: 'expense', amount: 1199, accountId: 'acc_hdfc', categoryId: 'bills', subcategoryId: 'bills_internet', note: 'Jio fiber bill', date: daysAgo(92) },
    { type: 'expense', amount: 18000, accountId: 'acc_hdfc_cc', categoryId: 'travel', subcategoryId: 'travel_flights', note: 'Christmas trip - Delhi flights', date: daysAgo(95), isSplit: true, splitAmount: 9000, splitSettled: true },
    { type: 'expense', amount: 8500, accountId: 'acc_hdfc_cc', categoryId: 'travel', subcategoryId: 'travel_hotel', note: 'Taj hotel Delhi - 2 nights', date: daysAgo(95), isSplit: true, splitAmount: 4250, splitSettled: true },
    { type: 'expense', amount: 4200, accountId: 'acc_cash', categoryId: 'food', subcategoryId: 'food_restaurant', note: 'Christmas eve dinner - Bukhara', date: daysAgo(96), time: '20:30', isSplit: true, splitAmount: 2100, splitSettled: false },
    { type: 'income', amount: 25000, accountId: 'acc_hdfc', categoryId: 'income_gift', note: 'Year-end performance bonus', date: daysAgo(98) },
    { type: 'expense', amount: 4500, accountId: 'acc_hdfc', categoryId: 'health', subcategoryId: 'health_gym', note: 'Cult.fit monthly', date: daysAgo(100) },
    { type: 'expense', amount: 7500, accountId: 'acc_icici_cc', categoryId: 'shopping', subcategoryId: 'shopping_electronics', note: 'Christmas gifts - earphones + charger', date: daysAgo(102) },
    { type: 'expense', amount: 3800, accountId: 'acc_icici_cc', categoryId: 'shopping', subcategoryId: 'shopping_clothes', note: 'New Year party outfits', date: daysAgo(104) },
    { type: 'transfer', amount: 22000, fromAccountId: 'acc_sbi', toAccountId: 'acc_icici_cc', note: 'ICICI CC bill payment', date: daysAgo(105) },
    { type: 'expense', amount: 2100, accountId: 'acc_hdfc', categoryId: 'bills', subcategoryId: 'bills_electricity', note: 'Electricity bill - December', date: daysAgo(108) },
    { type: 'expense', amount: 1500, accountId: 'acc_paytm', categoryId: 'food', subcategoryId: 'food_groceries', note: 'Blinkit - party supplies', date: daysAgo(110), paymentApp: 'Paytm' },
    { type: 'expense', amount: 199, accountId: 'acc_icici_cc', categoryId: 'entertainment', subcategoryId: 'ent_subscriptions', note: 'Netflix standard', date: daysAgo(112) },
    { type: 'expense', amount: 380, accountId: 'acc_cash', categoryId: 'transport', subcategoryId: 'transport_fuel', note: 'Petrol', date: daysAgo(115) },
    { type: 'income', amount: 10000, accountId: 'acc_hdfc', categoryId: 'income_freelance', note: 'App icon design - FoodieApp', date: daysAgo(118) },
    { type: 'expense', amount: 2999, accountId: 'acc_hdfc_cc', categoryId: 'entertainment', subcategoryId: 'ent_gaming', note: 'PS5 Spider-Man 2', date: daysAgo(120), time: '22:00' },
    { type: 'expense', amount: 6000, accountId: 'acc_axis_debit', categoryId: 'personal', subcategoryId: 'personal_gifts', note: 'New Year gifts for family', date: daysAgo(112) },
    { type: 'expense', amount: 1800, accountId: 'acc_gpay', categoryId: 'food', subcategoryId: 'food_restaurant', note: 'New Year dinner', date: daysAgo(91), time: '21:00', paymentApp: 'GPay', isSplit: true, splitAmount: 600, splitSettled: true },
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
    { name: 'ICICI Credit Card Bill', amount: 22450, frequency: 'monthly', nextDate: daysAgo(3), accountId: 'acc_sbi', categoryId: 'bills', note: 'Auto-pay from SBI', enabled: true },
    { name: 'Mobile Recharge', amount: 299, frequency: 'monthly', nextDate: daysAgo(1), accountId: 'acc_paytm', categoryId: 'bills', note: 'Airtel prepaid', enabled: true },
    { name: 'Room Rent', amount: 8500, frequency: 'monthly', nextDate: toDateInputValue(new Date()), accountId: 'acc_sbi', categoryId: 'bills', note: 'Monthly rent share', enabled: true },
    { name: 'Netflix Subscription', amount: 199, frequency: 'monthly', nextDate: daysFromNow(2), accountId: 'acc_icici_cc', categoryId: 'entertainment', note: 'Standard plan', enabled: true },
    { name: 'HDFC Credit Card Bill', amount: 14680, frequency: 'monthly', nextDate: getNextDueDate(18), accountId: 'acc_hdfc', categoryId: 'bills', note: 'Pay from HDFC Savings', enabled: true },
    { name: 'Jio Fiber Internet', amount: 1199, frequency: 'monthly', nextDate: daysFromNow(12), accountId: 'acc_hdfc', categoryId: 'bills', note: '100 Mbps plan', enabled: true },
    { name: 'Gym Membership', amount: 4500, frequency: 'monthly', nextDate: daysFromNow(18), accountId: 'acc_hdfc', categoryId: 'health', note: 'Cult.fit monthly', enabled: true },
    { name: 'Electricity Bill', amount: 2100, frequency: 'monthly', nextDate: daysFromNow(8), accountId: 'acc_hdfc', categoryId: 'bills', note: 'Approximate', enabled: true },
    { name: 'Health Insurance', amount: 15000, frequency: 'quarterly', nextDate: daysFromNow(45), accountId: 'acc_hdfc', categoryId: 'bills', note: 'HDFC Ergo policy', enabled: true },
    { name: 'Spotify Premium', amount: 119, frequency: 'monthly', nextDate: daysFromNow(22), accountId: 'acc_paytm', categoryId: 'entertainment', note: 'Individual plan', enabled: true },
    { name: 'YouTube Premium', amount: 189, frequency: 'monthly', nextDate: daysFromNow(15), accountId: 'acc_hdfc_cc', categoryId: 'entertainment', note: 'Family plan', enabled: true },
    { name: 'Domain Renewal', amount: 800, frequency: 'yearly', nextDate: daysFromNow(90), accountId: 'acc_hdfc', categoryId: 'bills', note: 'Personal website .dev', enabled: false },
    { name: 'SIP - Mutual Fund', amount: 5000, frequency: 'monthly', nextDate: daysFromNow(5), accountId: 'acc_sbi', categoryId: 'other', note: 'Nifty 50 index fund', enabled: true },
  ];

  const plannedPayments = plannedPaymentsData.map((p) => ({ ...p, id: generateId(), createdAt: now }));

  const splitLedgerData = [
    // Grocery splits
    { type: 'split_paid', person: 'Rajesh', amount: 450, note: 'BigBasket groceries', date: daysAgo(10), isSample: true },
    { type: 'split_paid', person: 'Priya', amount: 450, note: 'BigBasket groceries', date: daysAgo(10), isSample: true },
    // Pizza party
    { type: 'split_paid', person: 'Rajesh', amount: 187, note: 'Zomato pizza party', date: daysAgo(13), isSample: true },
    { type: 'split_paid', person: 'Priya', amount: 188, note: 'Zomato pizza party', date: daysAgo(13), isSample: true },
    // Movie
    { type: 'split_paid', person: 'Rajesh', amount: 640, note: 'PVR IMAX - Avengers', date: daysAgo(22), isSample: true },
    // Rajesh owes for snacks
    { type: 'split_owed', person: 'Rajesh', amount: 250, note: 'Chai & snacks', date: daysAgo(15), isSample: true },
    // Goa trip
    { type: 'split_paid', person: 'Rajesh', amount: 3400, note: 'Flight to Goa', date: daysAgo(33), isSample: true },
    { type: 'split_paid', person: 'Priya', amount: 1600, note: 'Goa hotel', date: daysAgo(33), isSample: true },
    { type: 'split_paid', person: 'Rajesh', amount: 1400, note: 'Goa beach dinner', date: daysAgo(34), isSample: true },
    { type: 'split_paid', person: 'Priya', amount: 1400, note: 'Goa beach dinner', date: daysAgo(34), isSample: true },
    { type: 'split_paid', person: 'Rajesh', amount: 750, note: 'Goa scooter rental', date: daysAgo(34), isSample: true },
    { type: 'split_paid', person: 'Priya', amount: 750, note: 'Goa scooter rental', date: daysAgo(34), isSample: true },
    // Priya owes for dinner
    { type: 'split_owed', person: 'Priya', amount: 800, note: 'Dinner at Toit', date: daysAgo(40), isSample: true },
    // Concert
    { type: 'split_paid', person: 'Rajesh', amount: 900, note: 'Diljit concert tickets', date: daysAgo(78), isSample: true },
    // Christmas trip
    { type: 'split_paid', person: 'Priya', amount: 9000, note: 'Christmas Delhi flights', date: daysAgo(95), isSample: true },
    { type: 'split_paid', person: 'Priya', amount: 4250, note: 'Taj hotel Delhi', date: daysAgo(95), isSample: true },
    { type: 'split_paid', person: 'Rajesh', amount: 2100, note: 'Christmas dinner Bukhara', date: daysAgo(96), isSample: true },
    // New Year dinner
    { type: 'split_paid', person: 'Rajesh', amount: 300, note: 'New Year dinner', date: daysAgo(91), isSample: true },
    { type: 'split_paid', person: 'Priya', amount: 300, note: 'New Year dinner', date: daysAgo(91), isSample: true },
    // Settlements
    { type: 'settlement', person: 'Rajesh', amount: 3000, direction: 'received', note: 'GPay settlement', date: daysAgo(5), isSample: true },
    { type: 'settlement', person: 'Priya', amount: 5000, direction: 'received', note: 'Bank transfer settlement', date: daysAgo(80), isSample: true },
    // Amit - new person
    { type: 'split_paid', person: 'Amit', amount: 600, note: 'Office lunch', date: daysAgo(8), isSample: true },
    { type: 'split_owed', person: 'Amit', amount: 350, note: 'Coffee & snacks', date: daysAgo(3), isSample: true },
  ];

  const splitLedger = splitLedgerData.map((e) => ({ ...e, id: generateId(), createdAt: now }));

  return { accounts, transactions, plannedPayments, splitLedger, splitPeople: ['Rajesh', 'Priya', 'Amit'] };
}
