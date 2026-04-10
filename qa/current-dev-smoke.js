const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const APP_URL = "http://127.0.0.1:8080/";
const API_URL = "http://127.0.0.1:4000";
const RESULTS_DIR = "D:\\New folder\\erp\\qa\\results";
const ARTIFACTS_DIR = path.join(RESULTS_DIR, "artifacts");
const TIMESTAMP = new Date().toISOString();

function makeMobileNumber(seed) {
  const normalized = String(seed).replace(/\D/g, "").slice(-9).padStart(9, "0");
  return "9" + normalized;
}

async function runTest(results, id, moduleName, scenario, fn) {
  const startedAt = new Date().toISOString();

  try {
    const detail = await fn();
    results.push({
      id,
      module: moduleName,
      scenario,
      status: "PASS",
      startedAt,
      finishedAt: new Date().toISOString(),
      detail: detail || ""
    });
  } catch (error) {
    results.push({
      id,
      module: moduleName,
      scenario,
      status: "FAIL",
      startedAt,
      finishedAt: new Date().toISOString(),
      detail: error && error.message ? error.message : String(error)
    });
  }
}

async function ensureBackend(page, uniqueName, uniqueMobile) {
  const health = await page.request.get(API_URL + "/health", { failOnStatusCode: false });

  if (!health.ok()) {
    throw new Error("Backend health check failed with status " + health.status());
  }

  await page.request.post(API_URL + "/customers", {
    data: {
      name: uniqueName,
      mobile: uniqueMobile,
      customer_type: "Business",
      company_name: "QA Existing Pvt Ltd",
      address: "88 QA Street, Pune",
      gst_number: "27ABCDE1234F1Z5",
      opening_balance: 0,
      credit_limit: 10000,
      email: "qa.existing@unidex.in",
      city: "Pune",
      state: "Maharashtra",
      pincode: "411001"
    },
    failOnStatusCode: false
  });
}

async function resetBrowserState(page) {
  await page.goto(APP_URL, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    localStorage.removeItem("ledgerflow-invoices");
    localStorage.removeItem("ledgerflow-products");
    localStorage.removeItem("ledgerflow-company");
    localStorage.removeItem("ledgerflow-sidebar-collapsed");
    localStorage.setItem("ledgerflow-theme", "dark");
    document.documentElement.setAttribute("data-theme", "dark");
  });
  await page.reload({ waitUntil: "networkidle" });
}

async function saveCompany(page, values) {
  await page.locator('.feature-button[data-module="admin"]').click();
  await page.fill("#company-name", values.name);
  await page.fill("#company-gstin", values.gstin);
  await page.fill("#company-pan", values.pan);
  await page.fill("#company-phone", values.phone);
  await page.selectOption("#company-state", values.state);
  await page.fill("#company-pincode", values.pincode);
  await page.fill("#company-address", values.address);
  await page.selectOption("#company-business-type", values.businessType);
  await page.selectOption("#company-business-category", values.businessCategory);
  await page.fill("#company-email", values.email);
  await page.fill("#company-financial-year-start", values.financialYearStart);
  await page.fill("#company-invoice-prefix", values.invoicePrefix);
}

