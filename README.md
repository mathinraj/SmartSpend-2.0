# SpendTrak

A personal finance tracker built with Next.js and React. Track expenses, income, and transfers across multiple accounts — all stored locally in your browser. Free, offline, and private.

## Features

### Core
- **Dashboard** — at-a-glance view of monthly expenses or total balance, recent transactions, and account summaries
- **Multi-account support** — bank accounts (savings, current, salary), credit/debit cards, cash, wallets, and custom types (Bitcoin, investments, etc.)
- **Transactions** — add, edit, and delete expenses, income, and account-to-account transfers
- **Categories & subcategories** — organize spending with customizable expense and income categories, managed directly from the Add Transaction page

### Analytics & Insights
- **Overview** — daily income/expense chart, spending by day of week, top expenses, quick stats (avg daily spend, savings rate)
- **Categories** — donut pie charts for expense and income breakdowns with percentage legends
- **Category comparison** — compare any two months side by side with a grouped bar chart and change table; filter by specific categories
- **Credit card analytics** — utilization bars (color-coded), spending per card, and recent bill payment history
- **Per-account analytics** — select any account to see its income vs expense, category breakdown, and monthly flow
- **Trends** — monthly income vs expense line chart across the last 12 months
- **Account filter** — multi-select accounts to filter all analytics data globally

### Export, Backup & Sync
- **Google Drive Sync** — push/pull your data to your own Google Drive; connect with Google OAuth, sync across devices, private appDataFolder; quick sync button on the dashboard
- **JSON backup** — full data export (accounts, transactions, settings, planned payments)
- **CSV export** — transactions only, for Excel or Google Sheets
- **PDF report** — formatted summary tables with chart screenshots from the analytics page
- **Excel (XLSX)** — multi-sheet workbook with data tables and embedded chart images via ExcelJS
- **Import** — restore from backup (replace all or merge without duplicates)

### Split & Planned Payments
- **Split expense tracking** — track shared expenses with friends, per-person balances, and settlements; configurable bank deduction and expense recording modes
- **Settlement with account selection** — record settlements and update bank balances in one step
- **Planned payments** — track subscriptions, EMIs, and recurring bills with due-date reminders; overdue/due-today alerts on the dashboard
- **"They paid for me" with account update** — optionally record which account received the money

### Profile & Personalization
- **User profile** — add your name and photo (stored locally); personalized greeting on the dashboard
- **Bank logos** — search and assign real bank/app logos to accounts via Logo.dev API; logos appear everywhere accounts are shown
- **Customize dashboard** — expandable options to toggle balance view, income/expense stats, accounts section, split money card, credit card exclusion, and hide balances
- **PWA install prompt** — native "Add to Home Screen" banner for quick app access

### Privacy & Security
- **App lock** — protect your data with a 4-digit PIN or a password
- **Lock timeout** — configurable delay (immediately, 30s, 1 min, 5 min) before locking when you leave the app
- **Hide balances** — mask total balance, income/expense stats, and account balances (transactions and payments stay visible)
- **Offline & private** — all data stored in localStorage, no server, no sign-up required

### Reminders & Notifications
- **Custom reminders** — daily, weekly, or interval-based browser notifications at any time
- **Due payment alerts** — overdue/due-today banner on the dashboard, red badge on nav icons, and browser notifications on app load
- **Backup reminders** — periodic nudge (every 7 days) to export your data, resets on actual backup
- **Do Not Disturb** — pause all reminders during a configurable quiet window

### History & Transactions
- **Calendar view** — tap the calendar icon in History to browse transactions by month; days with activity show colored dots and count badges; tap a day to filter
- **Running balance toggle** — enable in History to see the account balance at the time of each transaction
- **Transaction count badge** — pill-shaped indicator showing the filtered count

### Organization & Filtering
- **Custom account types** — add your own types (Bitcoin, investment, etc.) with custom icons
- **Bank sub-types** — savings, current, salary, fixed deposit, recurring deposit
- **Card sub-types** — debit or credit; credit cards get billing date, due date, and credit limit fields
- **Reorder accounts & categories** — drag or use arrow controls; custom order is respected with inline type headers
- **Multi-select filters** — filter transactions by multiple categories and multiple accounts simultaneously
- **Mobile three-dot menu** — tap the three-dot button on each transaction to reveal edit/delete actions

### Design
- **Landing page** — full-viewport hero with scroll-triggered feature reveal animations
- **Responsive** — mobile-first design with bottom navigation; desktop layout with sidebar
- **Dark mode** — toggle between light and dark themes
- **Dynamic favicon** — changes to match your selected currency symbol
- **Sample data** — 4 months of realistic demo data (70+ transactions) to explore the app, with easy removal

## Tech Stack

| Layer | Tool |
|-------|------|
| Framework | Next.js 15 (App Router) |
| UI Library | React 19 |
| State | Context API + useReducer |
| Charts | Recharts |
| PDF Export | jsPDF + jspdf-autotable + html2canvas |
| Excel Export | SheetJS (xlsx) + ExcelJS (chart images) |
| Dates | date-fns |
| IDs | uuid |
| Email | EmailJS (feedback form) |
| Cloud Sync | Google Drive API (appDataFolder) |
| Logo API | Logo.dev |
| Styling | Custom CSS with CSS variables |
| Deployment | Vercel |

