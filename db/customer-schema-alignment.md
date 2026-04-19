# Customer Schema Alignment

This document maps the current live customer backend table to the planned full Unidex ERP schema, and gives a safe migration path.

## Current situation

There are currently two customer models in the project:

1. `backend/sql/customers.sql`
   This is the live backend table used by the current customer API.

2. `db/schema.mysql.sql`
   This is the full ERP relational schema designed for long-term scaling.

Because both use the same table name `customers` but different column designs, the project is not fully aligned yet.

## Side-by-side mapping

| Current live backend column | Full ERP schema column | Meaning | Merge decision |
| --- | --- | --- | --- |
| `id` | `id` | Primary key | Keep, widen to `BIGINT UNSIGNED` later if needed |
| `name` | `customer_name` | Customer display name | Rename in app layer first, DB alias during transition |
| `mobile` | `phone` | Contact number | Map directly |
| `customer_type` | not present directly | Individual vs Business | Keep as an additive column or move to future business metadata |
| `company_name` | not present directly | Business customer firm name | Keep as additive column or fold into future business profile extension |
| `address` | `address_line1` + `address_line2` | Postal address | Split gradually; initial backfill goes to `address_line1` |
| `gst_number` | `gstin` | GST registration | Map directly |
| `opening_balance` | not present directly | Ledger starting balance | Keep as additive finance field |
| `credit_limit` | not present directly | Customer credit cap | Keep as additive finance field |
| `email` | `email` | Customer email | Map directly |
| `city` | `city` | Customer city | Map directly |
| `state` | `state_name` | State used for GST logic | Map directly |
| `pincode` | `postal_code` | Postal code | Map directly |
| `created_at` | `created_at` | Creation timestamp | Keep |
| not present | `company_id` | Which seller/business owns the customer | Must be added |
| not present | `customer_code` | Business-visible code like `CUST-0001` | Must be added |
| not present | `country_name` | Defaults to India | Add with default |
| not present | `is_active` | Soft active/inactive state | Add |
| not present | `updated_at` | Change tracking | Add |

## Why the mismatch matters

The live backend model is currently coded against legacy field names like:

- `name`
- `mobile`
- `gst_number`
- `state`
- `pincode`

But the ERP schema expects:

- `customer_name`
- `phone`
- `gstin`
- `state_name`
- `postal_code`
- `company_id`
- `customer_code`

That means:

- the current API cannot cleanly support multiple companies yet
- invoices cannot safely rely on relational ownership via `company_id`
- future modules will have naming mismatch across API, DB, and frontend

## Recommended safe merge strategy

Do this in 3 phases.

### Phase 1: Expand the current table safely

Add the ERP columns without deleting the legacy ones:

- `company_id`
- `customer_code`
- `customer_name`
- `gstin`
- `state_name`
- `phone`
- `address_line1`
- `address_line2`
- `postal_code`
- `country_name`
- `is_active`
- `updated_at`

Then backfill them from the current columns:

- `customer_name <- name`
- `phone <- mobile`
- `gstin <- gst_number`
- `state_name <- state`
- `postal_code <- pincode`
- `address_line1 <- address`

This keeps the existing API alive while preparing the final schema.

### Phase 2: Update backend code to use ERP naming

Then update backend files to read and write the new columns:

- `backend/src/models/customerModel.js`
- `backend/src/controllers/customerController.js`
- `backend/src/middlewares/validateCustomer.js`

Suggested API output shape during transition:

```json
{
  "id": 1,
  "customer_name": "Asha Traders",
  "phone": "9876543210",
  "gstin": "27ABCDE1234F1Z5",
  "state_name": "Maharashtra",
  "postal_code": "411001",
  "email": "asha@example.com",
  "city": "Pune",
  "company_id": 1,
  "customer_code": "CUST-0001"
}
```

If frontend compatibility is needed temporarily, the API can return aliases too:

```json
{
  "name": "Asha Traders",
  "mobile": "9876543210"
}
```

But the backend should internally move to the ERP names.

### Phase 3: Cleanup legacy columns

Only after frontend and backend are fully switched:

- stop using `name`
- stop using `mobile`
- stop using `gst_number`
- stop using `state`
- stop using `pincode`
- stop using `address`

At that point, drop the old columns and match the final ERP schema exactly.

## Practical merge choice for Unidex

For Unidex, the leanest path is:

1. Keep the current `customers` table name
2. Expand it in place with ERP columns
3. Backfill data
4. Shift backend code to ERP names
5. Later add the foreign key to `companies`

This is safer than:

- dropping and recreating the table
- maintaining two separate customer tables
- waiting until every module is backend-ready before aligning names

## Backend impact checklist

These files need code updates when we move from legacy naming to ERP naming:

- `backend/src/models/customerModel.js`
  Uses `name`, `mobile`, `gst_number`, `state`, `pincode`, `address`

- `backend/src/controllers/customerController.js`
  Checks duplicate customers using `mobile`

- `backend/src/middlewares/validateCustomer.js`
  Validates legacy request keys like `name`, `mobile`, `gst_number`, `state`, `pincode`

## Best next implementation step

Run the additive migration SQL first.

Then update the backend model and validation layer to:

- write ERP columns as primary source
- optionally return legacy aliases for frontend compatibility

After that, invoices and other modules can safely move onto the same relational customer model.
