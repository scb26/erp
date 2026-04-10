# Unidex Customer API Documentation

This document explains the current customer module backend in a simple flow.

## 1. What This API Does

This API manages customer records for the ERP.

You can:

- create a customer
- get all customers
- get one customer by id
- update a customer
- delete a customer

## 2. API Flow

The request flow is:

`Frontend -> Route -> Validation Middleware -> Controller -> Model -> MySQL -> JSON Response`

In this project, the files are:

- Route: [customerRoutes.js](/D:/New folder/erp/backend/src/routes/customerRoutes.js)
- Validation: [validateCustomer.js](/D:/New folder/erp/backend/src/middlewares/validateCustomer.js)
- Controller: [customerController.js](/D:/New folder/erp/backend/src/controllers/customerController.js)
- Model: [customerModel.js](/D:/New folder/erp/backend/src/models/customerModel.js)
- DB connection: [mysql.js](/D:/New folder/erp/backend/src/db/mysql.js)

## 3. Base URL

Local base URL:

```text
http://localhost:4000
```

## 4. Content Type

Use this header for all `POST` and `PUT` requests:

```http
Content-Type: application/json
```

## 5. Standard Response Format

Most responses follow this format:

### Success

```json
{
  "success": true,
  "message": "Customer created successfully",
  "data": {
    "id": 1
  }
}
```

### Error

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    "Name is required and must be at least 2 characters"
  ]
}
```

## 6. Status Codes Used

- `200` = success
- `400` = bad request or validation error
- `404` = record not found or route not found
- `500` = server error

## 7. Validation Rules

These rules are applied before saving or updating a customer:

- `name` is required for create and must be at least 2 characters
- `mobile` is required for create and must match Indian mobile format: `^[6-9]\d{9}$`
- `customer_type` must be `Individual` or `Business`
- `email` must be a valid email if provided
- `pincode` must be exactly 6 digits if provided
- `gst_number` must be a valid Indian GST number if provided
- duplicate mobile numbers are not allowed
- `opening_balance` must be numeric
- `credit_limit` must be numeric if provided
- for update, at least one valid field must be sent

Important note:

- GST is optional
- if `customer_type` is `Business`, GST number is allowed but not mandatory in the current implementation

## 8. Database Table

The customer table SQL is here:

[customers.sql](/D:/New folder/erp/backend/sql/customers.sql)

Main fields:

- `id`
- `name`
- `mobile`
- `customer_type`
- `company_name`
- `address`
- `gst_number`
- `opening_balance`
- `credit_limit`
- `email`
- `city`
- `state`
- `pincode`
- `created_at`

## 9. Endpoints In Order

### 9.1 Health Check

Use this to confirm the backend is running.

**Method**

```http
GET /health
```

**Example Response**

```json
{
  "success": true,
  "message": "Customer module backend is running"
}
```

### 9.2 Create Customer

Creates a new customer.

**Method**

```http
POST /customers
```

**Request Body**

```json
{
  "name": "Amit Traders",
  "mobile": "9876543210",
  "customer_type": "Business",
  "company_name": "Amit Traders Pvt Ltd",
  "address": "12 Market Road, Pune",
  "gst_number": "27ABCDE1234F1Z5",
  "opening_balance": 1500,
  "credit_limit": 50000,
  "email": "billing@amittraders.in",
  "city": "Pune",
  "state": "Maharashtra",
  "pincode": "411001"
}
```

**Required Fields**

- `name`
- `mobile`

**Success Response**

```json
{
  "success": true,
  "message": "Customer created successfully",
  "data": {
    "id": 1,
    "name": "Amit Traders",
    "mobile": "9876543210",
    "customer_type": "Business",
    "company_name": "Amit Traders Pvt Ltd",
    "address": "12 Market Road, Pune",
    "gst_number": "27ABCDE1234F1Z5",
    "opening_balance": "1500.00",
    "credit_limit": "50000.00",
    "email": "billing@amittraders.in",
    "city": "Pune",
    "state": "Maharashtra",
    "pincode": "411001",
    "created_at": "2026-04-07T10:00:00.000Z"
  }
}
```

**Common Error Responses**

Duplicate mobile:

```json
{
  "success": false,
  "message": "Customer with this mobile number already exists"
}
```

Validation failure:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    "Mobile number must be a valid 10-digit Indian mobile number"
  ]
}
```

### 9.3 Get All Customers

Returns all customers.

**Method**

```http
GET /customers
```

**Success Response**

```json
{
  "success": true,
  "message": "Customers fetched successfully",
  "data": [
    {
      "id": 1,
      "name": "Amit Traders",
      "mobile": "9876543210",
      "customer_type": "Business",
      "company_name": "Amit Traders Pvt Ltd",
      "address": "12 Market Road, Pune",
      "gst_number": "27ABCDE1234F1Z5",
      "opening_balance": "1500.00",
      "credit_limit": "50000.00",
      "email": "billing@amittraders.in",
      "city": "Pune",
      "state": "Maharashtra",
      "pincode": "411001",
      "created_at": "2026-04-07T10:00:00.000Z"
    }
  ]
}
```

