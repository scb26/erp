const fs = require("fs");
const { chromium, devices } = require("playwright");

async function ensureCustomer(page) {
  await page.request.post("http://127.0.0.1:4000/customers", {
    data: {
      name: "Mobile Demo Customer",
      mobile: "9876543210",
      customer_type: "Business",
      company_name: "Mobile Demo Pvt Ltd",
      address: "14 Demo Street, Pune",
      gst_number: "27ABCDE1234F1Z5",
      opening_balance: 0,
      credit_limit: 25000,
      email: "demo@unidex.local",
      city: "Pune",
      state: "Maharashtra",
      pincode: "411001"
    },
    failOnStatusCode: false
  });
}

async function screenshotModule(page, screenshotsDir, moduleKey) {
  await page.locator(`.feature-button[data-module="${moduleKey}"]`).click();
  await page.waitForTimeout(700);
  await page.screenshot({
    path: `${screenshotsDir}\\${moduleKey}.png`,
    fullPage: true
  });
}

async function createInvoice(page) {
  await page.locator('.feature-button[data-module="invoices"]').click();
  await page.waitForTimeout(700);

  await page.locator("#invoice-number").fill("INV-MOBILE-1");
  await page.locator("#invoice-date").fill("2026-04-09");
  await page.locator("#invoice-customer").selectOption({ index: 0 });
  await page.locator(".line-product").selectOption({ index: 0 });
  await page.locator(".line-qty").fill("2");
  await page.locator(".line-rate").fill("15000");
  await page.locator(".line-gst").fill("18");
  await page.locator("#invoice-notes").fill("Mobile responsiveness test invoice.");
  await page.locator("#invoice-form").evaluate((form) => form.scrollIntoView({ block: "start" }));
  await page.waitForTimeout(300);
  await page.locator('#invoice-form button[type="submit"]').click();
  await page.waitForTimeout(1000);
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...devices["iPhone 12"],
    baseURL: "http://127.0.0.1:8080"
  });
  const page = await context.newPage();
  const screenshotsDir = "D:\\New folder\\erp\\mobile-screenshots";

  fs.mkdirSync(screenshotsDir, { recursive: true });

  await ensureCustomer(page);

  await page.goto("/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);

  await screenshotModule(page, screenshotsDir, "dashboard");
  await createInvoice(page);
  await screenshotModule(page, screenshotsDir, "invoices");
  await screenshotModule(page, screenshotsDir, "customers");
  await screenshotModule(page, screenshotsDir, "products");
  await screenshotModule(page, screenshotsDir, "admin");

  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
