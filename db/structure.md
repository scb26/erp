# Unidex ERP Database Structure

This schema matches the current ERP modules and gives us a clean backend path.

## Core tables

- `roles`
  Stores permission groups like admin and billing staff.

- `users`
  Stores login accounts and links each user to a role.

- `companies`
  Stores the seller/business profile used on invoices and GST calculations.

- `customers`
  Stores buyer records, GSTIN, contact info, and state.

- `products`
  Stores item or service master data, HSN/SAC, default rate, and GST rate.

- `invoices`
  Stores invoice header data such as customer, company, invoice number, supply type, notes, and GST totals.

- `invoice_items`
  Stores invoice line items with quantity, rate, GST rate, taxable value, and line totals.

- `payments`
  Optional next-step table for payment tracking against invoices.

## Main relationships

- One `role` has many `users`
- One `company` has many `customers`
- One `company` has many `products`
- One `company` has many `invoices`
- One `customer` has many `invoices`
- One `invoice` has many `invoice_items`
- One `product` can appear in many `invoice_items`
- One `invoice` can have many `payments`

## GST logic mapping

- `companies.state_name` and `customers.state_name` decide whether an invoice is `intra_state` or `inter_state`
- `invoices.supply_type` stores that result
- `invoices.cgst_amount`, `invoices.sgst_amount`, and `invoices.igst_amount` store the header totals
- `invoice_items.gst_rate` stores the line-level GST rate used when the invoice was created

## Files

- SQL schema: [schema.sql](/D:/New folder/erp/db/schema.sql)
- MySQL schema: [schema.mysql.sql](/D:/New folder/erp/db/schema.mysql.sql)

