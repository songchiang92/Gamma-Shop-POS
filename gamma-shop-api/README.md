# Gamma Shop API

A complete e-commerce REST API built with **Java 17 + Spring Boot 3** and **MySQL**,
implementing every module from the Project Gamma spreadsheet. There is **no UI** —
you interact with the API through **Swagger UI** (built in, runs in your browser),
Postman, or the included `requests.http` file.

---

## 1. What was built (spreadsheet → code)

| Spreadsheet module | Where it lives | Endpoints (prefix `/api`) |
|---|---|---|
| Account | `user/` | `/users/me`, `/admin/users` |
| Authentication | `auth/`, `security/` | `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/forgot-password`, `/auth/reset-password` |
| Guest Checkout | `auth/` (GuestSession) | `/auth/guest`, `/auth/guest/convert` |
| Product + Images + Slot | `product/` | `/products`, `/products/search`, `/products/filter`, `/admin/products`, `/admin/products/{id}/slot`, `/admin/products/{id}/images` |
| Cart | `cart/` | `/cart`, `/cart/items`, `/cart/merge` |
| Order | `order/` | `/orders`, `/orders/preview`, `/orders/validate-stock`, `/orders/{id}/cancel` |
| Payment Gateway | `payment/` | `/payments/intent/{orderId}`, `/payments/retry/{orderId}`, `/payments/webhook`, `/mock-gateway/**`, `/admin/payments/reconcile` |
| Promotion | `promotion/` | `/promotions/validate`, `/admin/promotions/**` |
| Middle Office | `order/MiddleOfficeController` | `/admin/orders/**` (pending, assign, packed/shipped/completed, notes, invoice PDF) |
| Back Office – Reporting | `report/` | `/admin/reports/**` (`?format=json|csv|pdf`) |
| Back Office – Notifications | `notification/` | `/notifications` (stored in DB; email optional) |
| Back Office – Audit | `audit/` | `/admin/audit/orders/{id}`, `/admin/audit/user-actions` |
| Back Office – Refund & Dispute | `refund/` | `/refunds`, `/admin/refunds/{id}/approve` / `reject` |
| Back Office – Slot Locking | `inventory/` | automatic (reservations while payment is pending) |

Design decisions worth knowing:

- **Order statuses**: `PENDING_PAYMENT → PAID → PROCESSING → PACKED → SHIPPED → COMPLETED`,
  plus `CANCELLED` (only while unpaid) and `REFUNDED` (via approved refund request).
  `PACKED`/`SHIPPED` were added so the Middle Office functions have real statuses to set.
- **Stock ("slots")**: `slot_quantity` is physical stock. When an order is created the
  quantities are *reserved* (slot locking). Payment success *consumes* the reservation and
  deducts stock; cancel/timeout *releases* it; refunds add stock back.
- **Guests** can browse and fill a cart using the `X-Guest-Token` header, but must convert
  to an account (`/auth/guest/convert`) before checkout — that call also merges their cart.
- **Payments** are simulated by a built-in **mock gateway** that signs its callbacks with
  HMAC-SHA256, exactly like a real gateway webhook would. Swap in a real provider later by
  keeping the same webhook contract.

---

## 2. Prerequisites

1. **JDK 17 or 21** — check with `java -version`. **JDK 25/26 do not work** yet: Lombok and
   Spring Boot 3.5 don't support them, so the build fails with hundreds of "cannot find symbol"
   errors on generated getters/builders. If your machine's default JDK is 25+, keep it and use
   the Maven toolchain instead — see step 2 below and *Common problems*.
2. **IntelliJ IDEA** (Community is fine) — it bundles Maven, no separate install needed.
3. **MySQL 8** with **MySQL Workbench**.

### Maven toolchain (only if `java -version` is 25 or newer)

`pom.xml` pins the build to **JDK 21** via `maven-toolchains-plugin`. Point Maven at your JDK 21
install by creating `~/.m2/toolchains.xml` (`C:\Users\<you>\.m2\toolchains.xml` on Windows):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<toolchains xmlns="http://maven.apache.org/TOOLCHAINS/1.1.0">
    <toolchain>
        <type>jdk</type>
        <provides><version>21</version><vendor>oracle</vendor></provides>
        <configuration><jdkHome>C:\Program Files\Java\jdk-21</jdkHome></configuration>
    </toolchain>
