# Mente Financeira — Prosperar é Viver

## Overview
Premium financial SaaS app for SGS Group brand (Brazil + Europe). Features the "6 accounts" financial method with income distribution, transaction tracking, commitment projections, and an ecosystem dashboard. Full financial transformation ecosystem with tiered pricing.

## Architecture
- **Frontend**: React + Vite + TypeScript, Shadcn UI, TailwindCSS, Wouter routing, TanStack Query
- **Backend**: Express.js + TypeScript, PostgreSQL (Drizzle ORM), express-session
- **Auth**: Email/password (bcryptjs), session-based (connect-pg-simple)
- **Payments**: Stripe integration via Replit Connectors (stripe-replit-sync)
- **Fonts**: Playfair Display (display) + DM Sans (body)

## Pricing Tiers (all one-time EUR payments)
- **Free Trial**: 15 days, basic dashboard, limited projections
- **Mente Financeira App** (€47): Full app access, 6 accounts, distribution, reports
- **Método Mente Financeira** (€197): App + financial method training, 5 accounts guide, video lessons
- **Mentoria Transformação Financeira** (€697): Everything + 3-month mentorship, 3 live sessions, private community, lifetime access

## Key Features
- Multi-user authentication (register/login with email+password, bcrypt 12 rounds)
- GDPR compliance: consent checkbox on registration, Privacy Policy & Terms of Use pages
- 15-day free trial for new users
- Tiered one-time payment plans via Stripe (€47 / €197 / €697)
- Plan upgrades between tiers
- Dashboard upgrade prompts for Method and Mentorship
- 6 accounts financial method with configurable percentages
- Income distribution across accounts by percentage
- Transaction tracking (income/expense) with custom date picker
- Projection system with commitments (localStorage-based)
- Dashboard with alerts and motivational messages
- AI Mentor: dynamic motivational messages based on financial context
- PWA (Progressive Web App): installable on mobile/desktop, offline-capable
- Fully mobile-responsive layout across all pages
- Footer with Privacy Policy, Terms of Use, and GDPR Compliance links

## Database Schema
- `users`: id (serial), name, email, passwordHash, currency, trialStartDate, trialEndDate, stripeCustomerId, stripeSubscriptionId, subscriptionStatus, **planTier** (free|app|method|mentoria), createdAt
- `accounts`: id (serial), userId, name, percentage, balance (cents), color
- `transactions`: id (serial), userId, accountId, description, amount (cents), type, date, isRecurring, category
- `stripe.*`: Managed by stripe-replit-sync (products, prices, subscriptions, etc.)

## Important Notes
- Amounts stored in **cents** — divide by 100 for display, multiply by 100 on input
- Commitments (projections) stored in `localStorage` key `sgs_commitments_v1_user_${userId}`
- Session secret from `SESSION_SECRET` env var
- Stripe connector: `connection:conn_stripe_01KJYXD88BBD71F7JEDMHSGHJ1`
- Stripe products: "Mente Financeira App" (€47), "Método Mente Financeira" (€197), "Mentoria Transformação Financeira" (€697)
- Default currency: EUR (Ireland/Europe focus)
- All plans use one-time payment mode (no subscriptions)
- Plan tier hierarchy: free < app < method < mentoria
- Purchase sync endpoint: POST /api/stripe/sync-purchase

## File Structure
- `shared/schema.ts` — Database schema, Zod schemas, types
- `shared/routes.ts` — API contract definitions
- `server/index.ts` — Express server with session, Stripe webhook, initialization
- `server/routes.ts` — API routes with auth middleware
- `server/storage.ts` — Database operations (IStorage interface)
- `server/stripeClient.ts` — Stripe client via Replit Connectors
- `server/webhookHandlers.ts` — Stripe webhook processing
- `server/seed-stripe-products.ts` — Script to create Stripe products (3 tiers)
- `client/src/App.tsx` — Main app with auth-protected routing
- `client/src/hooks/use-auth.tsx` — Auth context provider
- `client/src/hooks/use-finance.ts` — Financial data hooks
- `client/src/pages/AuthPage.tsx` — Login/Register page
- `client/src/pages/Dashboard.tsx` — Main dashboard with upgrade prompts
- `client/src/pages/Plans.tsx` — Pricing page with 4 plan cards (trial + 3 paid)
- `client/src/pages/MentoriaWelcome.tsx` — Post-purchase mentoring welcome page
- `client/src/components/layout/MainLayout.tsx` — App layout with user menu
- `client/src/pages/PrivacyPolicy.tsx` — GDPR Privacy Policy (public, no auth)
- `client/src/pages/TermsOfUse.tsx` — Terms of Use (public, no auth)
- `client/src/components/layout/AppSidebar.tsx` — Navigation sidebar
