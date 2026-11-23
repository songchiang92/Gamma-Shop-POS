-- ============================================================================
-- Project Gamma - E-commerce database schema (MySQL 8)
-- HOW TO RUN: open this file in MySQL Workbench and press the lightning bolt
-- (Execute). It creates the `gamma_shop` database, all tables, indexes and
-- some sample products/promotions.
--
-- NOTE: the demo user accounts (admin/staff/customer) are created by the
-- Spring Boot app itself on first start, because passwords must be BCrypt
-- hashed by the application.
-- ============================================================================

DROP DATABASE IF EXISTS gamma_shop;   -- WARNING: deletes the database if it already exists
CREATE DATABASE gamma_shop CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE gamma_shop;

-- ------------------------------------------------------------------
-- Accounts & authentication
-- ------------------------------------------------------------------
CREATE TABLE users (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(150),
    phone         VARCHAR(30),
    address       VARCHAR(255),                          -- default delivery address, used at checkout
    city          VARCHAR(100),                           -- default delivery city, used to route shipments
    role          VARCHAR(20)  NOT NULL DEFAULT 'CUSTOMER',  -- CUSTOMER / STAFF / ADMIN
    enabled       TINYINT(1)   NOT NULL DEFAULT 1,
    created_at    DATETIME,
    updated_at    DATETIME
);

