# Unidex ERP Test Cases

## Scope
This document captures reusable test cases for the current Unidex ERP build in [index.html](D:\New folder\erp\index.html). It is organized by module so the same checklist can be reused after future UI or backend changes.

## Dashboard
| ID | Scenario | Priority | Preconditions | Steps | Expected Result | Type |
| --- | --- | --- | --- | --- | --- | --- |
| `DASH-01` | Default dashboard load with no saved invoices | `P1` | Fresh local storage or no invoice records | Open app and land on Dashboard | Dashboard loads, billing status shows ready, latest invoice shows default empty state | Automation candidate |
| `DASH-02` | Dashboard reflects saved invoice summary | `P1` | At least one saved invoice exists | Open Dashboard after saving an invoice | Billing status, latest invoice, and recent activity show current invoice data | Automation candidate |
| `DASH-03` | Module switching from dashboard | `P2` | App loaded | Click each feature button from Dashboard | Correct module screen opens with no stale content | Automation candidate |
| `DASH-04` | Dashboard data after reload | `P2` | Invoice and company data exist | Reload page and open Dashboard | Dashboard values persist and remain correct | Automation candidate |

## Billing / Invoices
| ID | Scenario | Priority | Preconditions | Steps | Expected Result | Type |
| --- | --- | --- | --- | --- | --- | --- |
| `INV-01` | Invoice form loads with defaults | `P1` | App loaded, at least one product exists | Open Invoices module | Invoice number and date auto-fill, one line-item row exists, totals start at zero | Automation candidate |
| `INV-02` | Create invoice with existing customer via suggestion | `P1` | Existing customer and product available | Type partial customer name, select suggestion, complete line item, save | Invoice saves, success message appears, preview and history update with selected customer | Automation candidate |
| `INV-03` | Create invoice with brand-new typed customer | `P1` | Product available | Type a new customer name, complete line item, save | Invoice saves successfully and history shows typed customer name | Automation candidate |
| `INV-04` | Customer suggestion dropdown behavior | `P1` | Existing customers available | Type partial name, inspect suggestions, click outside, refocus | Suggestions appear, outside click closes them, selection fills customer field | Automation candidate |
| `INV-05` | Validation on empty or invalid invoice | `P1` | App loaded | Leave customer blank or remove valid line item, click Save | Invoice does not save and a clear error message appears | Automation candidate |
| `INV-06` | GST split for same-state customer | `P1` | Company state set, same-state customer exists, GST product exists | Select same-state customer and add taxable item | CGST and SGST split equally, IGST remains zero, grand total is correct | Automation candidate |
| `INV-07` | GST split for interstate customer | `P1` | Company state set, interstate customer exists, GST product exists | Select interstate customer and add taxable item | IGST applies, CGST and SGST remain zero, grand total is correct | Automation candidate |
| `INV-08` | Add or remove line items recalculates totals | `P1` | Product exists | Add second line item, change qty/rate/GST, remove a line | Preview and totals update immediately and correctly | Automation candidate |
| `INV-09` | Invoice history reopen | `P2` | Saved invoice exists | Click `View` in invoice history | Selected invoice loads in preview with correct values | Automation candidate |
| `INV-10` | Print preview opens with invoice data | `P2` | Valid draft or saved invoice exists | Click `Print preview` | Print window opens with company, customer, items, totals, and notes | Manual |
| `INV-11` | Ad hoc customer default state handling | `P2` | Company state set | Save invoice with typed unsaved customer name | Invoice saves and GST fallback logic stays stable | Manual |
| `INV-12` | Invoice persistence after reload | `P2` | Saved invoice exists | Reload page and open invoice history | Invoice remains saved and can be reopened | Automation candidate |

## Customers
| ID | Scenario | Priority | Preconditions | Steps | Expected Result | Type |
| --- | --- | --- | --- | --- | --- | --- |
| `CUST-01` | Create customer with valid data | `P1` | Backend running | Fill customer form with valid data and save | Customer is created, shown in list, and available in invoice suggestions | Automation candidate |
| `CUST-02` | Duplicate mobile validation | `P1` | Existing customer with known mobile | Create another customer with same mobile | Save is blocked and duplicate error is displayed | Automation candidate |
| `CUST-03` | Edit existing customer | `P1` | Existing customer available | Click `Edit`, change values, save | Updated values persist and invoice suggestions refresh | Automation candidate |
| `CUST-04` | Delete customer | `P1` | Existing customer available | Click `Delete` and confirm | Customer is removed from list and invoice suggestions | Automation candidate |
| `CUST-05` | Refresh customer list from backend | `P2` | Backend running, data exists in backend | Click `Refresh` | Local list updates from backend and shows status message | Automation candidate |
| `CUST-06` | Backend validation messages | `P2` | Backend running | Submit invalid mobile/email/pincode/GST data | API validation error is shown and record is not created | Automation candidate |

