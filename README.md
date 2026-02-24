# Spendimeter

A personal finance tracker built with React. Track expenses, income, and transfers across multiple accounts — all stored locally in your browser.

## Features

- **Dashboard** — at-a-glance view of monthly expenses or total balance, recent transactions, and account summaries
- **Multi-account support** — bank accounts, credit/debit cards, cash, and wallets (UPI)
- **Transactions** — add, edit, and delete expenses, income, and account-to-account transfers
- **Categories & subcategories** — organize spending with customizable expense and income categories
- **Reorder** — drag or use arrow controls to reorder accounts and categories; order is respected everywhere
- **Analytics** — pie charts, bar charts, and line charts with flexible time periods (this month, last month, this year, last 30 days, custom range)
- **Reminders** — daily or weekly browser notifications at a custom time to log your expenses
- **Privacy mode** — hide all monetary amounts on the dashboard with a single toggle
- **Customizable home page** — toggle balance vs. expenses view, show/hide accounts section, show/hide income & expense stats
- **Preferences** — currency selection (25+ currencies), confirm-before-delete, default transaction type, and more
- **Sample data** — one-click demo data to explore the app, with easy removal
- **Responsive** — mobile-first design with bottom navigation; desktop layout with sidebar
- **Offline & private** — all data stored in localStorage, no server required

## Tech Stack

| Layer | Tool |
|-------|------|
| Framework | React 19 |
| Routing | React Router 6 |
| State | Context API + useReducer |
| Charts | Recharts |
| Dates | date-fns |
| IDs | uuid |
| Build | Vite 5 |
| Styling | Custom CSS with CSS variables |

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Changelog

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
