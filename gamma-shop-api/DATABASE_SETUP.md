# Database setup with MySQL Workbench

Standalone walkthrough for getting the `gamma_shop` MySQL database running with
**MySQL Workbench**. If you've already done this via the README's quick steps, you don't
need this file — it's the same process explained in more detail, with troubleshooting.

---

## 1. What you need installed

- **MySQL Server 8.x** (the database itself)
- **MySQL Workbench** (the GUI you use to run SQL against it)

Both are installed together by the standard MySQL installer:

- **Windows**: download "MySQL Installer" from https://dev.mysql.com/downloads/installer/,
  run it, choose the **Server only** or **Full** setup type, and make sure
  **MySQL Server** and **MySQL Workbench** are both ticked.
- During install you'll be asked to set a **root password** — remember it, you'll need it
  in step 3 below.
- Leave the port at the default (**3306**) unless something else on your machine is already
  using it.

Once installed, MySQL Server runs as a background Windows service, so it's already running
whenever you open Workbench — you don't start it manually.

---

## 2. Connect to your server in Workbench

1. Open **MySQL Workbench**.
2. On the home screen, under **MySQL Connections**, you should see a tile already created
   by the installer (usually named `Local instance MySQL80`). Click it.
3. Enter the **root password** you set during install when prompted, and tick
   "Save password in vault" so you're not asked every time.
