# Unidex ERP Current Development Test Report

## Overview
- Report date: `2026-04-10`
- Frontend under test: [index.html](D:\New folder\erp\index.html)
- Smoke runner: [current-dev-smoke.js](D:\New folder\erp\qa\current-dev-smoke.js)
- Raw results: [current-dev-smoke-results.json](D:\New folder\erp\qa\results\current-dev-smoke-results.json)
- Screenshot artifact: [current-dev-smoke-admin.png](D:\New folder\erp\qa\results\artifacts\current-dev-smoke-admin.png)

## Environment
- Frontend URL: `http://127.0.0.1:8080/`
- Backend URL: `http://127.0.0.1:4000/`
- Browser: Playwright Chromium
- Backend dependency: customer API must be reachable for customer-backed flows

## Execution Summary
- Planned smoke scenarios executed: `8`
- Passed: `7`
- Failed: `1`
- Runtime failures observed: `1`
- Overall result: `PARTIAL PASS`

## Executed Results
| ID | Module | Scenario | Status | Result |
| --- | --- | --- | --- | --- |
| `SMK-001` | Bootstrap | App loads with core modules visible | `PASS` | App loaded with 5 visible modules |
| `ADM-001` | Admin | Invalid GSTIN shows validation message | `PASS` | Correct validation message displayed |
| `ADM-002` | Admin | Valid company profile saves and updates summary | `PASS` | Company profile saved, summary updated, upload previews rendered |
| `PRO-001` | Products | New product appears in billing line items | `PASS` | Product was created and available in invoice item dropdown |
| `INV-001` | Invoices | Existing customer suggestion can be selected and billed | `PASS` | Existing customer suggestion was selected and invoice saved |
| `INV-002` | Invoices | New typed customer name saves as ad hoc invoice customer | `FAIL` | Invoice save path broke before ad hoc customer result could persist |
| `UI-001` | UI | Theme choice persists after reload | `PASS` | Theme persisted after reload |
| `UI-002` | UI | Sidebar collapse state persists after reload | `PASS` | Sidebar state persisted after reload |
| `BROWSER-ERROR` | Runtime | Unhandled browser error | `FAIL` | Browser storage quota exceeded during invoice save |

## Key Finding
### `HIGH` Local Storage Quota Can Block Invoice Saving
- Severity: `High`
- Affected area: invoice save after large admin logo or signature uploads
- Observed error:
  `QuotaExceededError: Failed to execute 'setItem' on 'Storage': Setting the value of 'ledgerflow-invoices' exceeded the quota.`
- Impact:
  Invoice creation can fail for normal users after image-heavy company profile data is saved. This directly affects billing reliability.
- Likely cause:
  Company logo and signature are stored as base64 image data in local storage, and invoices are also stored in local storage. The combined payload can exceed browser storage limits.
- Reproduction path:
  1. Save a company profile with uploaded logo and signature.
  2. Save an invoice with existing customer.
  3. Save another invoice with a typed ad hoc customer.
  4. Browser storage quota is exceeded and invoice persistence breaks.
- Recommended fix direction:
  1. Move invoices and company assets out of browser local storage into backend storage.
  2. If local storage must remain for now, resize or compress uploaded images before saving.
  3. Add graceful quota error handling with a user-facing message instead of silent failure.

## Notes From This Run
- Customer-backed flows require backend availability because customer records come from the API.
- Product, company profile, theme, sidebar state, and invoices still rely on browser local storage.
- The new invoice customer suggestion flow works for existing customers.
- The new invoice typed-customer flow is conceptually working, but the current persistence model can block it under heavier stored data.

## Recommendation
1. Fix the local storage quota issue before expanding billing workflows further.
2. Keep [TEST-CASES.md](D:\New folder\erp\qa\TEST-CASES.md) as the reusable QA checklist for future changes.
3. Re-run [current-dev-smoke.js](D:\New folder\erp\qa\current-dev-smoke.js) after the storage fix and update this report.
