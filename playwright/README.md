# Gamma Shop — Playwright end-to-end tests

Drives the real **gamma-shop-ui** against the real **gamma-shop-api** and walks every
spreadsheet function through the browser, for **customer**, **staff** and **back office**.

## What it covers

| Spec | Roles | Flow |
|---|---|---|
| `full-purchase-to-refund.spec.js` | customer → staff → admin | register → browse/search/filter → product popup → cart + `WELCOME10` → checkout with address → pay via mock gateway → request refund → **(staff)** find in queue → assign → PROCESSING → packed → note → route onto a van → dispatch (→ SHIPPED) → completed → invoice PDF → **(admin)** approve refund → reconcile payments → verify in **audit log** + **revenue report** |
| `customer-guest-and-account.spec.js` | guest → customer | browse as guest → build cart → register at checkout (cart carries over) → place order → cancel while unpaid → update profile → read notifications → request password reset |
| `admin-catalogue.spec.js` | admin | create product → set/restock stock → create promotion → target a product → broadcast → run + export a report → view access-control matrix + users → delete promotion + product |

## Prerequisites

1. **MySQL** running with the `gamma_shop` schema loaded (`gamma-shop-api/sql/schema.sql`)
   and the demo users seeded (default `app.seed.enabled: true`).
2. **API** running: `../gamma-shop-api` → `http://localhost:8080`.
3. **UI** running: `cd ../gamma-shop-ui && npm run dev` → `http://localhost:5173`.
4. Install this project once:

   ```bash
   npm install
   npm run install:browsers   # downloads the Chromium build Playwright uses
   ```

## Run

```bash
npm test                 # headless, all specs
npm run test:headed      # watch it in a real browser
npm run test:ui          # Playwright's interactive UI mode
npm run report           # open the HTML report after a run

# point at a UI on another host/port:
BASE_URL=http://localhost:4173 npm test
```

Tests run **serially with one worker** — `full-purchase-to-refund` moves a single order
through three roles and shares database state, so parallelism would corrupt it.

## Screenshots

`shot('label')` (the `shot` fixture) takes a numbered, full-page screenshot and attaches it
to the HTML report. They are also written to:

```
screenshots/<test-title>/01-<label>.png, 02-<label>.png, ...
```

Screenshots are taken **before every navigation to another page**, **after every popup /
modal / confirm-dialog interaction**, and **on the final verification screen** of each spec.

## Structure

```
playwright/
├── playwright.config.js       one Chromium project, serial, baseURL from BASE_URL
├── utils/
│   ├── safeAction.js          safeClick / safeFill / safeSelect / safeCheck
│   ├── fixtures.js            `test` with the shot() + auto-accept-dialog fixtures
│   └── accounts.js            demo credentials + freshCustomer()
├── pages/                     Page Object Model — one class per screen
│   ├── BasePage.js            test-id lookup, nav bar, logout, id-by-prefix helpers
│   ├── Shell.js               BasePage with no extras (for nav-only steps)
│   ├── AuthPage.js  ShopPage.js  CartPage.js  OrdersPage.js  ProfilePage.js
│   ├── OrderQueuePage.js  ShipmentsPage.js  AuditPage.js
│   └── ProductsPage.js  PromotionsPage.js  RefundsPage.js  PaymentsPage.js
│       ReportsPage.js  AccessControlPage.js
└── tests/                     the three specs above
```

### `safeAction.js`

Every interaction goes through one of `safeClick`, `safeFill`, `safeSelect`, `safeCheck`.
Each one:

1. **verifies the locator is present** — attached (`toHaveCount(1)`), `toBeVisible()`,
   `toBeEnabled()` — with a labelled error message, *before* interacting;
2. performs the action;
3. waits **0.3 s** (`STEP_DELAY_MS`) so the run is watchable and the DOM settles.

Page objects target elements by the `data-testid` attributes the UI already ships (e.g.
`nav-queue`, `add-to-cart-<id>`, `queue-update-status`, `refund-approve-<id>`).

## Notes / assumptions

- "Theoretical" end-to-end: it assumes a fresh-ish DB. Re-runs are self-contained where
  possible (each run registers a new unique customer), but seeded stock is finite — reload
  `schema.sql` if products run out.
- `window.confirm()` prompts (delete account/product/promotion, disable user, dispatch/cancel
  van) are **auto-accepted** by the `autoDialog` fixture.
- The mock payment gateway is exercised through the UI buttons
  (*Simulate payment success/failure*), not a real card page.
