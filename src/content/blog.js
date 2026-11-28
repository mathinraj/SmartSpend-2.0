// Blog posts for /blog. Each section is { heading, paragraphs, list?, link? }; keep claims in line with what
// the apps actually do.

export const POSTS = [
  {
    slug: 'track-daily-expenses',
    title: 'How to track your daily expenses (and actually keep it up)',
    description: 'A simple, realistic routine for tracking daily expenses: log in seconds, use a few categories, set one reminder, and review weekly. No spreadsheet needed.',
    date: '2026-11-26',
    readMinutes: 5,
    tag: 'Habits',
    sections: [
      {
        paragraphs: [
          'Most people who try to track expenses stop within two weeks. Not because it is hard, but because the method asks for too much: a spreadsheet with twenty columns, a category for everything, and a promise to sit down every evening. The trick is to make each entry take seconds and to look at the totals often enough that it feels worth it.',
        ],
      },
      {
        heading: 'Log it when you pay, not at the end of the day',
        paragraphs: [
          'The moment you pay is when you remember the amount and what it was for. Waiting until night means reconstructing the day from memory and bank messages. Keep the expense tracker one tap away: install SpendTrak to your home screen, or use the Android app, and add the entry while you are still at the counter.',
          'An entry needs only three things: the amount, the account you paid from, and a category. A note is optional. If you skip it, you can still tell "Food" from "Transport" a month later.',
        ],
      },
      {
        heading: 'Use fewer categories than you think',
        paragraphs: [
          'Ten or twelve categories cover almost everyone: food, groceries, transport, bills, rent, shopping, health, entertainment, travel, and a catch-all. Subcategories such as "Food → Delivery" are useful when you want detail, but they should never slow you down.',
        ],
        list: [
          'If you hesitate over which category to pick, the categories are too fine.',
          'If one category holds more than a third of your spending, split it.',
          'Rename the defaults to the words you actually use.',
        ],
      },
      {
        heading: 'Track every account, including cash',
        paragraphs: [
          'Spending leaks through the accounts you do not track: the wallet top-up, the cash at the vegetable stall, the credit card you use "only for online orders". Add each bank account, card, wallet, and your cash once, with its current balance. From then on, every entry updates that balance, so you notice quickly when the numbers drift from reality.',
        ],
      },
      {
        heading: 'Set one reminder, at the right time',
        paragraphs: [
          'A single daily reminder in the evening catches anything you forgot. In SpendTrak, open Preferences → Reminders, allow notifications, and pick a time such as 9 pm. Quiet hours keep it from buzzing when you are asleep.',
        ],
      },
      {
        heading: 'Review once a week',
        paragraphs: [
          'Logging without looking is just data entry. Once a week, open Analytics and look at three things: what you spent this week compared with last week, your top categories, and anything surprising. Five minutes is enough. That is when tracking starts to change what you buy.',
        ],
      },
      {
        heading: 'Let your phone do some of the work',
        paragraphs: [
          'On Android, SpendTrak can read the transaction messages your bank already sends and turn them into ready-to-add entries. You review each one before it is saved. It is still in beta, but it removes most of the typing for card and UPI payments.',
        ],
      },
    ],
  },
  {
    slug: 'expense-tracker-without-sign-up',
    title: 'An expense tracker without sign-up: how local-first privacy works',
    description: 'Why SpendTrak needs no account, where your data is stored, how Google Drive sync works without a SpendTrak server, and how to keep your data safe.',
    date: '2026-11-22',
    readMinutes: 4,
    tag: 'Privacy',
    sections: [
      {
        paragraphs: [
          'Your spending says a lot about you: where you live, what you eat, who you pay, and how much you earn. Most money apps ask you to create an account and send all of it to their servers. SpendTrak takes the opposite approach: there is no account and no SpendTrak server holding your data.',
        ],
      },
      {
        heading: 'Where your data lives',
        paragraphs: [
          'On the web, everything is stored in your browser, on your own device. On Android, it is stored in the app’s private database on your phone. Adding a transaction, checking analytics, or exporting a report never needs an internet connection, which is also why SpendTrak works offline.',
        ],
      },
      {
        heading: 'Sync without a middleman',
        paragraphs: [
          'If you want the same data on your laptop and your phone, connect Google Drive. SpendTrak saves a file to your own Drive and reads it back on your other devices. The data goes straight between your device and Google; it never passes through a SpendTrak server. Daily copies from the last seven days let you roll back if something goes wrong.',
        ],
      },
      {
        heading: 'The trade-off: you own the backups',
        paragraphs: [
          'Local-first has one catch. If you clear your browser’s site data or lose your phone without a backup, the data goes with it. Two habits remove that risk:',
        ],
        list: [
          'Turn on Google Drive sync, or',
          'Export a JSON backup from Preferences → Backup & sync every week or two.',
        ],
      },
      {
        heading: 'Keeping it private on a shared device',
        paragraphs: [
          'Set an app lock with a PIN or password. On devices with Touch ID, Windows Hello, or a fingerprint sensor, you can then unlock with your fingerprint instead of typing. "Hide balances" masks amounts on screen when someone is looking over your shoulder.',
        ],
      },
      {
        heading: 'Why no sign-up is better for you',
        paragraphs: [
          'No account means no password to leak, no email list, and no profile to sell. You can start tracking in under thirty seconds, and you can stop at any time by exporting your data and deleting it.',
        ],
      },
    ],
  },
  {
    slug: 'auto-track-expenses-from-bank-sms',
    title: 'Auto-track expenses from bank SMS on Android',
    description: 'How SpendTrak’s bank SMS import (beta) turns debit, credit card, and UPI messages into transactions on your phone, how review works, and what stays private.',
    date: '2026-11-18',
    readMinutes: 5,
    tag: 'Android',
    sections: [
      {
        paragraphs: [
          'Every time you pay by card or UPI, your bank sends an SMS with the amount, the account, and usually the merchant. SpendTrak for Android 2.0 can read those messages and turn them into transactions, so you review instead of typing. The feature is in beta and works with the transaction alerts sent by most Indian banks and UPI apps.',
        ],
      },
      {
        heading: 'How it works',
        list: [
          'Turn it on in Settings → Bank SMS import and allow SMS access.',
          'SpendTrak looks only at messages from registered bank and payment senders, and ignores OTPs, offers, and personal messages.',
          'It picks out the amount, whether it was a debit or credit, the account’s last digits, the merchant or payee, and the date.',
          'Each message becomes an entry to review on the "Bank transactions" screen. You choose the account and category the first time; SpendTrak remembers them for next time.',
        ],
      },
      {
        heading: 'Review before anything is saved',
        paragraphs: [
          'Nothing is added to your accounts until you say so. Entries that SpendTrak is confident about are marked ready; you can add them all at once or turn on automatic adding for ready entries. If the same payment arrives twice, once from your bank and once from a UPI app, SpendTrak spots the duplicate.',
        ],
      },
      {
        heading: 'What stays private',
        paragraphs: [
          'Messages are read and parsed on your phone. Nothing is uploaded. If a message is read wrongly, you can choose to report it; the report removes names, account numbers, and reference numbers before you send it, and you see exactly what will be shared.',
        ],
      },
      {
        heading: 'Installing the app',
        paragraphs: [
          'Because the app reads SMS and is installed outside the Play Store, Google Play Protect may warn you or block the install. The Android page explains how to install it safely, and on Android 15 you may need to allow "restricted settings" for SpendTrak before SMS access can be turned on.',
        ],
        link: { label: 'Download SpendTrak for Android', href: '/android' },
      },
      {
        heading: 'Getting the most from it',
        list: [
          'Set your phone’s battery setting for SpendTrak to "Unrestricted" so new messages are noticed while the app is closed.',
          'Add all your bank accounts and cards first, so entries match the right account.',
          'Spend a minute on the first review: the choices you make teach SpendTrak your merchants and categories.',
        ],
      },
    ],
  },
  {
    slug: 'split-expenses-with-roommates',
    title: 'How to split expenses with roommates without awkward conversations',
    description: 'A fair, low-effort system for splitting rent, groceries, and bills with roommates or friends, and how to track who owes whom in SpendTrak.',
    date: '2026-11-14',
    readMinutes: 4,
    tag: 'Splitting',
    sections: [
      {
        paragraphs: [
          'Shared flats run on small payments: someone buys groceries, someone pays the internet bill, someone books the cab. None of it is a problem until nobody remembers who paid what. A light system, agreed once, saves months of awkward reminders.',
        ],
      },
      {
        heading: 'Agree on the rules once',
        list: [
          'Which costs are shared: rent, utilities, internet, cleaning, common groceries.',
          'How they are split: equally, or by room size for rent.',
          'When you settle up: at the end of every month works for most people.',
        ],
      },
      {
        heading: 'Record it when it happens',
        paragraphs: [
          'The person who pays records the expense straight away, with who it was for. In SpendTrak, turn on Split expenses in Preferences → Features, then add the shared expense and pick the people involved. Each person’s running balance updates automatically, so "who owes whom" is always one tap away.',
        ],
      },
      {
        heading: 'Keep your own budget honest',
        paragraphs: [
          'If you pay ₹3,000 for groceries and your share is ₹1,000, your real expense is ₹1,000. SpendTrak lets you record only your share as an expense in analytics, while still deducting the full amount from the account you paid with. Your spending reports stay accurate even when you front the money for everyone.',
        ],
      },
      {
        heading: 'Settle up without arguments',
        paragraphs: [
          'At the end of the month, open Split money and look at each person’s balance. When someone pays you back, record a settlement and their balance returns to zero. Because every entry is listed, any question can be answered by scrolling instead of debating.',
        ],
      },
      {
        heading: 'Works for trips too',
        paragraphs: [
          'The same approach works for a weekend trip: one person books the stay, another pays for food, and you settle once you are home.',
        ],
      },
    ],
  },
  {
    slug: 'credit-card-due-dates-and-utilization',
    title: 'Keep credit card spending in check: billing cycles, due dates, and utilization',
    description: 'Understand your credit card’s billing cycle, due date, and utilization, and how to track card spending and dues so you never pay interest or late fees.',
    date: '2026-11-10',
    readMinutes: 5,
    tag: 'Credit cards',
    sections: [
      {
        paragraphs: [
          'A credit card is a free short-term loan if you pay the full bill by the due date, and an expensive one if you do not. Staying on the right side of that line comes down to knowing three numbers: when your statement is generated, when the bill is due, and how much of your limit you are using.',
        ],
      },
      {
        heading: 'Billing day and due date',
        paragraphs: [
          'Your billing day is when the statement is generated; everything spent since the previous statement appears on it. The due date, usually around 15 to 20 days later, is when the full amount must be paid to avoid interest. Spending just after the billing day gives you the longest interest-free period.',
        ],
      },
      {
        heading: 'Utilization: why it matters',
        paragraphs: [
          'Utilization is your outstanding balance divided by your credit limit. Keeping it below about 30% is widely recommended for a healthy credit score, and it is also a useful warning sign that spending is running ahead of income.',
        ],
      },
      {
        heading: 'Tracking a card in SpendTrak',
        list: [
          'Add the card as an account of type Card → Credit card, with its credit limit, billing day, and due day.',
          'Record card purchases against it; the balance shows what you owe.',
          'Analytics shows each card’s utilization against its limit.',
          'When the bill comes, use "Pay bill" to transfer from your bank account to the card, so both balances stay right.',
        ],
      },
      {
        heading: 'Never miss the due date',
        paragraphs: [
          'Add the card bill as a planned payment with its due day and turn on payment due reminders. SpendTrak will notify you when it is due, and again if it becomes overdue.',
        ],
      },
      {
        heading: 'A simple monthly routine',
        list: [
          'On the billing day, check the statement against your recorded card spending.',
          'Pay the full statement amount, not the minimum due.',
          'If utilization keeps creeping above 30%, look at the top categories on that card.',
        ],
      },
    ],
  },
  {
    slug: 'fingerprint-lock-for-finance-apps',
    title: 'Lock your finances with your fingerprint, even in the browser',
    description: 'How to protect your expense data with an app lock and fingerprint unlock on the web and Android, and how to lock your whole browser with TouchLock.',
    date: '2026-11-28',
    readMinutes: 4,
    tag: 'Security',
    sections: [
      {
        paragraphs: [
          'Leaving a laptop open at work or handing your phone to a friend should not mean showing them your bank balances. SpendTrak has an app lock on both the web and Android, and now the web app can unlock with your fingerprint too.',
        ],
      },
      {
        heading: 'Set up the app lock',
        paragraphs: [
          'On the web, open Preferences → Security & privacy and choose a 4-digit PIN or a password. Pick how long SpendTrak waits before locking when you switch away: immediately, after 30 seconds, or after a few minutes.',
        ],
      },
      {
        heading: 'Turn on fingerprint unlock',
        paragraphs: [
          'Once a PIN or password is set, switch on "Unlock with fingerprint". It uses the sensor already built into your device, such as Touch ID on a Mac, Windows Hello on a Windows laptop, or the fingerprint or face unlock on your phone, through the browser’s standard security API. Your fingerprint never leaves the device and SpendTrak never sees it. The lock screen asks for it automatically, and your PIN always works as a fallback.',
        ],
      },
      {
        heading: 'On Android',
        paragraphs: [
          'The Android app offers a PIN or password with fingerprint or face unlock, and locks again when you leave it. "Hide balances" masks every amount until you tap to peek.',
        ],
      },
      {
        heading: 'Go further: lock the whole browser',
        paragraphs: [
          'An app lock protects SpendTrak, but your email, bank, and browsing history are still one click away. TouchLock, a free and open-source browser extension from SpendTrak’s developer, puts a lock screen in front of your entire Chrome, Edge, or Firefox profile, or just in front of chosen sites like your bank, and unlocks with Touch ID, Windows Hello, or a PIN.',
        ],
        link: { label: 'Get TouchLock', href: 'https://touchlock.vercel.app' },
      },
      {
        heading: 'Good habits',
        list: [
          'Use a PIN you do not use for your bank card.',
          'Choose "Immediately" for the lock delay on shared computers.',
          'Keep a backup through Google Drive or an export, since a lock does not protect against losing the device.',
        ],
      },
    ],
  },
];

export function getPost(slug) {
  return POSTS.find((p) => p.slug === slug);
}

export function formatPostDate(date) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export function sortedPosts() {
  return [...POSTS].sort((a, b) => b.date.localeCompare(a.date));
}
