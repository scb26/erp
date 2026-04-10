-- Unidex ERP
-- Core relational schema for the current invoice, GST, customer, product, and admin features.
-- Written in portable SQL leaning toward PostgreSQL/MySQL-style types and constraints.

CREATE TABLE roles (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  role_id BIGINT NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_role
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE TABLE companies (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  owner_user_id BIGINT NULL,
  company_name VARCHAR(200) NOT NULL,
  legal_name VARCHAR(200) NULL,
  gstin VARCHAR(15) NULL UNIQUE,
  state_name VARCHAR(100) NOT NULL,
  address_line1 VARCHAR(200) NULL,
  address_line2 VARCHAR(200) NULL,
  city VARCHAR(100) NULL,
  postal_code VARCHAR(20) NULL,
  country_name VARCHAR(100) NOT NULL DEFAULT 'India',
  phone VARCHAR(30) NULL,
  email VARCHAR(190) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_companies_owner_user
    FOREIGN KEY (owner_user_id) REFERENCES users(id)
);

CREATE TABLE customers (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  company_id BIGINT NOT NULL,
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
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_customers_company_code UNIQUE (company_id, customer_code),
  CONSTRAINT fk_customers_company
    FOREIGN KEY (company_id) REFERENCES companies(id)
);

CREATE TABLE products (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  company_id BIGINT NOT NULL,
  product_code VARCHAR(50) NOT NULL,
  product_name VARCHAR(200) NOT NULL,
  product_type VARCHAR(30) NOT NULL DEFAULT 'service',
  hsn_sac_code VARCHAR(20) NULL,
  unit_name VARCHAR(30) NOT NULL DEFAULT 'Nos',
  default_rate DECIMAL(12,2) NOT NULL,
  gst_rate DECIMAL(5,2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_products_company_code UNIQUE (company_id, product_code),
  CONSTRAINT ck_products_gst_rate CHECK (gst_rate >= 0),
  CONSTRAINT fk_products_company
    FOREIGN KEY (company_id) REFERENCES companies(id)
);

CREATE TABLE invoices (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  company_id BIGINT NOT NULL,
  customer_id BIGINT NOT NULL,
  created_by_user_id BIGINT NULL,
  invoice_number VARCHAR(50) NOT NULL,
  invoice_date DATE NOT NULL,
  place_of_supply_state VARCHAR(100) NOT NULL,
  supply_type VARCHAR(20) NOT NULL,
  notes TEXT NULL,
  subtotal_amount DECIMAL(14,2) NOT NULL,
  cgst_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  sgst_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  igst_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  grand_total_amount DECIMAL(14,2) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_invoices_company_number UNIQUE (company_id, invoice_number),
  CONSTRAINT ck_invoices_supply_type CHECK (supply_type IN ('intra_state', 'inter_state')),
  CONSTRAINT fk_invoices_company
    FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT fk_invoices_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id),
  CONSTRAINT fk_invoices_user
    FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

CREATE TABLE invoice_items (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  invoice_id BIGINT NOT NULL,
  product_id BIGINT NULL,
  line_number INT NOT NULL,
  item_name VARCHAR(200) NOT NULL,
  hsn_sac_code VARCHAR(20) NULL,
  quantity DECIMAL(12,2) NOT NULL,
  unit_rate DECIMAL(12,2) NOT NULL,
  gst_rate DECIMAL(5,2) NOT NULL,
  taxable_value DECIMAL(14,2) NOT NULL,
  line_total_amount DECIMAL(14,2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_invoice_items_invoice_line UNIQUE (invoice_id, line_number),
  CONSTRAINT fk_invoice_items_invoice
    FOREIGN KEY (invoice_id) REFERENCES invoices(id),
  CONSTRAINT fk_invoice_items_product
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE payments (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  invoice_id BIGINT NOT NULL,
  payment_date DATE NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  payment_mode VARCHAR(30) NOT NULL,
  reference_number VARCHAR(100) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_payments_invoice
    FOREIGN KEY (invoice_id) REFERENCES invoices(id)
);

CREATE INDEX idx_customers_company_name ON customers(company_id, customer_name);
CREATE INDEX idx_products_company_name ON products(company_id, product_name);
CREATE INDEX idx_invoices_company_date ON invoices(company_id, invoice_date);
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);

-- Seed roles for future login and permissions work.
INSERT INTO roles (code, name) VALUES
  ('super_admin', 'Super Admin'),
  ('admin', 'Admin'),
  ('billing_staff', 'Billing Staff');
