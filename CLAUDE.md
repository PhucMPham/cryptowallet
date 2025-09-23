# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cryptocurrency portfolio tracker built with Better-T-Stack - a full-stack TypeScript monorepo using Next.js, Hono, tRPC, and Drizzle ORM.

## Development Commands

### Quick Start
```bash
bun install          # Install dependencies
bun dev              # Start all services (web:3001, server:3003)
```

### Individual Services
```bash
bun dev:web          # Frontend only (Next.js on port 3001)
bun dev:server       # Backend only (Hono on port 3003)
```

### Database Operations
```bash
cd apps/server && bun db:local   # Initialize local SQLite
bun db:push                       # Apply schema changes to database
bun db:studio                     # Open Drizzle Studio UI
bun db:generate                   # Generate new migrations
```

### Build & Type Checking
```bash
bun build            # Build all applications
bun check-types      # TypeScript checking across monorepo
```

## Architecture & Data Flow

### Tech Stack
- **Runtime**: Bun 1.2.22
- **Frontend**: Next.js 15.5.0 (App Router) + React 19.1.0
- **Backend**: Hono 4.8.2 + tRPC 11.5.0
- **Database**: SQLite + Drizzle ORM 0.44.2
- **UI**: TailwindCSS + shadcn/ui components
- **State**: TanStack Query for server state

### Data Flow Pattern
```
Next.js Frontend (3001)
  ↓ tRPC client
  ↓ Type-safe API calls
Hono Backend (3003)
  ↓ tRPC router
  ↓ Drizzle ORM
SQLite Database (local.db)
```

### Database Schema

**Core Tables:**
- `crypto_asset`: Stores cryptocurrency symbols (BTC, ETH, etc.)
- `crypto_transaction`: Records buy/sell transactions with fee tracking

**Key Features:**
- Fee currency selection (USD or crypto)
- Automatic fee conversion with real-time pricing
- DCA (Dollar Cost Averaging) calculations
- Portfolio analytics (P&L, average buy price)

### File Organization

```
apps/web/src/
├── app/crypto/           # Crypto portfolio pages
│   ├── page.tsx         # Main portfolio view
│   └── [id]/page.tsx    # Asset detail view
├── components/          # Shared UI components
└── utils/              # API client and utilities

apps/server/src/
├── routers/            # tRPC API routes
│   └── crypto.ts      # Crypto operations
├── db/                # Database layer
│   └── schema/        # Drizzle schemas
└── services/          # Business logic
    └── priceService.ts # Crypto price fetching
```

## Key Implementation Patterns

### API Calls (tRPC)
```typescript
// Frontend: Type-safe API calls
const { data } = api.crypto.getAssets.useQuery();
await api.crypto.addTransaction.mutate({ ... });

// Backend: Router definition
export const cryptoRouter = router({
  getAssets: publicProcedure.query(async () => { ... }),
  addTransaction: publicProcedure.input(schema).mutation(async ({ input }) => { ... })
});
```

### State Management
- Server state via TanStack Query (automatic caching/refetching)
- Local form state via React useState
- No global client state store needed

### Date Handling
- Use `getDefaultTransactionDate()` from `utils/date.ts` to avoid hydration mismatches
- Initialize dates client-side in useEffect

## Common Tasks

### Adding New Crypto Features
1. Update schema in `apps/server/src/db/schema/crypto.ts`
2. Create migration: `bun db:generate`
3. Apply migration: `bun db:push`
4. Add tRPC endpoint in `apps/server/src/routers/crypto.ts`
5. Update UI in `apps/web/src/app/crypto/`

### Modifying Transaction Fields
1. Update `cryptoTransaction` schema
2. Modify input validation in router
3. Update form components in frontend
4. Run `bun db:push` to apply changes

### Price Service Integration
- CoinGecko API integration in `priceService.ts`
- Symbol-to-ID mapping for common cryptos
- 1-minute cache to avoid rate limits

## Important Notes

- **Hydration**: Body tag has `suppressHydrationWarning` to handle browser extensions
- **Database**: SQLite file at `apps/server/local.db` (gitignored)
- **Environment**: Server needs `DATABASE_URL` and `CORS_ORIGIN` in `.env`
- **Migrations**: Apply manually with SQLite CLI when schema changes
- **Fee Conversion**: Always stored in USD, original crypto amount preserved in `feeInCrypto`

##TRPC_API_GUIDES docs/TRPC_API_GUIDE.md 
VND is primary display currency and USD should be secondary