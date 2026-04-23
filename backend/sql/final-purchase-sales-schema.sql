SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS invoice_items;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS purchase_bill_items;
DROP TABLE IF EXISTS purchase_bills;
DROP TABLE IF EXISTS vendors;
DROP TABLE IF EXISTS products;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE products (
    id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id              BIGINT UNSIGNED NOT NULL,
    product_code            VARCHAR(50) NOT NULL,
    product_name            VARCHAR(200) NOT NULL,
    product_type            ENUM('service', 'product') NOT NULL DEFAULT 'product',
    hsn_sac_code            VARCHAR(20),
    unit_name               VARCHAR(30) NOT NULL DEFAULT 'Nos',

    purchase_price          DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    mrp                     DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    selling_price           DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    discount_percentage     DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    max_discount_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,

    gst_rate                DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    low_stock_threshold     DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    last_purchase_date      DATE NULL,

    is_active               TINYINT(1) NOT NULL DEFAULT 1,
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uk_products_company_product_code (company_id, product_code),
    KEY idx_products_company_id (company_id),
    KEY idx_products_name (product_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE vendors (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name                VARCHAR(255) NOT NULL,
    phone               VARCHAR(15) NOT NULL,
    address             TEXT,
    gstin               VARCHAR(15),
    state               VARCHAR(50) NOT NULL,
    pan                 VARCHAR(10),
    email               VARCHAR(100),
    opening_balance     DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    is_active           TINYINT(1) NOT NULL DEFAULT 1,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    KEY idx_vendors_name (name),
    KEY idx_vendors_phone (phone),
    KEY idx_vendors_gstin (gstin)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE purchase_bills (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    bill_number         VARCHAR(50) NOT NULL,
    bill_date           DATE NOT NULL,
    vendor_id           BIGINT UNSIGNED NOT NULL,

    subtotal            DECIMAL(12,2) NOT NULL,
    total_gst           DECIMAL(12,2) NOT NULL,
    grand_total         DECIMAL(12,2) NOT NULL,

    amount_paid         DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    payment_method      ENUM('cash', 'upi', 'bank', 'mixed') NOT NULL,
    status              ENUM('paid', 'partial', 'unpaid') NOT NULL DEFAULT 'unpaid',

    notes               TEXT,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uk_purchase_bills_bill_number (bill_number),
    KEY idx_purchase_bills_vendor_id (vendor_id),
    KEY idx_purchase_bills_bill_date (bill_date),

    CONSTRAINT fk_purchase_bills_vendor
        FOREIGN KEY (vendor_id)
        REFERENCES vendors(id)
        ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE purchase_bill_items (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    purchase_bill_id    BIGINT UNSIGNED NOT NULL,
    product_id          BIGINT UNSIGNED NOT NULL,

    quantity            DECIMAL(12,2) NOT NULL,
    purchase_rate       DECIMAL(10,2) NOT NULL,
    gst_rate            DECIMAL(5,2) NOT NULL,
    line_total          DECIMAL(12,2) NOT NULL,

    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    KEY idx_purchase_bill_items_bill_id (purchase_bill_id),
    KEY idx_purchase_bill_items_product_id (product_id),

    CONSTRAINT fk_purchase_bill_items_bill
        FOREIGN KEY (purchase_bill_id)
        REFERENCES purchase_bills(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_purchase_bill_items_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE invoices (
    id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id            BIGINT UNSIGNED NOT NULL,
    customer_id           BIGINT UNSIGNED NOT NULL,
    created_by_user_id    BIGINT UNSIGNED NULL,

    invoice_number        VARCHAR(50) NOT NULL,
    invoice_date          DATE NOT NULL,
    place_of_supply_state VARCHAR(100) NOT NULL,
    supply_type           ENUM('intra_state', 'inter_state') NOT NULL,

    notes                 TEXT,
    subtotal_amount       DECIMAL(14,2) NOT NULL,
    cgst_amount           DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    sgst_amount           DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    igst_amount           DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    grand_total_amount    DECIMAL(14,2) NOT NULL,

    status                ENUM('draft', 'sent', 'paid', 'cancelled') NOT NULL DEFAULT 'draft',
    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uk_invoices_company_invoice_number (company_id, invoice_number),
    KEY idx_invoices_customer_id (customer_id),
    KEY idx_invoices_invoice_date (invoice_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE invoice_items (
    id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    invoice_id            BIGINT UNSIGNED NOT NULL,
    product_id            BIGINT UNSIGNED NULL,
    purchase_bill_item_id BIGINT UNSIGNED NULL,

    line_number           INT NOT NULL,
    item_name             VARCHAR(200) NOT NULL,
    hsn_sac_code          VARCHAR(20),
    quantity              DECIMAL(12,2) NOT NULL,
    unit_rate             DECIMAL(12,2) NOT NULL,
    gst_rate              DECIMAL(5,2) NOT NULL,
    taxable_value         DECIMAL(14,2) NOT NULL,
    line_total_amount     DECIMAL(14,2) NOT NULL,

    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    KEY idx_invoice_items_invoice_id (invoice_id),
    KEY idx_invoice_items_product_id (product_id),
    KEY idx_invoice_items_purchase_bill_item_id (purchase_bill_item_id),
    UNIQUE KEY uk_invoice_items_invoice_line (invoice_id, line_number),

    CONSTRAINT fk_invoice_items_invoice
        FOREIGN KEY (invoice_id)
        REFERENCES invoices(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_invoice_items_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_invoice_items_purchase_bill_item
        FOREIGN KEY (purchase_bill_item_id)
        REFERENCES purchase_bill_items(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
