# Customer Module Backend

Production-ready customer management backend built with Node.js, Express, and MySQL.

## Install

```bash
npm install
```

Or install manually:

```bash
npm install express mysql2 dotenv cors morgan
npm install -D nodemon
```

## Run

1. Copy `.env.example` to `.env`
2. Update your MySQL credentials
3. Create the `customers` table using [sql/customers.sql](/D:/New folder/erp/backend/sql/customers.sql)
4. Start the server

Development:

```bash
npm run dev
```

Production:

```bash
npm start
```

## Base URL

`http://localhost:4000`

## Endpoints

- `POST /customers`
- `GET /customers`
- `GET /customers/:id`
- `PUT /customers/:id`
- `DELETE /customers/:id`
