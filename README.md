# SplitWISER

Smart group expense splitting for trips — powered by AI.

## Features

- **Trip Groups** — Create groups, invite friends, manage members
- **Expense Tracking** — Add expenses with flexible splitting (equal, %, custom)
- **Expense Editing** — Edit existing expenses with pre-populated forms
- **Search & Filter** — Filter expenses by description, category, date range
- **AI Import** — Upload receipts, screenshots, PDFs, or CSV/Excel and let AI extract expense data
- **Debt Simplification** — Optimized settlement plan that minimizes transactions
- **Real-time Balances** — Per-user contribution, net balance, debts graph
- **Data Visualization** — Contribution charts, balance bars, category pie charts, debt flow diagrams
- **Settle Up** — Record and confirm payments between members
- **Activity Timeline** — Unified feed of expenses and settlements grouped by date
- **CSV Export** — Export expenses and balance summaries as CSV files
- **User Profile** — Edit name and change password
- **Rate Limiting** — Tiered rate limiting (auth, API, upload)
- **Security Headers** — X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TailwindCSS, React Query, Zustand |
| Backend | Node.js, Express, Prisma ORM |
| Database | PostgreSQL |
| AI Pipeline | Tesseract.js OCR, Sharp preprocessing, OpenAI GPT-4o parsing |
| File Parsing | SheetJS (Excel), csv-parse (CSV), pdf-parse (PDF) |

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- OpenAI API key (for AI features)

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your database URL, JWT secret, and OpenAI key

# 3. Set up database
npx prisma migrate dev --name init
npx prisma generate

# 4. (Optional) Seed demo data
npm run db:seed

# 5. Start development
npm run dev
```

The app runs on:
- **Frontend**: http://localhost:3000
- **API**: http://localhost:4000

### Docker

```bash
# Set your OpenAI key
export OPENAI_API_KEY=sk-...

# Start everything
docker-compose up -d
```

## Project Structure

```
SplitWISER/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Landing page
│   ├── login/             # Auth pages
│   ├── register/
│   ├── dashboard/         # Main dashboard
│   ├── profile/           # User profile & settings
│   ├── invite/            # Invite acceptance page
│   └── groups/
│       ├── new/           # Create trip
│       ├── [id]/          # Trip detail (expenses, balances, members, activity)
│       │   ├── expenses/
│       │   │   ├── new/           # Add expense form
│       │   │   └── [expenseId]/
│       │   │       ├── page.tsx   # Expense detail
│       │   │       └── edit/      # Edit expense form
│       │   └── import/            # AI import page
│       └── page.tsx       # All trips list
├── components/            # React components
│   ├── layout/            # Navbar, AuthLayout
│   ├── ui/                # Avatar, Spinner, EmptyState, ErrorBoundary
│   ├── charts/            # Recharts visualizations
│   ├── ActivityTimeline.tsx
│   └── Providers.tsx      # React Query provider
├── stores/                # Zustand state stores
│   ├── authStore.ts
│   └── expenseFormStore.ts
├── lib/                   # Utilities
│   ├── api.ts             # API client
│   ├── hooks.ts           # React Query hooks
│   └── utils.ts           # Helpers
├── types/                 # TypeScript types
├── server/                # Express backend
│   ├── index.ts           # Server entry
│   ├── lib/prisma.ts      # Prisma client
│   ├── middleware/
│   │   ├── auth.ts        # JWT auth
│   │   └── rateLimiter.ts # Rate limiting (auth, API, upload)
│   ├── routes/
│   │   ├── auth.ts        # Register, login, me, profile, password
│   │   ├── groups.ts      # CRUD groups, invites
│   │   ├── expenses.ts    # CRUD expenses
│   │   ├── settlements.ts # Balances, settlements
│   │   ├── import.ts      # File upload + AI parse
│   │   ├── export.ts      # CSV export (expenses, summary)
│   │   └── activity.ts    # Activity feed
│   └── services/
│       ├── debtEngine.ts  # Debt simplification algorithm
│       ├── ocr.ts         # Tesseract OCR + Sharp preprocessing
│       ├── aiParser.ts    # OpenAI LLM parsing
│       └── spreadsheet.ts # Excel/CSV parsing
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Demo data
├── docker-compose.yml
├── Dockerfile
└── package.json
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/profile` | Update profile (name) |
| PUT | `/api/auth/password` | Change password |
| GET | `/api/groups` | List user's groups |
| POST | `/api/groups` | Create group |
| GET | `/api/groups/:id` | Get group detail |
| PUT | `/api/groups/:id` | Update group |
| DELETE | `/api/groups/:id` | Delete group |
| POST | `/api/groups/:id/invite` | Invite user |
| POST | `/api/groups/invite/:token/accept` | Accept invite |
| GET | `/api/expenses/group/:groupId` | List group expenses |
| POST | `/api/expenses` | Create expense |
| PUT | `/api/expenses/:id` | Update expense |
| DELETE | `/api/expenses/:id` | Delete expense |
| GET | `/api/settlements/group/:groupId/balances` | Get balances + settlement plan |
| POST | `/api/settlements` | Record settlement |
| PUT | `/api/settlements/:id/confirm` | Confirm settlement |
| POST | `/api/import/upload` | Upload receipt/file for AI parsing |
| POST | `/api/import/text` | Parse pasted text with AI |
| GET | `/api/export/group/:groupId/csv` | Export expenses as CSV |
| GET | `/api/export/group/:groupId/summary` | Export balance summary as CSV |
| GET | `/api/activity/group/:groupId` | Get activity feed |

## Debt Simplification Algorithm

The engine uses a greedy min-transactions algorithm:

1. Calculate net balance per user (paid − owed)
2. Separate into creditors (+) and debtors (−)
3. Sort both by amount descending
4. Match largest debtor with largest creditor
5. Transfer `min(debt, credit)` — one zeroes out
6. Repeat until all settled

**Example:**
- A paid $150, owes $100 → net +$50
- B paid $0, owes $100 → net −$100
- C paid $100, owes $50 → net +$50

Settlement: **B pays $50 to A, B pays $50 to C** (2 transactions instead of many)
