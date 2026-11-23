# Gamma Shop API — Endpoint Reference

Every HTTP endpoint the API exposes, grouped by module. This is the same information
Swagger UI shows at **http://localhost:8080/swagger-ui.html** — use Swagger to try calls
interactively; use this file to scan or search.

Base URL: `http://localhost:8080`

---

## Conventions

### Authentication

| Header | Used by | How to get it |
|---|---|---|
| `Authorization: Bearer <accessToken>` | logged-in users | `POST /api/auth/login` or `/register` → `accessToken` (valid 30 min) |
| `X-Guest-Token: <guestToken>` | guests (cart only) | `POST /api/auth/guest` → `guestToken` |

Refresh an expired access token with `POST /api/auth/refresh` (refresh token valid 7 days).

### Access levels used in the tables below

| Level | Meaning |
|---|---|
| **Public** | no token needed |
| **Guest/User** | `X-Guest-Token` **or** `Authorization` (cart endpoints) |
| **User** | any logged-in account (CUSTOMER, STAFF or ADMIN) |
| **Staff+Admin** | role STAFF or ADMIN (`/api/admin/**` base rule) |
| **Admin** | role ADMIN only (method-level `@PreAuthorize`) |

### Error shape

All errors return JSON:

```json
{ "timestamp": "...", "status": 409, "error": "Conflict", "message": "Order is PAID, not awaiting payment" }
```

The UI shows `message`. Common codes: `400` validation, `401` missing/expired token,
`403` wrong role/not your resource, `404` not found, `409` state conflict.

### Pagination

List endpoints that page take `?page=0&size=20` and return:

```json
{ "content": [ ... ], "page": 0, "size": 20, "totalElements": 42, "totalPages": 3 }
```

---

## Authentication — `/api/auth` (Public)

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/api/auth/register` | `{ email, password (≥8), fullName, phone? }` | `201` `AuthResponse` `{ accessToken, refreshToken, tokenType, user }` |
| POST | `/api/auth/login` | `{ email, password }` | `AuthResponse` |
| POST | `/api/auth/refresh` | `{ refreshToken }` | `AuthResponse` (new token pair) |
| POST | `/api/auth/logout` | – | `{ message }` — revokes the caller's refresh tokens |
| POST | `/api/auth/forgot-password` | `{ email }` | `{ message, devResetToken }` (token is in the response because email is disabled in dev) |
| POST | `/api/auth/reset-password` | `{ token, newPassword (≥8) }` | `{ message }` |
| POST | `/api/auth/guest` | – | `201` `{ guestToken, expiresAt, usage }` |
| POST | `/api/auth/guest/convert` | `{ guestToken, email, password, fullName, phone? }` | `201` `AuthResponse` — creates the account **and** merges the guest cart |

New accounts are always `CUSTOMER`. Roles are seeded/managed in the DB, not via the API.

---

## Account — `/api/users` (User)

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/users/me` | – | `UserResponse` `{ id, email, fullName, phone, address, city, role, enabled, createdAt }` |
| PUT | `/api/users/me` | `{ fullName, phone?, address?, city? }` | updated `UserResponse` |
| DELETE | `/api/users/me` | – | `{ message }` — hard-deletes if no orders exist, otherwise disables the account |

---

## Products (catalog) — `/api/products` (Public, read-only)

| Method | Path | Query | Returns |
|---|---|---|---|
| GET | `/api/products` | `page`, `size` | page of `ProductResponse` (active products) |
| GET | `/api/products/{id}` | – | `ProductResponse` `{ id, sku, name, description, price, slotQuantity, availableQuantity, active, images[], promotionCodes[], createdAt }` |
| GET | `/api/products/search` | `q` (required), `page`, `size` | page of `ProductResponse` matching name/SKU |
| GET | `/api/products/filter` | `minPrice?`, `maxPrice?`, `inStock?` (bool), `page`, `size` | page of `ProductResponse` |

`availableQuantity` = physical stock − quantity currently reserved by unpaid orders.

---

## Cart — `/api/cart` (Guest/User)

