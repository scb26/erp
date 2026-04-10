CREATE DATABASE IF NOT EXISTS unidex_customer_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE unidex_customer_db;

CREATE TABLE IF NOT EXISTS customers (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  mobile VARCHAR(10) NOT NULL,
  customer_type ENUM('Individual', 'Business') NOT NULL DEFAULT 'Individual',
  company_name VARCHAR(255) NULL,
  address TEXT NULL,
  gst_number VARCHAR(15) NULL,
  opening_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  credit_limit DECIMAL(12,2) NULL,
  email VARCHAR(255) NULL,
  city VARCHAR(100) NULL,
  state VARCHAR(100) NULL,
  pincode VARCHAR(6) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_customers_mobile (mobile)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
