# Purchase And Sales Schema

This is the corrected purchase + sales schema for Unidex ERP.

## Tables

### `products`
- `id` `BIGINT UNSIGNED` PK
- `company_id` `BIGINT UNSIGNED`
- `product_code` `VARCHAR(50)`
- `product_name` `VARCHAR(200)`
- `product_type` `ENUM('service', 'product')`
- `hsn_sac_code` `VARCHAR(20)`
- `unit_name` `VARCHAR(30)`
- `purchase_price` `DECIMAL(12,2)`
- `mrp` `DECIMAL(12,2)`
- `selling_price` `DECIMAL(12,2)`
- `discount_percentage` `DECIMAL(5,2)`
- `max_discount_percentage` `DECIMAL(5,2)`
- `gst_rate` `DECIMAL(5,2)`
- `low_stock_threshold` `DECIMAL(12,2)`
- `last_purchase_date` `DATE`
- `is_active` `TINYINT(1)`
- `created_at` `TIMESTAMP`
- `updated_at` `TIMESTAMP`

### `vendors`
- `id` `BIGINT UNSIGNED` PK
- `name` `VARCHAR(255)`
- `phone` `VARCHAR(15)`
- `address` `TEXT`
- `gstin` `VARCHAR(15)`
- `state` `VARCHAR(50)`
- `pan` `VARCHAR(10)`
- `email` `VARCHAR(100)`
- `opening_balance` `DECIMAL(12,2)`
- `is_active` `TINYINT(1)`
- `created_at` `TIMESTAMP`
- `updated_at` `TIMESTAMP`

### `purchase_bills`
- `id` `BIGINT UNSIGNED` PK
- `bill_number` `VARCHAR(50)`
- `bill_date` `DATE`
- `vendor_id` `BIGINT UNSIGNED`
- `subtotal` `DECIMAL(12,2)`
- `total_gst` `DECIMAL(12,2)`
- `grand_total` `DECIMAL(12,2)`
- `amount_paid` `DECIMAL(12,2)`
- `payment_method` `ENUM('cash', 'upi', 'bank', 'mixed')`
- `status` `ENUM('paid', 'partial', 'unpaid')`
- `notes` `TEXT`
- `created_at` `TIMESTAMP`
- `updated_at` `TIMESTAMP`

### `purchase_bill_items`
- `id` `BIGINT UNSIGNED` PK
- `purchase_bill_id` `BIGINT UNSIGNED`
- `product_id` `BIGINT UNSIGNED`
- `quantity` `DECIMAL(12,2)`
- `purchase_rate` `DECIMAL(10,2)`
- `gst_rate` `DECIMAL(5,2)`
- `line_total` `DECIMAL(12,2)`
- `created_at` `TIMESTAMP`
- `updated_at` `TIMESTAMP`

### `invoices`
- `id` `BIGINT UNSIGNED` PK
- `company_id` `BIGINT UNSIGNED`
- `customer_id` `BIGINT UNSIGNED`
- `created_by_user_id` `BIGINT UNSIGNED`
- `invoice_number` `VARCHAR(50)`
- `invoice_date` `DATE`
- `place_of_supply_state` `VARCHAR(100)`
- `supply_type` `ENUM('intra_state', 'inter_state')`
- `notes` `TEXT`
- `subtotal_amount` `DECIMAL(14,2)`
- `cgst_amount` `DECIMAL(14,2)`
- `sgst_amount` `DECIMAL(14,2)`
- `igst_amount` `DECIMAL(14,2)`
- `grand_total_amount` `DECIMAL(14,2)`
- `status` `ENUM('draft', 'sent', 'paid', 'cancelled')`
- `created_at` `TIMESTAMP`
- `updated_at` `TIMESTAMP`

### `invoice_items`
- `id` `BIGINT UNSIGNED` PK
- `invoice_id` `BIGINT UNSIGNED`
- `product_id` `BIGINT UNSIGNED`
- `purchase_bill_item_id` `BIGINT UNSIGNED`
- `line_number` `INT`
- `item_name` `VARCHAR(200)`
- `hsn_sac_code` `VARCHAR(20)`
- `quantity` `DECIMAL(12,2)`
- `unit_rate` `DECIMAL(12,2)`
- `gst_rate` `DECIMAL(5,2)`
- `taxable_value` `DECIMAL(14,2)`
- `line_total_amount` `DECIMAL(14,2)`
- `created_at` `TIMESTAMP`
- `updated_at` `TIMESTAMP`

## Traceability

Optional traceability works through:

`invoice_items.purchase_bill_item_id -> purchase_bill_items.id -> purchase_bills.id`

That allows:

Sold item -> exact purchase line item -> exact purchase bill