</toolchains>
```

Maven itself still runs on your default JDK; it just compiles and runs *this project* with 21.
In IntelliJ this isn't needed — set **Project Structure → SDK → 21** (or 17).

---

## 3. Setup, step by step

### Step 1 — Create the database
1. Open **MySQL Workbench** and connect to your local server.
2. `File → Open SQL Script…` and pick `sql/schema.sql` from this project.
3. Press the **lightning bolt** (Execute). This creates the `gamma_shop` database,
   all 20 tables, indexes, 4 sample products and the `WELCOME10` promotion.
   ⚠️ The script starts with `DROP DATABASE IF EXISTS gamma_shop;` — running it again wipes the data.

   Already have a `gamma_shop` database from before and don't want to wipe it? Run
   `sql/002_add_shipments.sql` instead — it only adds the address/shipment columns and
   tables added for delivery routing, without touching existing data. See
   `DATABASE_SETUP.md` for details.

### Step 2 — Open the project in IntelliJ
1. `File → Open…` and select the **`pom.xml`** file → choose **Open as Project**.
2. Wait for Maven to download the dependencies (first time takes a few minutes; internet required).
3. Enable Lombok: `Settings → Build, Execution, Deployment → Compiler → Annotation Processors →`
   tick **Enable annotation processing**. (Recent IntelliJ versions bundle the Lombok plugin;
   if prompted to install it, accept.)

### Step 3 — Point the app at your MySQL
Open `src/main/resources/application.yml` and change:

```yaml
spring:
  datasource:
    username: root
    password: change_me   # <-- your MySQL password
```

### Step 4 — Run it
Open `EcommerceApplication.java` and click the green ▶ next to `main`.
When the log shows `Started EcommerceApplication`, the API is live at `http://localhost:8080`.
On first start the app seeds three demo accounts (BCrypt-hashed):

| Email | Password | Role |
|---|---|---|
| `admin@gammashop.local` | `Admin123!` | ADMIN |
| `staff@gammashop.local` | `Staff123!` | STAFF |
| `customer@gammashop.local` | `Customer123!` | CUSTOMER |

### Step 5 — Explore with Swagger UI
Open **http://localhost:8080/swagger-ui.html** in a browser.
1. Expand `POST /api/auth/login`, click *Try it out*, log in with a demo account.
2. Copy the `accessToken` from the response.
3. Click the green **Authorize** button (top right) and paste the token.
4. Every protected endpoint now works from the browser.

Access tokens last 30 minutes; use `POST /api/auth/refresh` with your `refreshToken` to get new ones.

---

## 4. A full purchase, end to end

1. **Login** as `customer@gammashop.local` → Authorize with the token.
2. **Add to cart**: `POST /api/cart/items` with `{"productId": 1, "quantity": 2}`.
3. *(Optional)* **Preview totals**: `POST /api/orders/preview` with `{"promotionCode": "WELCOME10"}`.
4. **Checkout**: `POST /api/orders` with `{"promotionCode": "WELCOME10"}` → note the order `id`.
   The order is `PENDING_PAYMENT` and its stock is now reserved.
5. **Create the payment intent**: `POST /api/payments/intent/{orderId}` → note the `intentId`
   and the `redirectUrl` (in real life the customer is redirected there).
6. **Simulate paying**: `POST /api/mock-gateway/pay/{intentId}/complete?outcome=success`.
   The mock gateway signs a webhook and delivers it; the order becomes `PAID`, stock is deducted,
   and a payment-success notification is recorded. (Use `outcome=fail`, then `POST /api/payments/retry/{orderId}`,
   to see the failure path.)
7. **Middle office** — log in as `staff@gammashop.local` (new Authorize):
   `GET /api/admin/orders/pending` → `POST /api/admin/orders/{id}/status` with `{"status":"PROCESSING"}`
   → `/packed` → `/shipped` → `/completed`, add notes via `/notes`, download the invoice PDF via `/invoice`.
8. **Reports** — log in as admin: `GET /api/admin/reports/sales/daily?start=2026-07-01&end=2026-07-31&format=pdf`.
9. **Refund** — as the customer: `POST /api/refunds` with `{"orderId": 1, "reason": "changed my mind"}`;
   as admin: `POST /api/admin/refunds/{id}/approve` → order becomes `REFUNDED`, stock restored,
   payment marked `REFUNDED`.
10. **Audit trail**: `GET /api/admin/audit/orders/{orderId}` shows every step above.

**Guest flow**: `POST /api/auth/guest` → use the returned token as the `X-Guest-Token` header on
`/api/cart` endpoints → `POST /api/auth/guest/convert` (guest token + registration details) creates
the account and merges the cart, then checkout as normal.

---

## 5. How the project is organised