CREATE TABLE refresh_tokens (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id    BIGINT       NOT NULL,
    token      VARCHAR(100) NOT NULL UNIQUE,
    expires_at DATETIME     NOT NULL,
    revoked    TINYINT(1)   NOT NULL DEFAULT 0,
    created_at DATETIME,
    CONSTRAINT fk_refresh_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE password_reset_tokens (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id    BIGINT       NOT NULL,
    token      VARCHAR(100) NOT NULL UNIQUE,
    expires_at DATETIME     NOT NULL,
    used       TINYINT(1)   NOT NULL DEFAULT 0,
    created_at DATETIME,
    CONSTRAINT fk_reset_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE guest_sessions (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    token             VARCHAR(64) NOT NULL UNIQUE,
    expires_at        DATETIME,
    converted_user_id BIGINT NULL,           -- filled when the guest registers an account
    created_at        DATETIME,
    CONSTRAINT fk_guest_converted_user FOREIGN KEY (converted_user_id) REFERENCES users (id) ON DELETE SET NULL
);

-- ------------------------------------------------------------------
-- Catalog: products, images, promotions
-- ------------------------------------------------------------------
CREATE TABLE products (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    sku           VARCHAR(64)   NOT NULL UNIQUE,
    name          VARCHAR(200)  NOT NULL,
    description   TEXT,
    price         DECIMAL(12,2) NOT NULL,
    slot_quantity INT           NOT NULL DEFAULT 0,   -- physical stock on hand
    active        TINYINT(1)    NOT NULL DEFAULT 1,
    created_at    DATETIME,
    updated_at    DATETIME
);

CREATE TABLE product_images (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT       NOT NULL,
    image_url  VARCHAR(500) NOT NULL,
    sort_order INT          NOT NULL DEFAULT 0,
    created_at DATETIME,
    CONSTRAINT fk_image_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
);

CREATE TABLE promotions (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    code           VARCHAR(50)   NOT NULL UNIQUE,
    name           VARCHAR(150)  NOT NULL,
    description    VARCHAR(500),
    discount_type  VARCHAR(20)   NOT NULL,            -- PERCENTAGE / FIXED
    discount_value DECIMAL(12,2) NOT NULL,
    starts_at      DATETIME,
    ends_at        DATETIME,
    active         TINYINT(1)    NOT NULL DEFAULT 1,
    created_at     DATETIME
);

-- link table: a promotion may target specific products (empty = whole order)
CREATE TABLE product_promotions (
    promotion_id BIGINT NOT NULL,
    product_id   BIGINT NOT NULL,
    PRIMARY KEY (promotion_id, product_id),
    CONSTRAINT fk_pp_promotion FOREIGN KEY (promotion_id) REFERENCES promotions (id) ON DELETE CASCADE,
    CONSTRAINT fk_pp_product   FOREIGN KEY (product_id)   REFERENCES products (id)   ON DELETE CASCADE
);

-- ------------------------------------------------------------------
-- Carts (one per user, or one per guest session)
-- ------------------------------------------------------------------
CREATE TABLE carts (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id          BIGINT NULL UNIQUE,
    guest_session_id BIGINT NULL UNIQUE,
    reminder_sent_at DATETIME NULL,                   -- abandoned-cart reminder tracking
    created_at       DATETIME,
    updated_at       DATETIME,
    CONSTRAINT fk_cart_user  FOREIGN KEY (user_id)          REFERENCES users (id)          ON DELETE CASCADE,
    CONSTRAINT fk_cart_guest FOREIGN KEY (guest_session_id) REFERENCES guest_sessions (id) ON DELETE CASCADE
);

CREATE TABLE cart_items (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    cart_id    BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    quantity   INT    NOT NULL,
    UNIQUE KEY uk_cart_product (cart_id, product_id),
    CONSTRAINT fk_ci_cart    FOREIGN KEY (cart_id)    REFERENCES carts (id)    ON DELETE CASCADE,
    CONSTRAINT fk_ci_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
);

-- ------------------------------------------------------------------
-- Shipments (van loads for delivery-by-location routing)
-- ------------------------------------------------------------------
CREATE TABLE shipments (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    van_label     VARCHAR(100) NOT NULL,                 -- e.g. "Van 1"
    city          VARCHAR(100) NULL,                      -- locked in once the first order is loaded
    capacity      INT          NOT NULL DEFAULT 12,       -- max orders/packages; staff can raise/lower per van
    status        VARCHAR(20)  NOT NULL DEFAULT 'PLANNING', -- PLANNING / DISPATCHED
    created_by    BIGINT NULL,
    created_at    DATETIME,
    dispatched_at DATETIME NULL,
    CONSTRAINT fk_shipment_creator FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
);

-- ------------------------------------------------------------------
-- Orders
-- ------------------------------------------------------------------
CREATE TABLE orders (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_number      VARCHAR(30)   NOT NULL UNIQUE,
    user_id           BIGINT        NOT NULL,
    status            VARCHAR(30)   NOT NULL,          -- PENDING_PAYMENT/PAID/PROCESSING/PACKED/SHIPPED/COMPLETED/CANCELLED/REFUNDED
    subtotal          DECIMAL(12,2) NOT NULL DEFAULT 0,
    discount_total    DECIMAL(12,2) NOT NULL DEFAULT 0,
    grand_total       DECIMAL(12,2) NOT NULL DEFAULT 0,
    promotion_id      BIGINT NULL,
    assigned_staff_id BIGINT NULL,
    shipping_address  VARCHAR(255) NULL,                -- snapshot of the delivery address at checkout time
    shipping_city     VARCHAR(100) NULL,                 -- snapshot of the delivery city, used to route shipments
    shipment_id       BIGINT NULL,                        -- the van this order has been loaded onto, if any
    created_at        DATETIME,
    updated_at        DATETIME,
    CONSTRAINT fk_order_user      FOREIGN KEY (user_id)           REFERENCES users (id),
    CONSTRAINT fk_order_promotion FOREIGN KEY (promotion_id)      REFERENCES promotions (id),
    CONSTRAINT fk_order_staff     FOREIGN KEY (assigned_staff_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_order_shipment  FOREIGN KEY (shipment_id)       REFERENCES shipments (id) ON DELETE SET NULL
);

CREATE TABLE order_items (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id     BIGINT        NOT NULL,
    product_id   BIGINT        NOT NULL,
    product_name VARCHAR(200)  NOT NULL,               -- snapshot at purchase time
    unit_price   DECIMAL(12,2) NOT NULL,               -- snapshot at purchase time
    quantity     INT           NOT NULL,
    line_total   DECIMAL(12,2) NOT NULL,
    CONSTRAINT fk_oi_order   FOREIGN KEY (order_id)   REFERENCES orders (id) ON DELETE CASCADE,
    CONSTRAINT fk_oi_product FOREIGN KEY (product_id) REFERENCES products (id)
);

CREATE TABLE order_notes (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id   BIGINT NOT NULL,
    author_id  BIGINT NULL,
    note       TEXT   NOT NULL,
    created_at DATETIME,
    CONSTRAINT fk_note_order  FOREIGN KEY (order_id)  REFERENCES orders (id) ON DELETE CASCADE,
    CONSTRAINT fk_note_author FOREIGN KEY (author_id) REFERENCES users (id)  ON DELETE SET NULL
);

CREATE TABLE order_audit_logs (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id    BIGINT       NOT NULL,
    actor_id    BIGINT NULL,
    action      VARCHAR(100) NOT NULL,
    from_status VARCHAR(30)  NULL,
    to_status   VARCHAR(30)  NULL,
    details     VARCHAR(500),
    created_at  DATETIME,
    CONSTRAINT fk_audit_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
    CONSTRAINT fk_audit_actor FOREIGN KEY (actor_id) REFERENCES users (id)  ON DELETE SET NULL
);

-- ------------------------------------------------------------------
-- Payments
-- ------------------------------------------------------------------
CREATE TABLE payments (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id    BIGINT        NOT NULL,
    intent_id   VARCHAR(64)   NOT NULL UNIQUE,
    amount      DECIMAL(12,2) NOT NULL,
    currency    VARCHAR(10)   NOT NULL DEFAULT 'MYR',
    status      VARCHAR(20)   NOT NULL,                -- CREATED/PENDING/SUCCESS/FAILED/TIMEOUT/REFUNDED
    gateway_ref VARCHAR(100),
    attempts    INT           NOT NULL DEFAULT 1,
    created_at  DATETIME,
    updated_at  DATETIME,
    CONSTRAINT fk_payment_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
);

-- ------------------------------------------------------------------
-- Refunds & disputes
-- ------------------------------------------------------------------
CREATE TABLE refund_requests (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id     BIGINT       NOT NULL,
    requested_by BIGINT       NOT NULL,
    reason       VARCHAR(500),
    status       VARCHAR(20)  NOT NULL,                -- PENDING/APPROVED/REJECTED
    reviewed_by  BIGINT NULL,
    reviewed_at  DATETIME NULL,
    review_note  VARCHAR(500),
    created_at   DATETIME,
    CONSTRAINT fk_refund_order     FOREIGN KEY (order_id)     REFERENCES orders (id) ON DELETE CASCADE,
    CONSTRAINT fk_refund_requester FOREIGN KEY (requested_by) REFERENCES users (id),
    CONSTRAINT fk_refund_reviewer  FOREIGN KEY (reviewed_by)  REFERENCES users (id) ON DELETE SET NULL
);

-- ------------------------------------------------------------------
-- Slot locking (inventory reservations while payment is pending)
-- ------------------------------------------------------------------
CREATE TABLE inventory_reservations (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT      NOT NULL,
    order_id   BIGINT NULL,
    quantity   INT         NOT NULL,
    status     VARCHAR(20) NOT NULL,                   -- RESERVED/RELEASED/CONSUMED
    expires_at DATETIME,
    created_at DATETIME,
    CONSTRAINT fk_res_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
    CONSTRAINT fk_res_order   FOREIGN KEY (order_id)   REFERENCES orders (id)   ON DELETE CASCADE
);

-- ------------------------------------------------------------------
-- Auditing & notifications
-- ------------------------------------------------------------------
CREATE TABLE user_action_logs (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id    BIGINT NULL,
    action     VARCHAR(100) NOT NULL,
    details    VARCHAR(500),
    created_at DATETIME,
    CONSTRAINT fk_action_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE notifications (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT NULL,
    recipient_email VARCHAR(255),
    type            VARCHAR(50) NOT NULL,              -- ORDER_CONFIRMATION, PAYMENT_SUCCESS, ...
    subject         VARCHAR(200),
    body            TEXT,
    status          VARCHAR(20) NOT NULL,              -- PENDING/SENT/FAILED/LOGGED
    created_at      DATETIME,
    sent_at         DATETIME NULL,
    CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
);

-- ------------------------------------------------------------------
-- Helpful indexes
-- ------------------------------------------------------------------
CREATE INDEX idx_orders_status          ON orders (status);
CREATE INDEX idx_orders_created         ON orders (created_at);
CREATE INDEX idx_orders_shipping_city   ON orders (shipping_city);
CREATE INDEX idx_orders_shipment        ON orders (shipment_id);
CREATE INDEX idx_order_items_product    ON order_items (product_id);
CREATE INDEX idx_res_product_status     ON inventory_reservations (product_id, status);
CREATE INDEX idx_payments_status        ON payments (status);
CREATE INDEX idx_notifications_user     ON notifications (user_id);
CREATE INDEX idx_shipments_status       ON shipments (status);

-- ------------------------------------------------------------------
-- Sample catalog data (users are seeded by the application on startup)
-- ------------------------------------------------------------------
INSERT INTO products (sku, name, description, price, slot_quantity, active, created_at, updated_at) VALUES
('SKU-TSHIRT-001', 'Gamma T-Shirt',      'Soft cotton t-shirt with Gamma logo.',            49.90, 100, 1, NOW(), NOW()),
('SKU-MUG-001',    'Gamma Coffee Mug',   'Ceramic mug, 350ml, dishwasher safe.',            25.00,  50, 1, NOW(), NOW()),
('SKU-BOTTLE-001', 'Gamma Water Bottle', 'Insulated stainless steel bottle, 750ml.',        79.00,  30, 1, NOW(), NOW()),
('SKU-CAP-001',    'Gamma Cap',          'Adjustable baseball cap, one size fits all.',     35.50,  80, 1, NOW(), NOW());

INSERT INTO promotions (code, name, description, discount_type, discount_value, starts_at, ends_at, active, created_at) VALUES
('WELCOME10', 'Welcome 10%', '10% off your whole order', 'PERCENTAGE', 10.00, NOW() - INTERVAL 1 DAY, NOW() + INTERVAL 90 DAY, 1, NOW());
