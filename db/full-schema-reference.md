# Unidex ERP Full Schema Reference

This document summarizes the planned full ERP database schema from `schema.mysql.sql` in a cleaner business-friendly format.

## Full Table List

### `roles`

| Column | Type | Notes |
|---|---|---|
| `id` | `BIGINT UNSIGNED` | Primary key, auto increment |
| `code` | `VARCHAR(50)` | Unique, required |
| `name` | `VARCHAR(100)` | Required |
| `created_at` | `TIMESTAMP` | Default current timestamp |

### `users`

| Column | Type | Notes |
|---|---|---|
| `id` | `BIGINT UNSIGNED` | Primary key, auto increment |
| `role_id` | `BIGINT UNSIGNED` | Foreign key -> `roles.id` |
| `full_name` | `VARCHAR(150)` | Required |
| `email` | `VARCHAR(190)` | Unique, required |
| `password_hash` | `VARCHAR(255)` | Required |
| `is_active` | `TINYINT(1)` | Default `1` |
| `created_at` | `TIMESTAMP` | Default current timestamp |
| `updated_at` | `TIMESTAMP` | Auto update timestamp |

### `companies`

| Column | Type | Notes |
|---|---|---|
| `id` | `BIGINT UNSIGNED` | Primary key, auto increment |
| `owner_user_id` | `BIGINT UNSIGNED` | Foreign key -> `users.id`, nullable |
| `company_name` | `VARCHAR(200)` | Required |
| `legal_name` | `VARCHAR(200)` | Nullable |
| `gstin` | `VARCHAR(15)` | Unique, nullable |
| `state_name` | `VARCHAR(100)` | Required |
| `address_line1` | `VARCHAR(200)` | Nullable |
| `address_line2` | `VARCHAR(200)` | Nullable |
| `city` | `VARCHAR(100)` | Nullable |
| `postal_code` | `VARCHAR(20)` | Nullable |
| `country_name` | `VARCHAR(100)` | Default `'India'` |
| `phone` | `VARCHAR(30)` | Nullable |
| `email` | `VARCHAR(190)` | Nullable |
| `created_at` | `TIMESTAMP` | Default current timestamp |
| `updated_at` | `TIMESTAMP` | Auto update timestamp |

### `customers`

| Column | Type | Notes |
|---|---|---|
| `id` | `BIGINT UNSIGNED` | Primary key, auto increment |
| `company_id` | `BIGINT UNSIGNED` | Foreign key -> `companies.id` |
| `customer_code` | `VARCHAR(50)` | Required |
| `customer_name` | `VARCHAR(200)` | Required |
| `gstin` | `VARCHAR(15)` | Nullable |
| `state_name` | `VARCHAR(100)` | Required |
| `email` | `VARCHAR(190)` | Nullable |
| `phone` | `VARCHAR(30)` | Nullable |
| `address_line1` | `VARCHAR(200)` | Nullable |
| `address_line2` | `VARCHAR(200)` | Nullable |
| `city` | `VARCHAR(100)` | Nullable |
| `postal_code` | `VARCHAR(20)` | Nullable |
| `country_name` | `VARCHAR(100)` | Default `'India'` |
| `is_active` | `TINYINT(1)` | Default `1` |
| `created_at` | `TIMESTAMP` | Default current timestamp |
| `updated_at` | `TIMESTAMP` | Auto update timestamp |

### `products`

| Column | Type | Notes |
|---|---|---|
| `id` | `BIGINT UNSIGNED` | Primary key, auto increment |
| `company_id` | `BIGINT UNSIGNED` | Foreign key -> `companies.id` |
| `product_code` | `VARCHAR(50)` | Required |
| `product_name` | `VARCHAR(200)` | Required |
| `product_type` | `ENUM('service','product')` | Default `'service'` |
| `hsn_sac_code` | `VARCHAR(20)` | Nullable |
| `unit_name` | `VARCHAR(30)` | Default `'Nos'` |
| `default_rate` | `DECIMAL(12,2)` | Required |
| `gst_rate` | `DECIMAL(5,2)` | Required |
| `is_active` | `TINYINT(1)` | Default `1` |
| `created_at` | `TIMESTAMP` | Default current timestamp |
| `updated_at` | `TIMESTAMP` | Auto update timestamp |

