-- Unidex ERP
-- MySQL 8.0+ schema for the current invoice, GST, customer, product, and admin features.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS invoice_items;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS companies;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE roles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  role_id BIGINT UNSIGNED NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role_id (role_id),
  CONSTRAINT fk_users_role
    FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE companies (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  owner_user_id BIGINT UNSIGNED NULL,
  company_name VARCHAR(200) NOT NULL,
  legal_name VARCHAR(200) NULL,
  gstin VARCHAR(15) NULL,
  state_name VARCHAR(100) NOT NULL,
  address_line1 VARCHAR(200) NULL,
  address_line2 VARCHAR(200) NULL,
  city VARCHAR(100) NULL,
  postal_code VARCHAR(20) NULL,
  country_name VARCHAR(100) NOT NULL DEFAULT 'India',
  phone VARCHAR(30) NULL,
  email VARCHAR(190) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_companies_gstin (gstin),
  KEY idx_companies_owner_user_id (owner_user_id),
  CONSTRAINT fk_companies_owner_user
    FOREIGN KEY (owner_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE customers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id BIGINT UNSIGNED NOT NULL,
  customer_code VARCHAR(50) NOT NULL,
  customer_name VARCHAR(200) NOT NULL,
  gstin VARCHAR(15) NULL,
  state_name VARCHAR(100) NOT NULL,
  email VARCHAR(190) NULL,
  phone VARCHAR(30) NULL,
  address_line1 VARCHAR(200) NULL,
  address_line2 VARCHAR(200) NULL,
  city VARCHAR(100) NULL,
  postal_code VARCHAR(20) NULL,
  country_name VARCHAR(100) NOT NULL DEFAULT 'India',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_customers_company_code (company_id, customer_code),
  KEY idx_customers_company_name (company_id, customer_name),
  CONSTRAINT fk_customers_company
    FOREIGN KEY (company_id) REFERENCES companies(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE products (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id BIGINT UNSIGNED NOT NULL,
  product_code VARCHAR(50) NOT NULL,
  product_name VARCHAR(200) NOT NULL,
  product_type ENUM('service', 'product') NOT NULL DEFAULT 'service',
  hsn_sac_code VARCHAR(20) NULL,
  unit_name VARCHAR(30) NOT NULL DEFAULT 'Nos',
  default_rate DECIMAL(12,2) NOT NULL,
  gst_rate DECIMAL(5,2) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_products_company_code (company_id, product_code),
  KEY idx_products_company_name (company_id, product_name),
  CONSTRAINT fk_products_company
    FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT chk_products_gst_rate
    CHECK (gst_rate >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE invoices (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id BIGINT UNSIGNED NOT NULL,
  customer_id BIGINT UNSIGNED NOT NULL,
  created_by_user_id BIGINT UNSIGNED NULL,
  invoice_number VARCHAR(50) NOT NULL,
  invoice_date DATE NOT NULL,
  place_of_supply_state VARCHAR(100) NOT NULL,
  supply_type ENUM('intra_state', 'inter_state') NOT NULL,
  notes TEXT NULL,
  subtotal_amount DECIMAL(14,2) NOT NULL,
  cgst_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  sgst_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  igst_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  grand_total_amount DECIMAL(14,2) NOT NULL,
  status ENUM('draft', 'sent', 'paid', 'cancelled') NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_invoices_company_number (company_id, invoice_number),
  KEY idx_invoices_company_date (company_id, invoice_date),
  KEY idx_invoices_customer_id (customer_id),
  KEY idx_invoices_created_by_user_id (created_by_user_id),
  CONSTRAINT fk_invoices_company
    FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT fk_invoices_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id),
  CONSTRAINT fk_invoices_user
    FOREIGN KEY (created_by_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE invoice_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  invoice_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NULL,
  line_number INT NOT NULL,
  item_name VARCHAR(200) NOT NULL,
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

CREATE TABLE payments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  invoice_id BIGINT UNSIGNED NOT NULL,
  payment_date DATE NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  payment_mode VARCHAR(30) NOT NULL,
  reference_number VARCHAR(100) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_payments_invoice_id (invoice_id),
  CONSTRAINT fk_payments_invoice
    FOREIGN KEY (invoice_id) REFERENCES invoices(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO roles (code, name) VALUES
  ('super_admin', 'Super Admin'),
  ('admin', 'Admin'),
  ('billing_staff', 'Billing Staff');