async function saveInvoice(page, invoiceNumber, customerName, options) {
  await page.locator('.feature-button[data-module="invoices"]').click();
  await page.fill("#invoice-number", invoiceNumber);
  await page.fill("#invoice-date", "2026-04-10");
  await page.fill("#invoice-customer-name", customerName);
  await page.waitForTimeout(250);

  if (options && options.selectSuggestion) {
    await page.locator(".customer-suggestion").first().click();
  }

  await page.locator(".line-product").selectOption({ label: options.productName });
  await page.fill(".line-qty", String(options.quantity));
  await page.fill(".line-rate", String(options.rate));
  await page.fill(".line-gst", String(options.gstRate));
  await page.fill("#invoice-notes", options.notes);
  await page.click('#invoice-form button[type="submit"]');
  await page.waitForTimeout(350);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 960 } });
  const suffix = Date.now();
  const uniqueCustomerName = "QA Existing Customer " + suffix;
  const uniqueCustomerMobile = makeMobileNumber(suffix);
  const results = [];

  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

  page.on("pageerror", (error) => {
    results.push({
      id: "BROWSER-ERROR",
      module: "Runtime",
      scenario: "Unhandled browser error",
      status: "FAIL",
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      detail: error.stack || error.message || String(error)
    });
  });

  try {
    await ensureBackend(page, uniqueCustomerName, uniqueCustomerMobile);
    await resetBrowserState(page);

    await runTest(results, "SMK-001", "Bootstrap", "App loads with core modules visible", async function () {
      const moduleCount = await page.locator(".feature-button").count();

      if (moduleCount < 5) {
        throw new Error("Expected at least 5 module buttons, found " + moduleCount);
      }

      return "Loaded app successfully with " + moduleCount + " modules.";
    });

    await runTest(results, "ADM-001", "Admin", "Invalid GSTIN shows validation message", async function () {
      await page.locator('.feature-button[data-module="admin"]').click();
      await page.fill("#company-gstin", "123");
      await page.click('#company-form button[type="submit"]');
      await page.waitForTimeout(150);

      const message = await page.locator("#company-form-message").innerText();

      if (!/GSTIN/i.test(message)) {
        throw new Error("Expected GSTIN validation message, received: " + message);
      }

      return message;
    });

    await runTest(results, "ADM-002", "Admin", "Valid company profile saves and updates summary", async function () {
      await saveCompany(page, {
        name: "Unidex QA Store",
        gstin: "27ABCDE1234F1Z5",
        pan: "ABCDE1234F",
        phone: "9876543210",
        state: "Maharashtra",
        pincode: "411001",
        address: "201 Market Arcade, Pune, Maharashtra",
        businessType: "Private Limited Company",
        businessCategory: "Technology",
        email: "accounts@unidex.in",
        financialYearStart: "2026-04-01",
        invoicePrefix: "INV-2026-"
      });

      await page.locator("#company-logo").setInputFiles("D:\\New folder\\erp\\mobile-screenshots\\admin.png");
      await page.locator("#company-signature").setInputFiles("D:\\New folder\\erp\\mobile-screenshots\\admin.png");
      await page.click('#company-form button[type="submit"]');
      await page.waitForTimeout(300);

      const message = await page.locator("#company-form-message").innerText();
      const summaryName = await page.locator("#admin-company-name").innerText();
      const logoCount = await page.locator("#company-logo-preview img").count();
      const signatureCount = await page.locator("#company-signature-preview img").count();

      if (!/saved successfully/i.test(message)) {
        throw new Error("Company profile did not report success: " + message);
      }

      if (summaryName !== "Unidex QA Store") {
        throw new Error("Company summary did not update. Current value: " + summaryName);
      }

      if (!logoCount || !signatureCount) {
        throw new Error("Logo/signature preview was not rendered after upload.");
      }

      return "Saved company profile and updated summary successfully.";
    });

    await runTest(results, "PRO-001", "Products", "New product appears in billing line items", async function () {
      const productName = "QA Product " + suffix;

      await page.locator('.feature-button[data-module="products"]').click();
      await page.fill("#product-name", productName);
      await page.fill("#product-hsn", "998312");
      await page.fill("#product-price", "125");
      await page.fill("#product-gst", "18");
      await page.click('#product-form button[type="submit"]');
      await page.waitForTimeout(250);

      await page.locator('.feature-button[data-module="invoices"]').click();
      await page.waitForTimeout(250);

      const optionTexts = await page.locator(".line-product option").allTextContents();

      if (optionTexts.indexOf(productName) === -1) {
        throw new Error("New product was not found in invoice line items.");
      }

      return "Product created and visible in invoice dropdown.";
    });

    await runTest(results, "INV-001", "Invoices", "Existing customer suggestion can be selected and billed", async function () {
      const invoiceNumber = "INV-QA-EXIST-" + suffix;
      const partialName = uniqueCustomerName.slice(0, 14);

      await page.locator('.feature-button[data-module="invoices"]').click();
      await page.fill("#invoice-customer-name", partialName);
      await page.waitForTimeout(250);

      const suggestionCount = await page.locator(".customer-suggestion").count();

      if (!suggestionCount) {
        throw new Error("Expected customer suggestions for existing customer search.");
      }

      await saveInvoice(page, invoiceNumber, partialName, {
        selectSuggestion: true,
        productName: "QA Product " + suffix,
        quantity: 2,
        rate: 125,
        gstRate: 18,
        notes: "Existing customer smoke test."
      });

      const historyText = await page.locator("#invoice-history").innerText();

      if (historyText.indexOf(uniqueCustomerName) === -1 || historyText.indexOf(invoiceNumber) === -1) {
        throw new Error("Saved invoice history does not show selected existing customer.");
      }

      return "Existing customer suggestion selected and invoice saved.";
    });

    await runTest(results, "INV-002", "Invoices", "New typed customer name saves as ad hoc invoice customer", async function () {
      const invoiceNumber = "INV-QA-NEW-" + suffix;
      const walkInName = "Walk In Customer " + suffix;

      await saveInvoice(page, invoiceNumber, walkInName, {
        selectSuggestion: false,
        productName: "QA Product " + suffix,
        quantity: 1,
        rate: 80,
        gstRate: 18,
        notes: "Ad hoc customer smoke test."
      });

      const savedInvoices = await page.evaluate(function () {
        return JSON.parse(localStorage.getItem("ledgerflow-invoices") || "[]");
      });

      if (!savedInvoices.length || savedInvoices[0].customer.name !== walkInName) {
        throw new Error("Latest saved invoice does not contain the ad hoc customer name.");
      }

      return "Ad hoc customer invoice saved with typed customer name.";
    });

    await runTest(results, "UI-001", "UI", "Theme choice persists after reload", async function () {
      await page.click("#theme-toggle");
      await page.waitForTimeout(150);

      const beforeReload = await page.evaluate(function () {
        return document.documentElement.getAttribute("data-theme");
      });

      await page.reload({ waitUntil: "networkidle" });

      const afterReload = await page.evaluate(function () {
        return document.documentElement.getAttribute("data-theme");
      });

      if (beforeReload !== afterReload) {
        throw new Error("Theme did not persist after reload.");
      }

      return "Theme persisted as " + afterReload + ".";
    });

    await runTest(results, "UI-002", "UI", "Sidebar collapse state persists after reload", async function () {
      await page.locator("#sidebar-toggle").click();
      await page.waitForTimeout(150);

      const collapsedBeforeReload = await page.locator("#feature-rail").evaluate(function (el) {
        return el.classList.contains("is-collapsed");
      });

      await page.reload({ waitUntil: "networkidle" });

      const collapsedAfterReload = await page.locator("#feature-rail").evaluate(function (el) {
        return el.classList.contains("is-collapsed");
      });

      if (!collapsedBeforeReload || !collapsedAfterReload) {
        throw new Error("Collapsed sidebar state did not persist after reload.");
      }

      await page.locator("#sidebar-toggle").click();
      await page.waitForTimeout(150);

      return "Collapsed sidebar state persisted correctly.";
    });

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "current-dev-smoke-admin.png"),
      fullPage: true
    });
  } finally {
    fs.writeFileSync(
      path.join(RESULTS_DIR, "current-dev-smoke-results.json"),
      JSON.stringify(
        {
          generatedAt: TIMESTAMP,
          appUrl: APP_URL,
          apiUrl: API_URL,
          results
        },
        null,
        2
      )
    );

    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