## Products
| ID | Scenario | Priority | Preconditions | Steps | Expected Result | Type |
| --- | --- | --- | --- | --- | --- | --- |
| `PROD-01` | Add product with GST and price | `P1` | App loaded | Enter product details and save | Product appears in product list and invoice dropdown | Automation candidate |
| `PROD-02` | Product persistence after reload | `P2` | Product added | Reload page and open Products and Invoices | Product remains in list and invoice dropdown | Automation candidate |
| `PROD-03` | Product defaults flow into invoice row | `P2` | Product exists with known values | Select product in invoice line item | Rate and GST auto-fill from product | Automation candidate |

## Admin
| ID | Scenario | Priority | Preconditions | Steps | Expected Result | Type |
| --- | --- | --- | --- | --- | --- | --- |
| `ADMIN-01` | Save valid company profile | `P1` | App loaded | Fill all required fields and save | Success message appears, summary panel updates, data persists | Automation candidate |
| `ADMIN-02` | Company validation errors | `P1` | App loaded | Enter invalid GSTIN, PAN, phone, or pincode and save | Save is blocked and validation message is shown | Automation candidate |
| `ADMIN-03` | Logo upload preview | `P2` | Image file available | Upload logo and save | Logo preview renders and persists after reload | Manual |
| `ADMIN-04` | Signature upload preview | `P2` | Image file available | Upload signature and save | Signature preview renders and persists after reload | Manual |
| `ADMIN-05` | Financial year and invoice prefix persistence | `P2` | App loaded | Set financial year start and invoice prefix, save, reload | Values persist correctly | Automation candidate |
| `ADMIN-06` | Company state impacts GST logic | `P1` | Company profile saved | Change company state and create invoices with same and different-state customers | GST split changes correctly | Automation candidate |

## UI / Theme / Sidebar
| ID | Scenario | Priority | Preconditions | Steps | Expected Result | Type |
| --- | --- | --- | --- | --- | --- | --- |
| `UI-01` | Dark and light theme toggle | `P2` | App loaded | Click theme toggle | Theme switches immediately and stays readable | Automation candidate |
| `UI-02` | Theme persistence across reload | `P2` | Theme changed | Reload page | Selected theme persists | Automation candidate |
| `UI-03` | Sidebar collapse and expand using arrow control | `P1` | Desktop width | Click left arrow, then right arrow | Sidebar collapses to icon-only mode and expands back, arrow updates correctly | Automation candidate |
| `UI-04` | Sidebar state persistence | `P2` | Sidebar collapsed or expanded | Reload page | Sidebar remains in previous state | Automation candidate |
| `UI-05` | Module menu buttons scroll to correct sections | `P2` | Module with multiple sections open | Click top menu buttons | Page scrolls to correct anchor sections | Automation candidate |

## Mobile
| ID | Scenario | Priority | Preconditions | Steps | Expected Result | Type |
| --- | --- | --- | --- | --- | --- | --- |
| `MOB-01` | Mobile load and navigation | `P1` | Phone-sized viewport | Open app and switch across modules | No horizontal overflow, navigation remains usable | Automation candidate |
| `MOB-02` | Invoice create flow on mobile | `P1` | Product exists | Create invoice on mobile from start to save | Fields remain usable, line items stack properly, save works | Automation candidate |
| `MOB-03` | Customer suggestions on mobile | `P1` | Existing customers available | Type partial customer name and tap suggestion | Suggestions remain visible, tappable, and not clipped | Automation candidate |
| `MOB-04` | Invoice preview and history readability on mobile | `P1` | Saved invoice exists | Open preview and history on mobile | Preview remains readable and history displays as cards | Automation candidate |
| `MOB-05` | Admin company profile on mobile | `P2` | Phone-sized viewport | Open Admin and save profile | Uploads, fields, and buttons fit mobile layout without overlap | Automation candidate |
| `MOB-06` | Sidebar collapsed state on mobile | `P2` | Mobile viewport | Collapse and expand features panel | Icon-only layout remains usable and toggle stays accessible | Manual |

## Recommended Execution Order
1. `ADMIN-01`, `ADMIN-02`
2. `PROD-01`, `PROD-03`
3. `CUST-01`, `CUST-03`, `CUST-04`
4. `INV-01` through `INV-08`
5. `UI-01` through `UI-04`
6. `MOB-01` through `MOB-05`
