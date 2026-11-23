-- ============================================================================
-- Migration: adds delivery addresses and van shipments to an EXISTING
-- gamma_shop database, without dropping any data.
--
-- HOW TO RUN: open this file in MySQL Workbench (File -> Open SQL Script...)
-- against your existing `gamma_shop` schema and press the lightning bolt.
-- Safe to run once; running it again will error on "column already exists" /
-- "table already exists" (harmless - it means it's already applied).
--
-- If you're setting up the database for the first time instead, just run
-- sql/schema.sql - it already includes everything in this file.
-- ============================================================================

USE gamma_shop;

ALTER TABLE users
    ADD COLUMN address VARCHAR(255) NULL AFTER phone,
    ADD COLUMN city     VARCHAR(100) NULL AFTER address;

CREATE TABLE shipments (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    van_label     VARCHAR(100) NOT NULL,
    city          VARCHAR(100) NULL,
    capacity      INT          NOT NULL DEFAULT 12,
    status        VARCHAR(20)  NOT NULL DEFAULT 'PLANNING',
    created_by    BIGINT NULL,
    created_at    DATETIME,
    dispatched_at DATETIME NULL,
    CONSTRAINT fk_shipment_creator FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
);

ALTER TABLE orders
    ADD COLUMN shipping_address VARCHAR(255) NULL AFTER assigned_staff_id,
    ADD COLUMN shipping_city    VARCHAR(100) NULL AFTER shipping_address,
    ADD COLUMN shipment_id      BIGINT NULL AFTER shipping_city,
    ADD CONSTRAINT fk_order_shipment FOREIGN KEY (shipment_id) REFERENCES shipments (id) ON DELETE SET NULL;

CREATE INDEX idx_orders_shipping_city ON orders (shipping_city);
CREATE INDEX idx_orders_shipment      ON orders (shipment_id);
CREATE INDEX idx_shipments_status     ON shipments (status);
