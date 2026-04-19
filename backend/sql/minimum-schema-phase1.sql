CREATE DATABASE IF NOT EXISTS unidex_customer_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE unidex_customer_db;

CREATE TABLE IF NOT EXISTS companies (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  company_name VARCHAR(200) NOT NULL,
  gstin VARCHAR(15) NULL,
  state_name VARCHAR(100) NOT NULL,
  phone VARCHAR(30) NULL,
  email VARCHAR(190) NULL,
  address_line1 VARCHAR(200) NULL,
  city VARCHAR(100) NULL,
  postal_code VARCHAR(20) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_companies_gstin (gstin)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO companies (
  id,
  company_name,
  gstin,
  state_name,
  phone,
  email,
  address_line1,
  city,
  postal_code
)
SELECT
  1,
  'Unidex Demo Company',
  NULL,
  'Maharashtra',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL
WHERE NOT EXISTS (
  SELECT 1 FROM companies WHERE id = 1
);

SET @has_company_id := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers' AND COLUMN_NAME = 'company_id'
);
SET @sql_company_id := IF(
  @has_company_id = 0,
  'ALTER TABLE customers ADD COLUMN company_id BIGINT UNSIGNED NULL AFTER id',
  'SELECT 1'
);
PREPARE stmt_company_id FROM @sql_company_id;
EXECUTE stmt_company_id;
DEALLOCATE PREPARE stmt_company_id;

SET @has_customer_code := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers' AND COLUMN_NAME = 'customer_code'
);
SET @sql_customer_code := IF(
  @has_customer_code = 0,
  'ALTER TABLE customers ADD COLUMN customer_code VARCHAR(50) NULL AFTER company_id',
  'SELECT 1'
);
PREPARE stmt_customer_code FROM @sql_customer_code;
EXECUTE stmt_customer_code;
DEALLOCATE PREPARE stmt_customer_code;

SET @has_customer_name := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers' AND COLUMN_NAME = 'customer_name'
);
SET @sql_customer_name := IF(
  @has_customer_name = 0,
  'ALTER TABLE customers ADD COLUMN customer_name VARCHAR(200) NULL AFTER customer_code',
  'SELECT 1'
);
PREPARE stmt_customer_name FROM @sql_customer_name;
EXECUTE stmt_customer_name;
DEALLOCATE PREPARE stmt_customer_name;

SET @has_state_name := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers' AND COLUMN_NAME = 'state_name'
);
SET @sql_state_name := IF(
  @has_state_name = 0,
  'ALTER TABLE customers ADD COLUMN state_name VARCHAR(100) NULL AFTER gst_number',
  'SELECT 1'
);
PREPARE stmt_state_name FROM @sql_state_name;
EXECUTE stmt_state_name;
DEALLOCATE PREPARE stmt_state_name;

SET @has_phone := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers' AND COLUMN_NAME = 'phone'
);
SET @sql_phone := IF(
  @has_phone = 0,
  'ALTER TABLE customers ADD COLUMN phone VARCHAR(30) NULL AFTER email',
  'SELECT 1'
);
PREPARE stmt_phone FROM @sql_phone;
EXECUTE stmt_phone;
DEALLOCATE PREPARE stmt_phone;

SET @has_address_line1 := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers' AND COLUMN_NAME = 'address_line1'
);
SET @sql_address_line1 := IF(
  @has_address_line1 = 0,
  'ALTER TABLE customers ADD COLUMN address_line1 VARCHAR(200) NULL AFTER phone',
  'SELECT 1'
);
PREPARE stmt_address_line1 FROM @sql_address_line1;
EXECUTE stmt_address_line1;
DEALLOCATE PREPARE stmt_address_line1;

SET @has_postal_code := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers' AND COLUMN_NAME = 'postal_code'
);
SET @sql_postal_code := IF(
  @has_postal_code = 0,
  'ALTER TABLE customers ADD COLUMN postal_code VARCHAR(20) NULL AFTER pincode',
  'SELECT 1'
);
PREPARE stmt_postal_code FROM @sql_postal_code;
EXECUTE stmt_postal_code;
DEALLOCATE PREPARE stmt_postal_code;

SET @has_updated_at := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers' AND COLUMN_NAME = 'updated_at'
);
SET @sql_updated_at := IF(
  @has_updated_at = 0,
  'ALTER TABLE customers ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at',
  'SELECT 1'
);
PREPARE stmt_updated_at FROM @sql_updated_at;
EXECUTE stmt_updated_at;
DEALLOCATE PREPARE stmt_updated_at;

UPDATE customers
SET
  company_id = COALESCE(company_id, 1),
  customer_code = COALESCE(customer_code, CONCAT('CUST-', LPAD(id, 4, '0'))),
  customer_name = COALESCE(NULLIF(customer_name, ''), name),
  state_name = COALESCE(NULLIF(state_name, ''), state, 'Maharashtra'),
  phone = COALESCE(NULLIF(phone, ''), mobile),
  address_line1 = COALESCE(NULLIF(address_line1, ''), address),
  postal_code = COALESCE(NULLIF(postal_code, ''), pincode);

