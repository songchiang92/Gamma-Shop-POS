# Test accounts

Reference for the demo accounts used to log into Gamma Shop locally. Verified against the running
database on 2026-08-22 — these are the only three accounts that currently exist.

## The three accounts

| Role | Email | Password | Lands on | What to test with it |
|---|---|---|---|---|
| **Admin** | `admin@gammashop.local` | `Admin123!` | Access Control | Everything: products, promotions, payment reconciliation, refund approval, reports/exports, user accounts, plus everything Staff can do |
| **Staff** | `staff@gammashop.local` | `Staff123!` | Order Queue | Order queue (assign/status/notes/invoice), Shipments (van routing), Audit log |
| **Customer** | `customer@gammashop.local` | `Customer123!` | Shop | Browse, cart, checkout, pay (mock gateway), track orders, request refunds, profile |

All three use the same login form at the Auth page — one shared login, routed by role after signing in.

## Guest access

No account needed — click **Continue as guest** on the Auth page's Guest tab. Lets you browse and
build a cart without registering; converts to a real account (cart included) the moment you log in
or register.

## Where these come from

- Created automatically by `DataSeeder.java` the first time the backend starts against an empty
  `users` table. It checks `existsByEmail` first, so it's safe to restart the app repeatedly — it
  won't duplicate or reset them.
- Controlled by `app.seed.enabled` in `application.yml` (`true` by default). Set to `false` to stop
  auto-seeding, e.g. for a deployment where you don't want demo accounts to exist.
- Passwords are BCrypt-hashed in the database — the plaintext values above only exist because
  `DataSeeder.java` documents them in its own comment and this file.

## Good to know

- **Case-sensitive**, including the trailing `!` on each password.
- Session persists 5 minutes after closing the tab — reopening within that window logs you back in
  automatically without re-entering these.
- If you ever need to confirm what accounts actually exist (e.g. after testing user creation/disable
  flows), log in as admin and check **Access Control → User accounts**, or `GET /api/admin/users`.

## Quick API login (for curl/Playwright/etc.)

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gammashop.local","password":"Admin123!"}'
```

Swap the email/password for staff or customer. Response includes `accessToken` (use as
`Authorization: Bearer <token>`) and `refreshToken`. Access tokens expire after 30 minutes
(`app.jwt.access-token-minutes` in `application.yml`).
