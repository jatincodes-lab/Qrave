# Hardcore Test Audit - 2026-06-25

This document records the first hard audit pass across the Qrave frontend and backend. No source changes were made during this audit.

## Critical / High

### 1. Public order tracking can expose customer/order data

`src/backend/QRApp.Api/Endpoints/PublicOrderEndpoints.cs`

Status: fixed.

`GET /api/v1/public/qr/{qrToken}/orders/{orderId}` was anonymous. With a valid `qrToken` and `orderId`, the public order response could include customer name, WhatsApp number, notes, totals, and order items.

Risk: anyone with a shared/leaked order URL can view customer/order details.

Recommended fix: require `X-Customer-Device-Token` for public order reads, or issue a signed tracking token at order creation and validate it on read.

Implemented fix: new orders now receive an order-scoped tracking token. Public order reads require either `X-Order-Tracking-Token` for that exact order or a valid `X-Customer-Device-Token` for returning-customer history links. The raw token stays in the browser; only SHA-256 hashes are stored server-side.

### 2. Public feedback can be overwritten by anyone with the order URL

`src/backend/QRApp.Api/Endpoints/FeedbackEndpoints.cs`

Public feedback create/read endpoints are anonymous. The database function uses `ON CONFLICT ("OrderId") DO UPDATE`, so a shared/leaked order URL can modify existing feedback.

Risk: feedback integrity can be manipulated and restaurant owners may see fake customer feedback.

Recommended fix: require the same customer device token used for cancellation, or generate a feedback-only signed token.

### 3. Admin and superadmin tokens are stored in localStorage

`src/frontend/lib/auth.ts`

Admin and superadmin JWTs are stored in `localStorage`.

Risk: any XSS or malicious third-party script can steal bearer tokens and impersonate admin/superadmin users.

Recommended fix: move auth tokens to secure httpOnly cookies. If that is not immediately possible, add a strict CSP, shorten token lifetime, and reduce script injection surface.

## Medium

### 4. No rate limiting or login lockout found

No `RateLimiter`, login lockout, throttle, CAPTCHA, or similar control was found.

Affected surfaces include:

- Admin login
- Superadmin login/bootstrap
- Public order creation
- Promo-code validation
- Waiter calls
- Feedback submission

Risk: brute force, credential stuffing, promo-code probing, and public endpoint spam.

Recommended fix: add ASP.NET rate limiting per IP and route, plus login backoff/lockout.

### 5. Frontend lint script is broken

Command:

```powershell
npm run lint
```

Result:

```text
Invalid project directory provided, no such directory: ...\src\frontend\lint
```

Cause: `next lint` is not valid with the current Next.js version.

Recommended fix: add ESLint directly or replace the script with a working lint/check command.

### 6. Dependency audit reports moderate vulnerabilities

Command:

```powershell
npm audit --audit-level=moderate
```

Result: 2 moderate vulnerabilities from vulnerable `postcss` bundled through `next@16.2.6`.

Recommended fix: upgrade Next.js when a patched stable version is available. Do not blindly run `npm audit fix --force`, because it suggests a breaking downgrade.

### 7. Dashboard can silently show incorrect zero data

`src/frontend/app/admin/dashboard/page.tsx`

`safeDashboardRequest` returns fallback empty data for every non-401 API failure.

Risk: revenue/orders/customers can appear as zero while report APIs are failing, which creates bad business decisions.

Recommended fix: show partial-load warnings and mark affected cards/charts as unavailable instead of showing zero.

### 8. Default/development secrets are committed

Files:

- `src/backend/QRApp.Api/appsettings.json`
- `src/backend/QRApp.Api/appsettings.Development.json`

Findings:

- Default JWT signing key exists in committed config.
- Development database password exists in committed config.

Risk: accidental production deployment with weak/default signing key, and leakage of local credentials.

Recommended fix: fail startup if production uses default JWT values. Keep real development passwords out of committed config.

## Validation Results

### Passed

- Frontend production build passed.
- .NET tests passed once using cached packages.
- Backend API projects compiled during release build.

### Failed / Needs Attention

- Frontend lint failed because the lint script is broken.
- `npm audit` failed due 2 moderate dependency vulnerabilities.
- Full .NET release solution build failed when the test project tried to reach NuGet and hit SSL/credential errors.

## Operational Note

JWTs were pasted during debugging. If those were real production tokens, rotate/revoke them immediately.
