# Gamma Shop UI — How to do anything, end to end

Task-by-task walkthroughs for the web app. One login serves everyone; what you see after
signing in is decided by your role.

- **Run it:** `npm install` then `npm run dev`, open the printed URL (default
  `http://localhost:5173`). The API must be running on `http://localhost:8080`
  (see `../gamma-shop-api/README.md`).
- **Demo accounts** (seeded by the API on first start):

  | Email | Password | Role | Lands on |
  |---|---|---|---|
  | `admin@gammashop.local` | `Admin123!` | ADMIN | Order queue |
  | `staff@gammashop.local` | `Staff123!` | STAFF | Order queue |
  | `customer@gammashop.local` | `Customer123!` | CUSTOMER | Browse products |

- **Navigation:** the top bar has grouped sections — **Shop**, **Account**, **Back office**,
  **Admin**. You only see the groups your role allows. The **Access control** page has a full
  permission matrix.
- **Theme:** the ☀/🌙 button top-right toggles light/dark.
- **Sessions:** stay signed in for up to 7 days across tab closes; the app silently refreshes
  your access token. Click **Log out** to end it now.

---

## 1. Getting in

### Register (new customer)
1. Header → **Log in** → **Register** tab.
2. Fill email, password (≥ 8 chars), full name, phone (optional) → **Create account**.
3. You're signed in and dropped on **Browse products**. New accounts are always customers.

### Log in
1. Header → **Log in** → **Log in** tab → email + password → **Log in**.
2. You land on your role's home page.

### Browse as a guest
1. Header → **Log in** → **Guest** tab → **Continue as guest**.
2. You can browse and build a cart. At checkout you'll be asked to log in or register —
   **your cart carries over automatically**.

### Forgot password
1. **Log in** → **Forgot password** tab.
2. Enter your account email → **Send reset token**. Email sending is off in dev, so the
   reset token is shown in the green banner (and pre-filled into the field below).
3. Enter a new password (≥ 8) → **Reset password** → log in with it.

---

## 2. Customer playbook  (Shop + Account)

### Find a product
- **Browse products** shows every active product as a card (price, stock badge, promo tags).
- **Search** box: matches name or SKU. Type and press **Apply**.
- **Min price / Max price / In stock only**: set any of them and press **Apply**.
- Clearing search and filters and pressing **Apply** shows everything again.
- Click a card image or title for the full description and all photos.

### Add to cart
1. On a product card, set the quantity (capped at available stock).
2. **Add to cart**. If you're not signed in, a guest session starts automatically.
3. A green banner confirms. Repeat for more products, then header/nav → **Cart & checkout**
   (or **Go to cart →** on the shop page).

### Manage the cart
On **Cart & checkout**:
- Change a line's **Quantity** field — updates immediately. Set it to `0` (or **Remove**) to
  delete the line.
- **Clear cart** empties everything.
- **Subtotal** updates live.

### Apply a promotion code (signed-in only)
1. In the **Promotion code** card, type a code (e.g. `WELCOME10`) → **Apply**.
2. A green line shows the type and estimated discount.
3. You don't strictly need to click Apply — a code left in the box is also validated and
   applied when you **Preview totals** or **Place order**. An invalid code is reported then,
   before the order is placed.

### Check out
1. In the **Checkout** card, fill **Delivery address** and **City**. If your profile already
   has an address it's pre-filled; editing here changes only this order. If you have no saved
   address, what you enter is saved to your profile as the default.
2. Optional: **Validate stock** (lists anything that went out of stock while you shopped) and
   **Preview totals** (subtotal / discount / grand total).
3. **Place order**. The order is created as **PENDING_PAYMENT**, stock is reserved, and you're
   taken to **My orders**.

### Pay for an order
1. **My orders** → **Details** on the order → the **Payment** section.
2. **Pay now** → an info panel shows a mock gateway intent (this stands in for being
   redirected to a hosted card page).
3. **Simulate payment success** → the order becomes **PAID**, stock is deducted, you get a
   confirmation notification.
4. To rehearse the failure path: **Simulate payment failure**, then **Retry payment** →
   pay again.

### Track / cancel an order
- **My orders** lists every order with a status badge:
  `PENDING_PAYMENT → PAID → PROCESSING → PACKED → SHIPPED → COMPLETED` (plus `CANCELLED`,
  `REFUNDED`).
- **Details** shows line items, totals and the payment history.
- **Cancel order** is available only while **PENDING_PAYMENT** — it releases the reserved
  stock.

### Request a refund
1. **My orders** → **Details** on a **PAID** (or later) order.
2. **Request a refund** section → type a reason (required) → **Submit request**.
3. Track it in **My refund requests** at the bottom of the page — status goes
   `PENDING → APPROVED / REJECTED`, with the reviewer's note. An approved refund flips the
   order to **REFUNDED** and restores stock.

### Profile & notifications
- **Profile & notifications**:
  - Edit full name, phone, **delivery address**, **city** → **Save changes**. The address is
    the checkout default and is used to route your orders onto a delivery van.
  - **Delete account** — hard-deletes if you have no orders, otherwise disables the account.
  - **Notifications** lists everything the shop sent you: order confirmations, payment
    results, status updates, promo announcements.

---

## 3. Staff playbook — Back office  (STAFF or ADMIN)

Staff land on **Order queue**. The **Back office** nav group has Order queue, Shipments,
Audit log.

### Work the order queue
1. **Order queue**. Filter with **Status filter**, or hit **Show pending only** (orders that
   are **PAID** and waiting to be handled). **Refresh** re-pulls.