## Changelog

### v2.0.2
- **Bank logos** — search and assign logos to accounts via Logo.dev; logos appear on account cards, home page mini-cards, and the Add Transaction picker
- **Running balance in History** — toggle to see account balance at the time of each transaction
- **Calendar view in History** — month calendar with transaction dots and counts per day; tap a day to filter
- **Split expense customization** — separate controls for bank deduction (full vs. my share) and expense recording in analytics
- **Credit card onboarding** — "Current Limit Used" field instead of confusing "Initial Balance (use negative)" prompt
- **Exclude credit cards from total balance** — toggle in Customize Dashboard
- **Due payment reminders** — red alert banner on dashboard, badge on nav icons, and browser notification on app load for overdue/due-today planned payments
- **Planned payments highlighting** — overdue items have red background/border; due-today items have orange highlighting
- **Transaction count badge** — result count is now a styled pill badge
- **History page layout fix** — transaction styles now load correctly regardless of navigation order

### v2.0.1
- **Back navigation fix** — bottom nav and sidebar now use `router.replace` for page-to-page navigation; pressing Back always returns to Home in one step
- **Quick Google Drive sync** — cloud icon button on dashboard; tap to choose Push or Pull from a small dropdown; no need to go to Preferences
- **Rotating backup reminders** — daily backup hint banner on the dashboard with rotating messages (incl. Google Drive nudge); dismissible per session
- **Planned payments in sample data** — overdue and due-today entries added for demo visualization
- **Google Search Console** — sitemap submitted, verification meta tag added

### v2.0
- **Google Drive Sync** — connect your Google account and push/pull data to your own Google Drive; private appDataFolder storage, session refresh, and cloud backup deletion
- **User profile** — add name and photo in Preferences; personalized "Welcome back, [name]" greeting with profile photo on the dashboard
- **Inline category management** — add, edit, and delete categories directly from the Add Transaction page; dedicated Categories page removed from navigation
- **Split entry editing** — edit amount, note, and date of existing split entries; delete entries from the person detail view
- **Feedback page** — report bugs, request features, or send feedback via EmailJS; accessible from sidebar and Preferences
- **PWA install prompt** — native "Install SpendTrak" banner for supported browsers; dismissible with localStorage persistence
- **Enhanced analytics** — average daily spend, savings rate, transaction count stats; spending by day of week chart; top 5 expenses list; dark mode chart fixes
- **Compact Preferences** — dashboard toggles collapsed into a single expandable "Customize dashboard" row; backup section streamlined into Export/Import dropdown buttons
- **Rotating feedback label** — sidebar feedback link cycles between "Feedback", "Suggestions", and "Report Bug" daily
- **SEO overhaul** — rich metadata, Open Graph/Twitter cards, JSON-LD structured data, per-page titles, sitemap.xml, robots.txt, web manifest

### v1.4
- **Enhanced analytics** — credit card utilization, per-account analytics, category comparison with month-by-month pickers
- **Multi-account filter** — select multiple accounts in analytics to filter data globally
- **PDF & XLSX export** — export analytics with chart screenshots; export data as formatted PDF reports or multi-sheet Excel workbooks
- **Excel with charts** — chart images embedded in a dedicated "Charts" sheet using ExcelJS
- **Month-based comparison** — compare specific months (e.g., Jan 2026 vs Feb 2026) instead of relative periods
- **Custom account types** — add types like Bitcoin, investment with custom icons via a + button
- **Bank sub-types** — savings, current, salary, fixed deposit, recurring deposit
- **Card sub-types** — debit card vs credit card; credit-specific fields only appear for credit cards
- **Account analytics link** — chart icon on each account card navigates to per-account analytics
- **Sample data expanded** — 4 months of realistic transactions across 6 accounts with splits, transfers, and planned payments

### v1.3
- **Renamed to SpendTrak**
- **App lock: PIN or password** — choose between a 4-digit PIN (keypad) or a text password
- **Lock timeout settings** — configurable delay before locking (immediately, 30s, 1 min, 5 min)
- **Split tracker: account selection** — "They paid for me" now optionally updates your bank balance
- **Backup reminder notifications** — periodic nudge every 7 days to export your data
- **Multi-select transaction filters** — select multiple categories and accounts in the filter modal
- **Mobile three-dot menu** — transaction edit/delete actions behind a three-dot popover on mobile
- **Landing page** — full single-page design with scroll-triggered reveal animations, feature showcase, how-it-works, and FAQ schema for SEO

### v1.2
- **Migrated to Next.js 15 App Router** for improved SEO and performance
- Enhanced SEO with proper meta tags, Open Graph, and robots.txt

### v1.1
- Reminders with daily/weekly scheduling and browser notifications
- Privacy mode to hide all monetary amounts on the dashboard
- Customizable home page (toggle accounts section, balance stats)
- Drag-and-drop / arrow reorder for accounts and categories

### v1.0
- Initial release with dashboard, multi-account support, transactions, categories, analytics, sample data, and responsive design
