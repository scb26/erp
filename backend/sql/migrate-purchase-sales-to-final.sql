/*
  Notes:
  1. Run SHOW CREATE TABLE on the affected tables first if your current foreign key names differ.
  2. Replace any DROP FOREIGN KEY names below if MySQL generated different names in your DB.
  3. This script assumes products.default_rate currently represents the selling price.
*/

ALTER TABLE purchase_bills
    DROP FOREIGN KEY fk_purchase_bills_vendor;

ALTER TABLE purchase_bill_items
    DROP FOREIGN KEY fk_purchase_bill_items_bill,
    DROP FOREIGN KEY fk_purchase_bill_items_product;

ALTER TABLE invoice_items
    DROP FOREIGN KEY fk_invoice_items_product,
    DROP FOREIGN KEY fk_invoice_items_purchase_bill_item;

ALTER TABLE vendors
    MODIFY id BIGINT UNSIGNED AUTO_INCREMENT;

ALTER TABLE purchase_bills
    MODIFY id BIGINT UNSIGNED AUTO_INCREMENT,
    MODIFY vendor_id BIGINT UNSIGNED NOT NULL,
    ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

ALTER TABLE purchase_bill_items
    MODIFY id BIGINT UNSIGNED AUTO_INCREMENT,
    MODIFY purchase_bill_id BIGINT UNSIGNED NOT NULL,
    MODIFY product_id BIGINT UNSIGNED NOT NULL,
    MODIFY quantity DECIMAL(12,2) NOT NULL,
    ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER line_total,
    ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

ALTER TABLE invoice_items
    MODIFY purchase_bill_item_id BIGINT UNSIGNED NULL,
    ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

ALTER TABLE products
    CHANGE COLUMN default_rate selling_price DECIMAL(12,2) NOT NULL,
    ADD COLUMN purchase_price DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER unit_name,
    ADD COLUMN mrp DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER purchase_price,
    ADD COLUMN discount_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00 AFTER selling_price,
    ADD COLUMN max_discount_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00 AFTER discount_percentage,
    ADD COLUMN low_stock_threshold DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER gst_rate,
    ADD COLUMN last_purchase_date DATE NULL AFTER low_stock_threshold,
    ADD UNIQUE KEY uk_products_company_product_code (company_id, product_code);

ALTER TABLE purchase_bills
    ADD CONSTRAINT fk_purchase_bills_vendor
        FOREIGN KEY (vendor_id)
        REFERENCES vendors(id)
        ON DELETE RESTRICT;

ALTER TABLE purchase_bill_items
    ADD CONSTRAINT fk_purchase_bill_items_bill
        FOREIGN KEY (purchase_bill_id)
        REFERENCES purchase_bills(id)
        ON DELETE CASCADE,
    ADD CONSTRAINT fk_purchase_bill_items_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE RESTRICT;

ALTER TABLE invoice_items
    ADD CONSTRAINT fk_invoice_items_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE SET NULL,
    ADD CONSTRAINT fk_invoice_items_purchase_bill_item
        FOREIGN KEY (purchase_bill_item_id)
        REFERENCES purchase_bill_items(id)
        ON DELETE SET NULL;