### 9.4 Get Single Customer

Returns one customer by id.

**Method**

```http
GET /customers/:id
```

**Example**

```http
GET /customers/1
```

**Success Response**

```json
{
  "success": true,
  "message": "Customer fetched successfully",
  "data": {
    "id": 1,
    "name": "Amit Traders",
    "mobile": "9876543210",
    "customer_type": "Business",
    "company_name": "Amit Traders Pvt Ltd",
    "address": "12 Market Road, Pune",
    "gst_number": "27ABCDE1234F1Z5",
    "opening_balance": "1500.00",
    "credit_limit": "50000.00",
    "email": "billing@amittraders.in",
    "city": "Pune",
    "state": "Maharashtra",
    "pincode": "411001",
    "created_at": "2026-04-07T10:00:00.000Z"
  }
}
```

**Error Responses**

Invalid id:

```json
{
  "success": false,
  "message": "Customer id must be a valid positive integer"
}
```

Not found:

```json
{
  "success": false,
  "message": "Customer not found"
}
```

### 9.5 Update Customer

Updates an existing customer.

**Method**

```http
PUT /customers/:id
```

**Example**

```http
PUT /customers/1
```

**Request Body**

You can send one field or multiple fields.

```json
{
  "name": "Amit Traders and Co",
  "mobile": "9876543210",
  "city": "Mumbai",
  "credit_limit": 75000
}
```

**Important Rules**

- at least one valid field must be sent
- if you send `mobile`, it must still be unique
- if you send `email`, `gst_number`, or `pincode`, they must pass validation

**Success Response**

```json
{
  "success": true,
  "message": "Customer updated successfully",
  "data": {
    "id": 1,
    "name": "Amit Traders and Co",
    "mobile": "9876543210",
    "customer_type": "Business",
    "company_name": "Amit Traders Pvt Ltd",
    "address": "12 Market Road, Pune",
    "gst_number": "27ABCDE1234F1Z5",
    "opening_balance": "1500.00",
    "credit_limit": "75000.00",
    "email": "billing@amittraders.in",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "411001",
    "created_at": "2026-04-07T10:00:00.000Z"
  }
}
```

**Error Response**

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    "At least one valid field is required to update the customer"
  ]
}
```

### 9.6 Delete Customer

Deletes a customer by id.

**Method**

```http
DELETE /customers/:id
```

**Example**

```http
DELETE /customers/1
```

**Success Response**

```json
{
  "success": true,
  "message": "Customer deleted successfully"
}
```

**Not Found Response**

```json
{
  "success": false,
  "message": "Customer not found"
}
```

## 10. Route-Level Flow Example

Here is the exact flow for `POST /customers`:

1. Request comes to `POST /customers`
2. `validateCreateCustomer` checks the body
3. Controller checks whether the mobile already exists
4. Model inserts the customer into MySQL
5. Model fetches the new row by id
6. API returns JSON response

## 11. Common Error Cases

### Validation Error

Returned when input is invalid.

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    "Email must be a valid email address",
    "Pincode must be exactly 6 digits"
  ]
}
```

### Duplicate Entry

Returned when mobile already exists.

```json
{
  "success": false,
  "message": "Customer with this mobile number already exists"
}
```

### Route Not Found

Returned when endpoint does not exist.

```json
{
  "success": false,
  "message": "Route not found: /wrong-route"
}
```

### Internal Server Error

Returned for unexpected backend or database errors.

```json
{
  "success": false,
  "message": "Internal server error"
}
```

## 12. Quick Testing With cURL

### Create

```bash
curl -X POST http://localhost:4000/customers ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Amit Traders\",\"mobile\":\"9876543210\",\"customer_type\":\"Business\"}"
```

### Get All

```bash
curl http://localhost:4000/customers
```

### Get One

```bash
curl http://localhost:4000/customers/1
```

### Update

```bash
curl -X PUT http://localhost:4000/customers/1 ^
  -H "Content-Type: application/json" ^
  -d "{\"city\":\"Mumbai\",\"credit_limit\":75000}"
```

### Delete

```bash
curl -X DELETE http://localhost:4000/customers/1
```

## 13. Files Related To This API

- App entry: [app.js](/D:/New folder/erp/backend/src/app.js)
- Server start: [server.js](/D:/New folder/erp/backend/src/server.js)
- Routes: [customerRoutes.js](/D:/New folder/erp/backend/src/routes/customerRoutes.js)
- Controller: [customerController.js](/D:/New folder/erp/backend/src/controllers/customerController.js)
- Model: [customerModel.js](/D:/New folder/erp/backend/src/models/customerModel.js)
- Validation middleware: [validateCustomer.js](/D:/New folder/erp/backend/src/middlewares/validateCustomer.js)
- Error handler: [errorHandler.js](/D:/New folder/erp/backend/src/middlewares/errorHandler.js)
- Not found middleware: [notFound.js](/D:/New folder/erp/backend/src/middlewares/notFound.js)
- DB connection: [mysql.js](/D:/New folder/erp/backend/src/db/mysql.js)
- SQL table: [customers.sql](/D:/New folder/erp/backend/sql/customers.sql)