ALTER TABLE customers
  MODIFY COLUMN company_id BIGINT UNSIGNED NOT NULL,
  MODIFY COLUMN customer_code VARCHAR(50) NOT NULL,
  MODIFY COLUMN customer_name VARCHAR(200) NOT NULL,
  MODIFY COLUMN state_name VARCHAR(100) NOT NULL;

SET @has_uq_customers_company_code := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers' AND INDEX_NAME = 'uq_customers_company_code'
);
SET @sql_uq_customers_company_code := IF(
  @has_uq_customers_company_code = 0,
  'ALTER TABLE customers ADD UNIQUE KEY uq_customers_company_code (company_id, customer_code)',
  'SELECT 1'
);
PREPARE stmt_uq_customers_company_code FROM @sql_uq_customers_company_code;
EXECUTE stmt_uq_customers_company_code;
DEALLOCATE PREPARE stmt_uq_customers_company_code;

SET @has_idx_customers_company_name := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers' AND INDEX_NAME = 'idx_customers_company_name'
);
SET @sql_idx_customers_company_name := IF(
  @has_idx_customers_company_name = 0,
  'ALTER TABLE customers ADD KEY idx_customers_company_name (company_id, customer_name)',
  'SELECT 1'
);
PREPARE stmt_idx_customers_company_name FROM @sql_idx_customers_company_name;
EXECUTE stmt_idx_customers_company_name;
DEALLOCATE PREPARE stmt_idx_customers_company_name;

SET @has_fk_customers_company := (
  SELECT COUNT(*)
  FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'customers'
    AND CONSTRAINT_NAME = 'fk_customers_company'
);
SET @add_fk_customers_company := IF(
  @has_fk_customers_company = 0,
  'ALTER TABLE customers ADD CONSTRAINT fk_customers_company FOREIGN KEY (company_id) REFERENCES companies(id)',
  'SELECT 1'
);
PREPARE stmt_fk_customers FROM @add_fk_customers_company;
EXECUTE stmt_fk_customers;
DEALLOCATE PREPARE stmt_fk_customers;

CREATE TABLE IF NOT EXISTS products (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id BIGINT UNSIGNED NOT NULL,
  product_code VARCHAR(50) NOT NULL,
  product_name VARCHAR(200) NOT NULL,
  barcode VARCHAR(100) NULL,
  product_type ENUM('service', 'product') NOT NULL DEFAULT 'product',
  hsn_sac_code VARCHAR(20) NULL,
  unit_name VARCHAR(30) NOT NULL DEFAULT 'Nos',
  default_rate DECIMAL(12,2) NOT NULL,
  gst_rate DECIMAL(5,2) NOT NULL,
  stock_qty DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_products_company_code (company_id, product_code),
  UNIQUE KEY uq_products_company_barcode (company_id, barcode),
  KEY idx_products_company_name (company_id, product_name),
  CONSTRAINT fk_products_company
    FOREIGN KEY (company_id) REFERENCES companies(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS invoices (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id BIGINT UNSIGNED NOT NULL,
  customer_id INT NOT NULL,
  invoice_number VARCHAR(50) NOT NULL,
  invoice_date DATE NOT NULL,
  document_type ENUM('quick_bill', 'gst_invoice') NOT NULL DEFAULT 'gst_invoice',
  place_of_supply_state VARCHAR(100) NOT NULL,
  supply_type ENUM('intra_state', 'inter_state') NOT NULL,
  subtotal_amount DECIMAL(14,2) NOT NULL,
  cgst_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  sgst_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  igst_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  grand_total_amount DECIMAL(14,2) NOT NULL,
  status ENUM('draft', 'saved', 'paid', 'cancelled') NOT NULL DEFAULT 'saved',
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_invoices_company_number (company_id, invoice_number),
  KEY idx_invoices_company_date (company_id, invoice_date),
  KEY idx_invoices_customer_id (customer_id),
  CONSTRAINT fk_invoices_company
    FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT fk_invoices_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS invoice_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  invoice_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NULL,
  line_number INT NOT NULL,
  item_name VARCHAR(200) NOT NULL,
  barcode VARCHAR(100) NULL,
  hsn_sac_code VARCHAR(20) NULL,
  quantity DECIMAL(12,2) NOT NULL,
  unit_rate DECIMAL(12,2) NOT NULL,
  gst_rate DECIMAL(5,2) NOT NULL,
  taxable_value DECIMAL(14,2) NOT NULL,
  line_total_amount DECIMAL(14,2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_invoice_items_invoice_line (invoice_id, line_number),
  KEY idx_invoice_items_product_id (product_id),
  KEY idx_invoice_items_invoice_id (invoice_id),
  CONSTRAINT fk_invoice_items_invoice
    FOREIGN KEY (invoice_id) REFERENCES invoices(id),
  CONSTRAINT fk_invoice_items_product
    FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