2. **Manage** on a row opens the detail panel.

In the detail panel you can:
- **Delivery address** — correct a typo in the address/city → **Save address**. Do this
  before routing to a van if the city is missing.
- **Assignee** — pick a staff/admin member from the dropdown → **Assign to staff**.
- **Set status** — choose a target and **Update status**. Only forward moves that the
  lifecycle allows are accepted.
- Quick actions: **Mark packed**, **Mark shipped**, **Mark completed**, **Cancel unpaid
  order**.
- **Download invoice** — saves a PDF.
- **Notes** — internal notes with author and timestamp; add one with the box at the bottom.

Typical progression for a paid order: `PROCESSING` → **Mark packed** → (load onto a van and
dispatch, or **Mark shipped**) → **Mark completed**.

### Route orders onto delivery vans
**Shipments** groups paid orders by delivery city so a van does one city per run.

1. **New van** — label (e.g. `Van 1`) and capacity (default 12) → **Create van**. The van's
   city locks to the first order you load.
2. **Unassigned orders** are grouped by city. Tick the orders you want (or the city's
   header checkbox to take the whole group). Orders with **no address** can't be selected —
   fix them in the Order queue first.
3. Pick the target van in the **Add … selected to van** dropdown → **Add to van**. Anything
   that doesn't fit (capacity, wrong city) is skipped and reported.
4. On the van card: adjust capacity, **Remove** an order, **Cancel van** (orders go back to
   the pool), or **Dispatch**.
5. **Dispatch** marks every loaded order **SHIPPED** and moves the van to history
   (**Show dispatched vans**).

### Audit log
**Audit log**:
- **Order history** — enter an order ID → **Look up**. Shows every event: creation,
  payments, status changes, assignment, refund — with actor and timestamp.
- **User actions** — optional user ID → **Load**. Registrations, logins, checkouts,
  cancellations, etc.

---

## 4. Admin playbook — Admin  (the **Admin** nav group)

Admins also have everything Staff has. Extra pages: Access control, Products, Promotions,
Payments, Refunds, Reports.

### Products
**Products**:
- **Create product** — SKU, name, description, price, initial stock, Active → **Create
  product**.
- The table lists every product (**ID**, name, SKU, price, stock, status).
- **Manage** on a row loads it into the form for editing (**Save changes**) and opens the
  **Stock & images** panel:
  - **Set stock to** — sets the absolute stock level.
  - **Restock (+ units)** — adds to current stock.
  - **Images** (max 5) — **Add photos** stages files locally; the × on a photo marks it for
    removal. Nothing is uploaded or deleted until you click **Save changes**. **Discard**
    drops staged changes.
- **Delete** removes a product (blocked if it has orders).

### Promotions
**Promotions**:
- **Create promotion** — code, name, description, discount type
  (**Percentage** / **Fixed amount**), value, optional start/end datetimes, Active →
  **Create promotion**.
- The table shows discount, whether it's **valid now**, and how many products it targets.
- **Manage** loads it for editing and opens the targeting panel:
  - **Add a product** dropdown → **Assign product**. Assigned products show as name badges;
    click the × on a badge to remove one. **No products assigned = applies to the whole
    cart.**
  - **Notify all customers about this promotion** — queues a broadcast notification.

### Refund review
**Refunds**:
1. Filter by status (defaults to **Pending**).
2. For a pending row: optionally type a **Note**, then **Approve** or **Reject**.
3. **Approve** → order becomes **REFUNDED**, stock is restored, the payment is marked
   refunded. The customer sees the outcome and your note in their **My refund requests**.

### Payment reconciliation
**Payments** → **Run reconciliation**. Cross-checks stored payments against order states and
lists any mismatches (`paidOrdersWithoutSuccessfulPayment`,
`successfulPaymentsWithUnpaidOrders`, `consistent`).

### Reports
**Reports** — tabs: Daily sales, Monthly sales, Product sales, Top products, Revenue summary.
1. Set the parameters (date range, or year for monthly, or limit for top products).
2. **Run report** shows the table.
3. **Export CSV** / **Export PDF** download the same data as a file.

### Access control / user accounts
**Access control**:
- Shows your current access and the full **permission matrix** (Guest / Customer / Staff /
  Admin).
- **User accounts** table (**ID**, email, name, role, status, joined). **Disable** locks an
  account out and revokes its sessions. Use the ID here when you need a staff member's ID
  elsewhere.

---

## 5. Full end-to-end scenario

A single order from cart to delivered to refunded, touching every role:

1. **Customer** (`customer@gammashop.local`): Browse → add 2 items → **Cart & checkout** →
   enter address + city → apply `WELCOME10` → **Place order**.
2. **Customer**: **My orders** → **Details** → **Pay now** → **Simulate payment success**.
   Order is now **PAID**.
3. **Staff** (`staff@gammashop.local`): **Order queue** → **Show pending only** → **Manage**
   the order → **Set status: PROCESSING** → **Update status** → **Mark packed**.
4. **Staff**: **Shipments** → **Create van** for the customer's city → select the order →
   **Add to van** → **Dispatch**. Order is now **SHIPPED**.
5. **Staff**: back in **Order queue**, **Manage** the order → **Mark completed**.
6. **Customer**: **My orders** → **Details** → **Request a refund** with a reason.
7. **Admin** (`admin@gammashop.local`): **Refunds** → **Approve** (with a note). Order becomes
   **REFUNDED**; stock is restored.
8. **Admin**: **Audit log** → enter the order ID → **Look up** to see every step above; then
   **Reports → Revenue summary** to see the effect on the numbers.