### `invoices`

| Column | Type | Notes |
|---|---|---|
| `id` | `BIGINT UNSIGNED` | Primary key, auto increment |
| `company_id` | `BIGINT UNSIGNED` | Foreign key -> `companies.id` |
| `customer_id` | `BIGINT UNSIGNED` | Foreign key -> `customers.id` |
| `created_by_user_id` | `BIGINT UNSIGNED` | Foreign key -> `users.id`, nullable |
| `invoice_number` | `VARCHAR(50)` | Required |
| `invoice_date` | `DATE` | Required |
| `place_of_supply_state` | `VARCHAR(100)` | Required |
| `supply_type` | `ENUM('intra_state','inter_state')` | Required |
| `notes` | `TEXT` | Nullable |
| `subtotal_amount` | `DECIMAL(14,2)` | Required |
| `cgst_amount` | `DECIMAL(14,2)` | Default `0` |
| `sgst_amount` | `DECIMAL(14,2)` | Default `0` |
| `igst_amount` | `DECIMAL(14,2)` | Default `0` |
| `grand_total_amount` | `DECIMAL(14,2)` | Required |
| `status` | `ENUM('draft','sent','paid','cancelled')` | Default `'draft'` |
| `created_at` | `TIMESTAMP` | Default current timestamp |
| `updated_at` | `TIMESTAMP` | Auto update timestamp |

### `invoice_items`

| Column | Type | Notes |
|---|---|---|
| `id` | `BIGINT UNSIGNED` | Primary key, auto increment |
| `invoice_id` | `BIGINT UNSIGNED` | Foreign key -> `invoices.id` |
| `product_id` | `BIGINT UNSIGNED` | Foreign key -> `products.id`, nullable |
| `line_number` | `INT` | Required |
| `item_name` | `VARCHAR(200)` | Required |
| `hsn_sac_code` | `VARCHAR(20)` | Nullable |
| `quantity` | `DECIMAL(12,2)` | Required |
| `unit_rate` | `DECIMAL(12,2)` | Required |
| `gst_rate` | `DECIMAL(5,2)` | Required |
| `taxable_value` | `DECIMAL(14,2)` | Required |
| `line_total_amount` | `DECIMAL(14,2)` | Required |
| `created_at` | `TIMESTAMP` | Default current timestamp |

### `payments`

| Column | Type | Notes |
|---|---|---|
| `id` | `BIGINT UNSIGNED` | Primary key, auto increment |
| `invoice_id` | `BIGINT UNSIGNED` | Foreign key -> `invoices.id` |
| `payment_date` | `DATE` | Required |
| `amount` | `DECIMAL(14,2)` | Required |
| `payment_mode` | `VARCHAR(30)` | Required |
| `reference_number` | `VARCHAR(100)` | Nullable |
| `notes` | `TEXT` | Nullable |
| `created_at` | `TIMESTAMP` | Default current timestamp |

## Dependency Order

Create these tables in this order:

1. `roles`
2. `users`
3. `companies`
4. `customers`
5. `products`
6. `invoices`
7. `invoice_items`
8. `payments`

Why this order:

- `users` depends on `roles`
- `companies` depends on `users`
- `customers` and `products` depend on `companies`
- `invoices` depends on `companies`, `customers`, and optionally `users`
- `invoice_items` depends on `invoices` and optionally `products`
- `payments` depends on `invoices`

## Practical Development Order

For current Unidex development, this is the more practical build order:

1. `companies`
2. `customers`
3. `products`
4. `invoices`
5. `invoice_items`
6. `payments`
7. `users`
8. `roles`

This matches the app flow more closely because company, customer, product, and billing are the first business modules being built.

## Module-wise Mapping

### Admin

- `companies`
- `users`
- `roles`

### Customers

- `customers`

### Products

- `products`

### Sales / Billing / Invoice

- `invoices`
- `invoice_items`
- `payments`

### GST / Tax Logic

- `companies.state_name`
- `customers.state_name`
- `invoices.supply_type`
- `invoices.cgst_amount`
- `invoices.sgst_amount`
- `invoices.igst_amount`
- `invoice_items.gst_rate`

## Important Note

The current live database still has only the simplified `customers` table. This full schema is the planned ERP target structure for the complete backend.
