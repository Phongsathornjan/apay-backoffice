# APay Backoffice

Modern fintech backoffice for the APay Payment Gateway. It covers PromptPay QR
creation, KBank notification matching, prepaid subscriptions/quota, multi-key API
access and role-scoped analytics for `admin` and `business` users.

## Stack

- Next.js `16.4.2` (App Router, Turbopack, Cache Components)
- React `19.3.0`
- TypeScript strict mode
- Tailwind CSS 4
- Recharts 3
- Lucide icons

## Requirements

- Node.js 20.9+
- pnpm 11+
- APay Backend running at `http://localhost:3000`

## Setup

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open [http://localhost:3001](http://localhost:3001).

The dev/start port comes from `PORT` in `.env.local` (or `.env`), read by
`scripts/next-with-env.mjs`. Shell env wins over the files, and a CLI flag wins
over both:

```bash
PORT=4000 pnpm dev
pnpm dev --port 4000
```

The backend from the [API docs](https://github.com/Phongsathornjan/apay-backend/blob/main/api-docs.html)
uses port `3000`, so the frontend is normally run on `3001`. If the backend
runs elsewhere, set:

```env
NEXT_PUBLIC_API_BASE_URL=https://api.example.com
```

The client always appends `/api/v1`.

## Routes

| Route | Access | Purpose |
| --- | --- | --- |
| `/login` | Public | Username/password login and role-based redirect |
| `/dashboard` | Admin, Business | Merchant KPIs, GMV/AOV, QR usage, rate limit and status charts |
| `/api-keys` | Admin, Business | Multi-key management, one-time reveal, usage drawer and analytics |
| `/subscription` | Admin, Business | Paid-through, quota burn-down, billing history and package comparison |
| `/payments` | Admin, Business | PromptPay QR playground, countdown and live order inspector |
| `/admin/dashboard` | Admin | MRR/ARR, platform GMV, webhook match rate and actionable alerts |
| `/admin/businesses` | Admin | Search/filter/sort, register business, assign package and renew |
| `/admin/packages` | Admin | Master package CRUD with soft-delete conflict handling |

Admin users can pick a merchant through the **Business Switcher** in the topbar
to view merchant pages in that business context.

## Architecture

```text
app/                  Next.js routes and global error/404 surfaces
components/
  admin/              package, business and renewal modals
  api-keys/           one-time key reveal, edit and usage drawer
  auth/               session provider and role guard
  charts/             responsive Recharts wrappers and chart states
  dashboard/          KPI cards, subscription banner and date range picker
  layout/             app shell, sidebar, health indicator and business switcher
  ui/                 design-system primitives (button, modal, toast, etc.)
lib/
  auth/storage.ts     localStorage external store + token session shape
  hooks/              data fetching and debouncing helpers
  date-range.ts       Asia/Bangkok date range presets and validation
  format.ts           THB, percentages, dates and tabular number formatting
services/
  api.ts              HTTP client, envelopes, correlation IDs and token rotation
  auth.ts, dashboard.ts, api-keys.ts, packages.ts, subscriptions.ts, payments.ts
types/
  api.ts              API v1 request/response contracts from the API docs
```

### API contract

The [API docs](https://github.com/Phongsathornjan/apay-backend/blob/main/api-docs.html)
are the single source of truth. The HTTP client in `services/api.ts`:

- calls `/api/v1/...` using `NEXT_PUBLIC_API_BASE_URL`
- attaches `Authorization: Bearer <access_token>`
- sends and reads `x-correlation-id`
- unwraps the `{ ok, status, correlation_id, data }` success envelope
- maps `{ ok: false, status, correlation_id, message }` to a typed `ApiError`
- retries one time after a `401` through `/auth/refresh`
- rotates and persists both access and refresh tokens
- clears the session and returns to `/login` when refresh fails

Every mutation surfaces the API message and `correlation_id` in the toast.

### Role scoping

- `business` users always use `business_id` from their JWT and never from UI input.
- `admin` users must select a business for merchant APIs and send
  `?business_id=<uuid>`.
- Client-side route guards block `/admin/*` for non-admin sessions; backend
  authorization remains authoritative.

### Auth storage

Tokens are kept in `localStorage` via a `useSyncExternalStore`-backed session
store so login, refresh rotation and cross-tab changes stay in sync. For a
production deployment with a same-origin backend, prefer an httpOnly-cookie BFF
instead of exposing tokens to JavaScript.

### Payment matching

Matching is amount-based only: the backend reserves a `0.01–0.99` decimal
reference for each order and pairs it with the KBank transfer notification
(`POST /api/v1/webhooks/kbank/ios-notify`). The backoffice does not parse or
simulate payment notifications — it creates QR orders and polls
`GET /payments/orders/:id` every 3 seconds until the order becomes `PAID`.

Merchant webhook callbacks to a merchant server are separate from this flow and
are not consumed by the backoffice UI.

## Useful commands

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm build
pnpm start
```

## UX notes

- THB uses `฿` with exactly two decimal places and tabular numerals.
- All business dates and chart buckets are shown in `Asia/Bangkok` (UTC+7).
- Date ranges are limited to 365 days; `interval=hour` is limited to 31 days.
- API Key creation shows the raw key once with a required acknowledgement.
- `409` package deletion conflicts and API-key slot limits are handled inline.
- `429` responses clearly distinguish monthly quota from hourly rate limits.
- Loading, empty, permission and error states are implemented for every page.
