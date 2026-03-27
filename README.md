# SpendTrak

A personal finance tracker built with Next.js and React. Track expenses, income, and transfers across multiple accounts — all stored locally in your browser. Free, offline, and private.

## Features

### Core
- **Dashboard** — at-a-glance view of monthly expenses or total balance, recent transactions, and account summaries
- **Multi-account support** — bank accounts, credit/debit cards, cash, and wallets (UPI)
- **Transactions** — add, edit, and delete expenses, income, and account-to-account transfers
- **Categories & subcategories** — organize spending with customizable expense and income categories
- **Analytics** — pie charts, bar charts, and line charts with flexible time periods (this month, last month, this year, last 30 days, custom range)

### Split & Planned Payments
- **Split expense tracking** — track shared expenses with friends, per-person balances, and settlements
- **Settlement with account selection** — record settlements and update bank balances in one step
- **Planned payments** — track subscriptions, EMIs, and recurring bills with due-date reminders
- **"They paid for me" with account update** — optionally record which account received the money

### Privacy & Security
- **App lock** — protect your data with a 4-digit PIN or a password
- **Lock timeout** — configurable delay (immediately, 30s, 1 min, 5 min) before locking when you leave the app
- **Hide balances** — mask total balance, income/expense stats, and account balances with one toggle (transactions and payments stay visible)
- **Offline & private** — all data stored in localStorage, no server, no sign-up required

### Reminders & Notifications
- **Custom reminders** — daily, weekly, or interval-based browser notifications at any time
- **Service Worker notifications** — reliable delivery even in PWA / background tabs
- **Backup reminders** — periodic nudge (every 7 days) to export your data, resets on actual backup
- **Do Not Disturb** — pause all reminders during a configurable quiet window

### Organization & Filtering
- **Reorder accounts & categories** — drag or use arrow controls; custom order is respected in normal view with inline type section headers
- **Multi-select filters** — filter transactions by multiple categories and multiple accounts simultaneously
- **Mobile three-dot menu** — tap the ⋮ button on each transaction to reveal edit/delete actions

### Data Management
- **Export** — JSON full backup or CSV transactions export
- **Import** — restore from backup (replace or merge)
- **Sample data** — one-click demo data to explore the app, with easy removal

### Design
- **Landing page** — full-viewport hero with scroll-triggered feature reveal animations
- **Responsive** — mobile-first design with bottom navigation; desktop layout with sidebar
- **Dark mode** — toggle between light and dark themes
- **Customizable home page** — toggle balance vs. expenses view, show/hide accounts section, income & expense stats, and split money card
- **Dynamic favicon** — changes to match your selected currency symbol

## Tech Stack

| Layer | Tool |
|-------|------|
| Framework | Next.js 15 (App Router) |
| UI Library | React 19 |
| State | Context API + useReducer |
| Charts | Recharts |
| Dates | date-fns |
| IDs | uuid |
| Email | EmailJS (feedback form) |
| Styling | Custom CSS with CSS variables |
| Deployment | Vercel |

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables (optional)

For the feedback form to work, create a `.env.local` file:

```
NEXT_PUBLIC_EMAILJS_SERVICE_ID=your_service_id
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=your_template_id
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=your_public_key
```

## Changelog

### v1.3
- **Renamed to SpendTrak**
- **App lock: PIN or password** — choose between a 4-digit PIN (keypad) or a text password
- **Lock timeout settings** — configurable delay before locking (immediately, 30s, 1 min, 5 min)
- **Split tracker: account selection** — "They paid for me" now optionally updates your bank balance
- **Backup reminder notifications** — periodic nudge every 7 days to export your data
- **Multi-select transaction filters** — select multiple categories and accounts in the filter modal
- **Mobile three-dot menu** — transaction edit/delete actions behind a ⋮ popover on mobile
- **Hide balances scoped** — only hides totals, income/expense stats, and account balances; transactions and payments remain visible; also works in the accounts page
- **Accounts reorder fix** — custom order is now respected after clicking Done, with inline type section headers
- **Notification fix** — immediate check on mount + Service Worker API for PWA reliability
- **Email validation** — strict regex validation in the feedback form (rejects incomplete domains)
- **Landing page** — full single-page design with scroll-triggered reveal animations, feature showcase, how-it-works, and FAQ schema for SEO
- **SEO enhancements** — FAQ JSON-LD schema, expanded keywords, and richer structured data
- Removed currency selector from preferences (set during onboarding, favicon follows selection)

### v1.2
- **Migrated to Next.js 15 App Router** for improved SEO and performance
- Server-side rendering (SSR) for faster initial page loads
- Enhanced SEO with proper meta tags, Open Graph, and robots.txt
- File-based routing with Next.js App Router
- Maintained identical UI/UX and SPA navigation experience
- All client-side features preserved (localStorage, notifications, etc.)

### v1.1
- Reminders with daily/weekly scheduling and browser notifications
- Privacy mode to hide all monetary amounts on the dashboard
- Customizable home page (toggle accounts section, balance stats)
- Drag-and-drop / arrow reorder for accounts and categories
- Notification permission flow with user guidance
- Random reminder opt-in prompt on the home page
- Clickable logo navigates to home
- Balance card properly collapses when stats are hidden
- Preferences link moved to bottom of sidebar

### v1.0
- Initial release with dashboard, multi-account support, transactions, categories, analytics, sample data, and responsive design
