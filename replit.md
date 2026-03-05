# Mente Financeira — Prosperar é Viver

## Overview
Premium financial SaaS app for SGS Group brand (Brazil + Europe). Features the "6 accounts" financial method with income distribution, transaction tracking, commitment projections, and an ecosystem dashboard.

## Architecture
- **Frontend**: React + Vite + TypeScript, Shadcn UI, TailwindCSS, Wouter routing, TanStack Query
- **Backend**: Express.js + TypeScript, PostgreSQL (Drizzle ORM), express-session
- **Auth**: Email/password (bcryptjs), session-based (connect-pg-simple)
- **Payments**: Stripe integration via Replit Connectors (stripe-replit-sync)
- **Fonts**: Playfair Display (display) + DM Sans (body)

## Key Features
- Multi-user authentication (register/login with email+password)
- 15-day free trial for new users
- Stripe subscription billing (R$ 49/mês Premium plan)
- 6 accounts financial method with configurable percentages
- Income distribution across accounts by percentage
- Transaction tracking (income/expense)
- Projection system with commitments (localStorage-based)
- Dashboard with alerts and motivational messages

## Database Schema
- `users`: id (serial), name, email, passwordHash, currency, trialStartDate, trialEndDate, stripeCustomerId, stripeSubscriptionId, subscriptionStatus, createdAt
- `accounts`: id (serial), userId, name, percentage, balance (cents), color
- `transactions`: id (serial), userId, accountId, description, amount (cents), type, date, isRecurring, category
- `stripe.*`: Managed by stripe-replit-sync (products, prices, subscriptions, etc.)

## Important Notes
- Amounts stored in **cents** — divide by 100 for display, multiply by 100 on input
- Commitments (projections) stored in `localStorage` key `sgs_commitments_v1`
- Session secret from `SESSION_SECRET` env var
- Stripe connector: `connection:conn_stripe_01KJYXD88BBD71F7JEDMHSGHJ1`
- Stripe product: "Mente Financeira Premium" with monthly (R$49) and yearly (R$470) prices

## File Structure
- `shared/schema.ts` — Database schema, Zod schemas, types
- `shared/routes.ts` — API contract definitions
- `server/index.ts` — Express server with session, Stripe webhook, initialization
- `server/routes.ts` — API routes with auth middleware
- `server/storage.ts` — Database operations (IStorage interface)
- `server/stripeClient.ts` — Stripe client via Replit Connectors
- `server/webhookHandlers.ts` — Stripe webhook processing
- `server/seed-stripe-products.ts` — Script to create Stripe products
- `client/src/App.tsx` — Main app with auth-protected routing
- `client/src/hooks/use-auth.tsx` — Auth context provider
- `client/src/hooks/use-finance.ts` — Financial data hooks
- `client/src/pages/AuthPage.tsx` — Login/Register page
- `client/src/pages/Dashboard.tsx` — Main dashboard
- `client/src/pages/Plans.tsx` — Subscription plans with Stripe checkout
- `client/src/components/layout/MainLayout.tsx` — App layout with user menu
- `client/src/components/layout/AppSidebar.tsx` — Navigation sidebar