Works with either token. A guest cart is later merged on login/registration.

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/cart` | – | `CartResponse` `{ cartId, items[], subtotal, updatedAt }` |
| POST | `/api/cart` | – | `CartResponse` — get-or-create |
| POST | `/api/cart/items` | `{ productId, quantity (≥1) }` | `CartResponse` — adds or increments |
| PUT | `/api/cart/items/{productId}` | `{ quantity (≥0) }` | `CartResponse` — `0` removes the line |
| DELETE | `/api/cart/items/{productId}` | – | `CartResponse` |
| DELETE | `/api/cart` | – | `{ message }` — empties the cart |
| POST | `/api/cart/merge` | – (needs **both** `Authorization` and `X-Guest-Token`) | `CartResponse` — folds the guest cart into the user's |

---

## Promotions (customer) — `/api/promotions` (User)

| Method | Path | Query | Returns |
|---|---|---|---|
| GET | `/api/promotions/validate` | `code` | `{ valid, code, discountType, estimatedDiscount }` — estimate is against the caller's current cart; `400` if the cart is empty or the code is invalid |

---

## Orders (customer) — `/api/orders` (User)

Guests cannot check out — convert first via `/api/auth/guest/convert`.

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/api/orders` | `{ promotionCode?, shippingAddress?, shippingCity? }` | `201` `OrderResponse` — address/city fall back to the profile; first address given is saved as the profile default; stock is reserved; status `PENDING_PAYMENT` |
| POST | `/api/orders/preview` | `{ promotionCode? }` | `CheckoutPreviewResponse` `{ subtotal, discountTotal, grandTotal, promotionCode }` — no order created |
| POST | `/api/orders/validate-stock` | – | `{ ok, issues: [ { productId, productName, requested, available } ] }` |
| GET | `/api/orders` | `page`, `size` | page of `OrderResponse` (the caller's own) |
| GET | `/api/orders/{id}` | – | `OrderResponse` `{ id, orderNumber, status, subtotal, discountTotal, grandTotal, promotionCode, userEmail, assignedStaffEmail, shippingAddress, shippingCity, shipmentId, createdAt, items[] }` (owner, or any STAFF/ADMIN) |
| POST | `/api/orders/{id}/cancel` | – | `OrderResponse` — only while `PENDING_PAYMENT`; releases the stock reservation |

### Order lifecycle

```
PENDING_PAYMENT ──pay──▶ PAID ──▶ PROCESSING ──▶ PACKED ──▶ SHIPPED ──▶ COMPLETED
       │                   │           │            │           │
       └──cancel──▶ CANCELLED          └────────────┴───────────┴──▶ REFUNDED (via approved refund)
```

Allowed transitions: `PENDING_PAYMENT→{PAID,CANCELLED}`, `PAID→{PROCESSING,REFUNDED}`,
`PROCESSING→{PACKED,SHIPPED,COMPLETED,REFUNDED}`, `PACKED→{SHIPPED,REFUNDED}`,
`SHIPPED→{COMPLETED,REFUNDED}`, `COMPLETED→{REFUNDED}`.

---

## Payments (customer) — `/api/payments` (User, except the webhook)

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/api/payments/intent/{orderId}` | – | `201` `PaymentIntentResponse` `{ paymentId, intentId, amount, currency, redirectUrl, status }` — reuses an open intent if one exists |
| POST | `/api/payments/retry/{orderId}` | – | `201` `PaymentIntentResponse` — only after the last attempt was `FAILED` or `TIMEOUT` |
| GET | `/api/payments/order/{orderId}` | – | `PaymentResponse[]` `{ id, intentId, amount, currency, status, gatewayRef, attempts, createdAt }` |
| POST | `/api/payments/webhook` | `WebhookRequest` + header `X-Signature` | `{ received: true }` — **Public**; the gateway calls this; verified by HMAC-SHA256 |

Payment statuses: `CREATED → PENDING → SUCCESS | FAILED | TIMEOUT`, plus `REFUNDED`.

### Mock gateway — `/api/mock-gateway` (Public)

Stands in for the external hosted payment page so the flow is testable locally.

| Method | Path | Query | Returns |
|---|---|---|---|
| GET | `/api/mock-gateway/pay/{intentId}` | – | `{ gateway, intentId, instructions }` — the "payment page" |
| POST | `/api/mock-gateway/pay/{intentId}/complete` | `outcome=success` \| `fail` | `{ intentId, outcome, gatewayRef, message }` — signs a webhook and delivers it to `/api/payments/webhook` |

---

## Refunds (customer) — `/api/refunds` (User)

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/api/refunds` | `{ orderId, reason }` | `201` `RefundResponse` `{ id, orderId, orderNumber, requestedByEmail, reason, status, reviewNote, createdAt, reviewedAt }` — order must be paid or later |
| GET | `/api/refunds` | – | `RefundResponse[]` — the caller's own requests |

---

## Notifications — `/api/notifications` (User)

| Method | Path | Returns |
|---|---|---|
| GET | `/api/notifications` | `NotificationView[]` `{ id, type, subject, body, status, createdAt }` — order confirmations, payment results, status updates, promo broadcasts |

---

# Back office

## Order queue / Middle office — `/api/admin/orders` (Staff+Admin)

| Method | Path | Body / Query | Returns |
|---|---|---|---|
| GET | `/api/admin/orders` | `status?`, `userId?`, `page`, `size` | page of `OrderResponse` (all customers) |
| GET | `/api/admin/orders/pending` | `page`, `size` | page of `OrderResponse` with status `PAID` (waiting to be handled) |
| GET | `/api/admin/orders/assignable-staff` | – | `UserResponse[]` — enabled STAFF/ADMIN users, for the assignee picker |
| GET | `/api/admin/orders/{id}` | – | `OrderResponse` |
| POST | `/api/admin/orders/{id}/assign` | `{ staffId }` | `OrderResponse` — target must be STAFF/ADMIN |
| POST | `/api/admin/orders/{id}/status` | `{ status }` | `OrderResponse` — only `PROCESSING`/`PACKED`/`SHIPPED`/`COMPLETED`; transition is validated |
| POST | `/api/admin/orders/{id}/packed` | – | `OrderResponse` — shortcut for `status: PACKED` |
| POST | `/api/admin/orders/{id}/shipped` | – | `OrderResponse` |
| POST | `/api/admin/orders/{id}/completed` | – | `OrderResponse` |
| POST | `/api/admin/orders/{id}/cancel` | – | `OrderResponse` — staff cancel of an unpaid order |
| PATCH | `/api/admin/orders/{id}/address` | `{ shippingAddress, shippingCity }` | `OrderResponse` — fix a delivery address before routing |
| POST | `/api/admin/orders/{id}/notes` | `{ note }` | `OrderNoteResponse` `{ id, authorEmail, note, createdAt }` |
| GET | `/api/admin/orders/{id}/notes` | – | `OrderNoteResponse[]` |
| GET | `/api/admin/orders/{id}/invoice` | – | `application/pdf` (attachment) |

## Shipments / delivery routing — `/api/admin/shipments` (Staff+Admin)

Group paid orders onto vans by delivery city.

| Method | Path | Body / Query | Returns |
|---|---|---|---|
| GET | `/api/admin/shipments/unassigned` | `city?` | `ShipmentOrderResponse[]` — paid/handled orders not yet on a van |
| GET | `/api/admin/shipments` | `status?` = `PLANNING` \| `DISPATCHED` | `ShipmentResponse[]` `{ id, vanLabel, city, capacity, status, orders[], loadedCount, createdAt, dispatchedAt }` |
| GET | `/api/admin/shipments/{id}` | – | `ShipmentResponse` |
| POST | `/api/admin/shipments` | `{ vanLabel, city?, capacity? (default 12) }` | `201` `ShipmentResponse` |
| POST | `/api/admin/shipments/{id}/orders/{orderId}` | – | `ShipmentResponse` — loads an order; the van's city locks to the first order's city |
| DELETE | `/api/admin/shipments/{id}/orders/{orderId}` | – | `ShipmentResponse` — unloads |
| PATCH | `/api/admin/shipments/{id}/capacity` | `{ capacity (≥1) }` | `ShipmentResponse` |
| POST | `/api/admin/shipments/{id}/dispatch` | – | `ShipmentResponse` — every loaded order becomes `SHIPPED`; van becomes `DISPATCHED` |
| DELETE | `/api/admin/shipments/{id}` | – | `{ message }` — cancels the van; orders return to the unassigned pool |

## Audit — `/api/admin/audit` (Staff+Admin)

| Method | Path | Query | Returns |
|---|---|---|---|
| GET | `/api/admin/audit/orders/{orderId}` | – | `OrderAuditEntry[]` `{ id, actorId, action, fromStatus, toStatus, details, createdAt }` |
| GET | `/api/admin/audit/user-actions` | `userId?`, `page`, `size` | page of `UserActionEntry` `{ id, userId, action, details, createdAt }` |

---

# Admin only

## Product management — `/api/admin/products` (Admin)

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/admin/products` | `page`, `size` | page of `ProductResponse` (incl. inactive) |
| POST | `/api/admin/products` | `{ sku, name, description?, price, slotQuantity, active? }` | `201` `ProductResponse` |
| PUT | `/api/admin/products/{id}` | same as POST | `ProductResponse` |
| DELETE | `/api/admin/products/{id}` | – | `{ message }` — blocked if the product has orders |
| PATCH | `/api/admin/products/{id}/slot` | `{ quantity (≥0) }` | `ProductResponse` — **set** absolute stock |
| POST | `/api/admin/products/{id}/reslot` | `{ quantity (≥0) }` | `ProductResponse` — **add** stock (restock) |
| POST | `/api/admin/products/{id}/images` | `multipart/form-data`: `file`, `sortOrder?` | `201` `ProductImageResponse` `{ id, imageUrl, sortOrder }` |
| DELETE | `/api/admin/products/{id}/images/{imageId}` | – | `{ message }` |
| PUT | `/api/admin/products/{id}/images/order` | `{ imageIds: [ ... ] }` | `ProductImageResponse[]` — reorders |

Uploaded images are served from `/uploads/**` (Public).

## Promotion management — `/api/admin/promotions` (Admin)

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/admin/promotions` | `page`, `size` | page of `PromotionResponse` `{ id, code, name, description, discountType, discountValue, startsAt, endsAt, active, currentlyValid, productIds[] }` |
| GET | `/api/admin/promotions/{id}` | – | `PromotionResponse` |
| POST | `/api/admin/promotions` | `{ code, name, description?, discountType (PERCENTAGE\|FIXED), discountValue, startsAt?, endsAt?, active? }` | `201` `PromotionResponse` |
| PUT | `/api/admin/promotions/{id}` | same as POST | `PromotionResponse` |
| DELETE | `/api/admin/promotions/{id}` | – | `{ message }` |
| POST | `/api/admin/promotions/{id}/products/{productId}` | – | `PromotionResponse` — target the promo at a product |
| DELETE | `/api/admin/promotions/{id}/products/{productId}` | – | `PromotionResponse` |
| POST | `/api/admin/promotions/{id}/notify` | – | `{ message, recipients }` — queues a broadcast notification to all customers |

An empty `productIds` means the promo applies to the whole cart.

## Refund review — `/api/admin/refunds` (Admin)

| Method | Path | Body / Query | Returns |
|---|---|---|---|
| GET | `/api/admin/refunds` | `status?` = `PENDING`\|`APPROVED`\|`REJECTED`, `page`, `size` | page of `RefundResponse` |
| POST | `/api/admin/refunds/{id}/approve` | `{ note? }` | `RefundResponse` — order → `REFUNDED`, stock restored, payment → `REFUNDED` |
| POST | `/api/admin/refunds/{id}/reject` | `{ note? }` | `RefundResponse` |

## Payment reconciliation — `/api/admin/payments` (Admin)

| Method | Path | Returns |
|---|---|---|
| GET | `/api/admin/payments/reconcile` | `{ paidOrdersWithoutSuccessfulPayment[], successfulPaymentsWithUnpaidOrders[], consistent }` |

## User management — `/api/admin/users` (Admin)

| Method | Path | Query | Returns |
|---|---|---|---|
| GET | `/api/admin/users` | `page`, `size` | page of `UserResponse` (all accounts) |
| POST | `/api/admin/users/{id}/disable` | – | `UserResponse` — disables login and revokes refresh tokens |

## Reports — `/api/admin/reports` (Admin)

Every endpoint takes `?format=json` (default) `| csv | pdf`. `csv`/`pdf` download a file.

| Method | Path | Query | JSON shape |
|---|---|---|---|
| GET | `/api/admin/reports/sales/daily` | `start`, `end` (ISO date), `format?` | `[ { day, orderCount, revenue } ]` |
| GET | `/api/admin/reports/sales/monthly` | `year`, `format?` | `[ { month, orderCount, revenue } ]` |
| GET | `/api/admin/reports/products` | `start`, `end`, `format?` | `[ { productId, productName, unitsSold, sales } ]` |
| GET | `/api/admin/reports/top-products` | `start`, `end`, `limit? (5)`, `format?` | `[ { productId, productName, unitsSold, sales } ]` |
| GET | `/api/admin/reports/revenue` | `start`, `end`, `format?` | `{ orderCount, gross, discounts, net }` |

---

## Background jobs (no endpoint)

The scheduler runs these automatically:

| Job | Effect |
|---|---|
| Payment timeout | intents pending > 30 min → `TIMEOUT`, stock reservation released |
| Reservation expiry | stale reservations for unpaid orders are freed |
| Abandoned cart | reminder notification for carts left untouched |