```
gamma-shop-api/
├── pom.xml                  Maven build file: lists every library (Spring Boot, MySQL
│                            driver, JWT, Lombok, Swagger, OpenPDF) and how to build.
├── sql/schema.sql           Run once in MySQL Workbench: creates DB, tables, sample data.
├── requests.http            Ready-made API calls for IntelliJ's HTTP client.
└── src/main/
    ├── resources/application.yml   All configuration (DB password, JWT secret, timeouts...).
    └── java/com/projectgamma/ecommerce/
        ├── EcommerceApplication.java  The entry point - run this class.
        ├── common/       Error handling shared by everything: ApiException (an error with
        │                 an HTTP status), GlobalExceptionHandler (turns any exception into
        │                 a clean JSON error), PageResponse (simple pagination wrapper).
        ├── config/       App-wide setup: SecurityConfig (which URL needs which role),
        │                 WebConfig (serves uploaded images), OpenApiConfig (Swagger),
        │                 DataSeeder (creates the demo users on first start).
        ├── security/     JWT machinery: JwtService (creates/validates tokens),
        │                 JwtAuthenticationFilter (reads the Authorization header on every
        │                 request), CustomUserDetails(Service) (bridges our users table
        │                 to Spring Security).
        ├── user/         Account module.
        ├── auth/         Login, tokens, password reset, guest sessions.
        ├── product/      Catalog, images, stock ("slot") management.
        ├── cart/         Carts for users and guests, merge logic, abandoned-cart job hook.
        ├── promotion/    Discount codes, product targeting, scheduling, discount math.
        ├── inventory/    Slot locking: reservations that expire, get released or consumed.
        ├── order/        Checkout, totals, status flow, middle office, invoice PDF.
        ├── payment/      Payment intents, HMAC-signed webhook, retries, timeouts,
        │                 reconciliation, and the mock gateway.
        ├── refund/       Refund requests and admin approval/rejection.
        ├── audit/        Order audit trail + user action tracking.
        ├── notification/ Every email-like message, stored in DB (real SMTP optional).
        ├── report/       Sales/revenue reports with CSV & PDF export.
        └── scheduler/    Background jobs (payment timeouts, reservation expiry,
                          abandoned-cart reminders).
```

### The layer pattern (repeated in every module)

Each module contains the same four kinds of classes — once you can read one module,
you can read them all:

- **Entity** (e.g. `Product.java`) — a Java class mapped 1:1 to a database table.
  Annotations like `@Column(name = "slot_quantity")` tie fields to columns.
- **Repository** (e.g. `ProductRepository.java`) — an interface; Spring Data writes the
  SQL for you from method names like `findByActiveTrue`.
- **Service** (e.g. `ProductService.java`) — the business rules ("you can't delete a
  product that has orders"). `@Transactional` makes each method all-or-nothing in the DB.
- **Controller** (e.g. `ProductController.java`) — maps HTTP URLs to service calls and
  nothing else.
- **dto/** — the request/response shapes for JSON, kept separate from entities so the API
  never leaks internal fields (like password hashes).

---

## 6. Configuration reference (`application.yml`)

| Key | Meaning | Default |
|---|---|---|
| `spring.datasource.*` | MySQL connection | root / change_me |
| `app.jwt.secret` | Signing key for access tokens (change for production) | provided |
| `app.jwt.access-token-minutes` | Access token lifetime | 30 |
| `app.jwt.refresh-token-days` | Refresh token lifetime | 7 |
| `app.payment.webhook-secret` | Shared HMAC secret with the gateway | change-this... |
| `app.payment.timeout-minutes` | Unfinished payments become TIMEOUT after this | 30 |
| `app.reservation.expiry-minutes` | How long stock stays locked for an unpaid order | 30 |
| `app.uploads.dir` | Folder for product images | ./uploads |
| `app.mail.enabled` | true = really send email (configure `spring.mail.*`) | false |
| `app.seed.enabled` | Create demo users on start | true |

---

## 7. Common problems

- **`Access denied for user 'root'@'localhost'`** — wrong password in `application.yml`.
- **`Unknown database 'gamma_shop'`** — Step 1 (schema.sql) was skipped.
- **`Public Key Retrieval is not allowed`** — keep `allowPublicKeyRetrieval=true` in the JDBC URL (already set).
- **`Port 8080 was already in use`** — change `server.port` in `application.yml` (e.g. 8081).
- **Red errors on `getX()`/`builder()` in IntelliJ** — Lombok annotation processing is off (Step 2.3).
- **Hundreds of `cannot find symbol` / `variable ... not initialized` on `mvn` but IntelliJ is fine** —
  Maven is building with an unsupported JDK (25/26). Run `mvn -v` to check "Java version". Fix by
  setting up `~/.m2/toolchains.xml` (Prerequisites, step 2) or setting `JAVA_HOME` to a JDK 17/21.
- **`Cannot find matching toolchain ... jdk [ version='21' ]`** — the toolchain plugin can't find a
  JDK 21. Create `~/.m2/toolchains.xml` pointing `<jdkHome>` at your JDK 21, or install one.
- **401 on every request in Swagger** — token expired (30 min); log in again and re-Authorize.

## 8. Limitations (by design, for local development)

- The payment gateway is **simulated** (`/api/mock-gateway`). Wire a real provider by
  keeping the same signed-webhook contract in `PaymentService`.
- With `app.mail.enabled=false`, "emails" are stored in the `notifications` table and
  printed to the console — nothing is actually sent.
- `POST /api/auth/forgot-password` returns the reset token in the response
  (`devResetToken`) so the flow is testable without email. Remove that field for production.