4. You should land on a SQL editor tab connected to your server, with a **Navigator**
   panel on the left listing schemas (probably just the built-in `sys`, `information_schema`,
   etc. at this point — `gamma_shop` doesn't exist yet).

If there's no connection tile at all, click the **+** next to "MySQL Connections" and fill in:

| Field | Value |
|---|---|
| Connection Name | `Local instance` (anything you like) |
| Hostname | `127.0.0.1` |
| Port | `3306` |
| Username | `root` |

Click **Test Connection**, enter the root password, and save.

---

## 3. Create the schema

The project ships a ready-to-run script at `gamma-shop-api/sql/schema.sql`. It creates the
`gamma_shop` database, all 20 tables, indexes, foreign keys, and a handful of sample
products plus a `WELCOME10` promotion.

> **Setting this up for the first time?** Just run `schema.sql` as below - it already
> includes everything, including the `shipments` table and delivery-address columns.
>
> **Already have a `gamma_shop` database from before shipments were added?** Don't
> re-run `schema.sql` (it drops everything). Instead open and run
> `gamma-shop-api/sql/002_add_shipments.sql` the same way (File → Open SQL Script… →
> lightning bolt) - it only adds the new columns/table without touching your existing
> data.

1. In Workbench, go to **File → Open SQL Script…**
2. Browse to `gamma-shop-api/sql/schema.sql` in this project and open it. It loads into a
   new SQL editor tab.
3. Click the **lightning bolt icon** (⚡, "Execute") in the toolbar — or press
   <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Enter</kbd> to run the whole script.
4. Watch the **Output** panel at the bottom. Each statement should show a green checkmark.
   The last message should say something like `19 row(s) affected` for the sample data
   inserts.

> **⚠️ This script starts with `DROP DATABASE IF EXISTS gamma_shop;`.** Running it again
> at any point wipes and recreates the database from scratch — all orders, users, uploaded
> images references, everything. Only re-run it when you actually want a clean slate.

### Verify it worked

In the **Navigator** panel on the left, right-click **Schemas** and choose **Refresh All**.
You should now see a `gamma_shop` schema. Expand it → **Tables** and confirm you see
entries like `users`, `products`, `orders`, `payments`, `refund_requests`, `promotions`,
`carts`, `cart_items`, `order_items`, `notifications`, `shipments`, etc.

You can spot-check the sample data with a quick query — open a new SQL tab
(<kbd>Ctrl</kbd>+<kbd>T</kbd>), make sure `gamma_shop` is the active schema (bold in the
Navigator — double-click it if not), and run:

```sql
SELECT * FROM products;
SELECT * FROM promotions;
```

You should see 4 sample products and the `WELCOME10` promotion row.

> **Note:** the three demo user accounts (`admin@gammashop.local`, `staff@gammashop.local`,
> `customer@gammashop.local`) are **not** in this script — they're created by the Spring
> Boot app itself the first time it starts, because their passwords need to be hashed with
> BCrypt by Java code, not SQL. `SELECT * FROM users;` will be empty until you run the app
> at least once with `app.seed.enabled: true` (the default).

---

## 4. Point the backend at this database

Open `gamma-shop-api/src/main/resources/application.yml` and set your root password:

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/gamma_shop?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true
    username: root
    password: change_me   # <-- replace with the password you set in step 2
```

If you created a different MySQL user instead of using `root`, use that username/password
here instead — just make sure that user has full privileges on the `gamma_shop` database
(`GRANT ALL PRIVILEGES ON gamma_shop.* TO 'youruser'@'localhost';` run in a Workbench SQL
tab, then `FLUSH PRIVILEGES;`).

Once this is set, starting the Spring Boot app (see the main `README.md`) connects to the
schema you just created, seeds the three demo accounts, and you're ready to log in.

---

## 5. Re-running or resetting the database

- **Full reset**: re-open and re-execute `sql/schema.sql` exactly as in step 3. It drops
  and recreates everything, including wiping out any orders/products/users created while
  using the app (except the demo accounts, which the app reseeds on its next start).
- **Just want to clear data, not structure**: instead of the full script, you can run
  targeted `DELETE FROM <table>;` statements in Workbench — but respect foreign key order
  (e.g. delete `order_items` before `orders`, `cart_items` before `carts`) or temporarily
  run `SET FOREIGN_KEY_CHECKS = 0;` before and `SET FOREIGN_KEY_CHECKS = 1;` after.
- **Inspecting data while the app is running** is completely safe — Workbench queries
  (`SELECT`) don't conflict with the running Spring Boot app. Avoid running `DROP DATABASE`
  or schema changes while the app is connected to it.

---

## 6. Troubleshooting

| Symptom | Fix |
|---|---|
| `Access denied for user 'root'@'localhost'` (in Workbench or the app) | Wrong password. Re-check what you set during MySQL install, or reset it via MySQL Installer → Reconfigure. |
| Workbench can't connect at all / "Can't connect to MySQL server" | The MySQL80 service isn't running. Open Windows **Services** (`services.msc`), find **MySQL80**, and start it. |
| `Unknown database 'gamma_shop'` when the app starts | Step 3 (running `schema.sql`) was skipped or failed partway — re-run it. |
| `Public Key Retrieval is not allowed` | Only relevant to the app's JDBC connection, not Workbench — make sure `allowPublicKeyRetrieval=true` stays in the `spring.datasource.url` in `application.yml` (it's there by default). |
| Script fails partway through with a foreign key error | You likely edited the script and broke table creation order. Re-download/reset `schema.sql` to its original contents and re-run. |
| Port 3306 already in use by another MySQL install | Either stop the other instance, or install this one on a different port and update both the Workbench connection and `spring.datasource.url` (`jdbc:mysql://localhost:<port>/gamma_shop...`) to match. |
| Tables exist but every table is empty, including `products` | The script ran but the `INSERT` statements at the bottom failed silently — scroll the Output panel for a red X and re-run just those statements, or re-run the whole script. |

---

## 7. Quick reference

| Setting | Value |
|---|---|
| Database name | `gamma_shop` |
| Default host | `localhost` (`127.0.0.1`) |
| Default port | `3306` |
| Schema script | `gamma-shop-api/sql/schema.sql` |
| App config to update | `gamma-shop-api/src/main/resources/application.yml` → `spring.datasource.*` |
| Demo accounts location | Created by the app on first run, not by SQL (see `config/DataSeeder.java`) |
