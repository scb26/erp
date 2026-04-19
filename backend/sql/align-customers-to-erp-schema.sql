-- Unidex
-- Safe additive migration to align the current live customer table
-- with the long-term ERP relational schema.
--
-- This script is intentionally non-destructive:
-- - it keeps legacy columns for compatibility
-- - it adds ERP-oriented columns
-- - it backfills new columns from current data
--
-- Run this only after confirming:
-- 1. the target database is the live backend customer database
-- 2. a matching company row exists or will exist for company_id assignment

START TRANSACTION;

-- Step 1: Add ERP-style columns without removing the old ones.
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS company_id BIGINT UNSIGNED NULL AFTER id,
  ADD COLUMN IF NOT EXISTS customer_code VARCHAR(50) NULL AFTER company_id,
  ADD COLUMN IF NOT EXISTS customer_name VARCHAR(200) NULL AFTER customer_code,
  ADD COLUMN IF NOT EXISTS gstin VARCHAR(15) NULL AFTER customer_name,
  ADD COLUMN IF NOT EXISTS state_name VARCHAR(100) NULL AFTER gstin,
  ADD COLUMN IF NOT EXISTS phone VARCHAR(30) NULL AFTER state_name,
  ADD COLUMN IF NOT EXISTS address_line1 VARCHAR(200) NULL AFTER phone,
  ADD COLUMN IF NOT EXISTS address_line2 VARCHAR(200) NULL AFTER address_line1,
  ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20) NULL AFTER city,
  ADD COLUMN IF NOT EXISTS country_name VARCHAR(100) NOT NULL DEFAULT 'India' AFTER postal_code,
  ADD COLUMN IF NOT EXISTS is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER country_name,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

-- Step 2: Backfill ERP columns from legacy columns.
UPDATE customers
SET
  customer_name = COALESCE(customer_name, name),
  gstin = COALESCE(gstin, gst_number),
  state_name = COALESCE(state_name, state),
  phone = COALESCE(phone, mobile),
  address_line1 = COALESCE(address_line1, address),
  postal_code = COALESCE(postal_code, pincode),
  country_name = COALESCE(country_name, 'India'),
  is_active = COALESCE(is_active, 1);

-- Step 3: Assign a default company_id.
-- Replace 1 with the actual company id if needed.
UPDATE customers
SET company_id = 1
WHERE company_id IS NULL;

-- Step 4: Generate a stable customer code for rows that do not have one.
UPDATE customers
SET customer_code = CONCAT('CUST-', LPAD(id, 4, '0'))
WHERE customer_code IS NULL OR customer_code = '';

-- Step 5: Tighten new columns after backfill.
ALTER TABLE customers
  MODIFY COLUMN company_id BIGINT UNSIGNED NOT NULL,
  MODIFY COLUMN customer_code VARCHAR(50) NOT NULL,
  MODIFY COLUMN customer_name VARCHAR(200) NOT NULL,
  MODIFY COLUMN state_name VARCHAR(100) NOT NULL;

-- Step 6: Add indexes that match the ERP shape.
ALTER TABLE customers
  ADD UNIQUE KEY uq_customers_company_code (company_id, customer_code),
  ADD KEY idx_customers_company_name (company_id, customer_name);

-- Step 7: Optional foreign key.
-- Enable only after the `companies` table exists in the same database
-- and the assigned company_id values are valid.
--
-- ALTER TABLE customers
--   ADD CONSTRAINT fk_customers_company
--   FOREIGN KEY (company_id) REFERENCES companies(id);

COMMIT;

-- After application code has been updated and verified, these old columns
-- can be removed in a later cleanup migration:
--   name
--   mobile
--   gst_number
--   state
--   pincode
--   address
