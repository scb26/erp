const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const http = require("http");

const ROOT = path.resolve(__dirname, "..");
const BACKEND_ROOT = path.join(ROOT, "backend");
const RESULTS_DIR = path.join(__dirname, "results");
const SCREENSHOT_DIR = path.join(__dirname, "screenshots");
const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const NODE_PATH = "C:\\Program Files\\nodejs\\node.exe";
const EDGE_PORT = 9222;
const API_BASE = "http://127.0.0.1:4000";
const APP_URL = "http://127.0.0.1:8080";

fs.mkdirSync(RESULTS_DIR, { recursive: true });
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function request(method, url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const payload = body ? Buffer.from(JSON.stringify(body)) : null;
    const req = http.request(
      {
        method,
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        headers: Object.assign(
          payload
            ? {
                "Content-Type": "application/json",
                "Content-Length": payload.length
              }
            : {},
          headers
        )
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          let json = null;
          try {
            json = text ? JSON.parse(text) : null;
          } catch (error) {
            json = null;
          }
          resolve({
            status: res.statusCode,
            headers: res.headers,
            text,
            json
          });
        });
      }
    );
    req.on("error", reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

function spawnProcess(command, args, cwd) {
  const child = spawn(command, args, {
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true
  });
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (data) => {
    stdout += data;
  });
  child.stderr.on("data", (data) => {
    stderr += data;
  });
  child.getLogs = () => ({ stdout, stderr });
  return child;
}

async function waitForHttp(url, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await request("GET", url);
      return res;
    } catch (error) {
      await sleep(500);
    }
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
          } catch (error) {
            reject(error);
          }
        });
      })
      .on("error", reject);
  });
}

class CdpClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.events = new Map();
  }

  async connect() {
    await new Promise((resolve, reject) => {
      this.ws.addEventListener("open", resolve, { once: true });
      this.ws.addEventListener("error", reject, { once: true });
    });

    this.ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) {
          reject(new Error(message.error.message));
        } else {
          resolve(message.result || {});
        }
        return;
      }

      const handlers = this.events.get(message.method) || [];
      handlers.forEach((handler) => handler(message.params));
    });
  }

  on(method, handler) {
    const handlers = this.events.get(method) || [];
    handlers.push(handler);
    this.events.set(method, handlers);
  }

  send(method, params = {}) {
    const id = this.nextId++;
    const payload = JSON.stringify({ id, method, params });
    this.ws.send(payload);
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }

  close() {
    this.ws.close();
  }
}

async function launchBrowserAndConnect() {
  const userDataDir = path.join(RESULTS_DIR, "edge-profile");
  fs.mkdirSync(userDataDir, { recursive: true });

  const edge = spawnProcess(
    EDGE_PATH,
    [
      "--headless=new",
      "--disable-gpu",
      `--remote-debugging-port=${EDGE_PORT}`,
      `--user-data-dir=${userDataDir}`,
      "about:blank"
    ],
    ROOT
  );

  let metadata;
  const start = Date.now();
  while (!metadata && Date.now() - start < 15000) {
    try {
      metadata = await fetchJson(`http://127.0.0.1:${EDGE_PORT}/json/version`);
    } catch (error) {
      await sleep(300);
    }
  }

  if (!metadata) {
    throw new Error("Unable to connect to Edge DevTools endpoint");
  }

  let targets = [];
  const targetStart = Date.now();
  while (!targets.length && Date.now() - targetStart < 10000) {
    try {
      targets = await fetchJson(`http://127.0.0.1:${EDGE_PORT}/json/list`);
      targets = targets.filter((target) => target.type === "page" && target.webSocketDebuggerUrl);
    } catch (error) {
      targets = [];
    }

    if (!targets.length) {
      await sleep(300);
    }
  }

  if (!targets.length) {
    throw new Error("Unable to find Edge page target");
  }

  const cdp = new CdpClient(targets[0].webSocketDebuggerUrl);
  await cdp.connect();
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("DOM.enable");
  await cdp.send("Network.enable");
  return { edge, cdp };
}

async function navigate(cdp, url) {
  const loadPromise = new Promise((resolve) => {
    const handler = () => resolve();
    cdp.on("Page.loadEventFired", handler);
  });
  await cdp.send("Page.navigate", { url });
  await loadPromise;
  await sleep(1000);
}

async function evaluate(cdp, expression) {
  const result = await cdp.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  return result.result ? result.result.value : undefined;
}

async function setViewport(cdp, width, height, mobile) {
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile,
    screenWidth: width,
    screenHeight: height
  });
}

async function captureScreenshot(cdp, filename) {
  const result = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true });
  const targetPath = path.join(SCREENSHOT_DIR, filename);
  fs.writeFileSync(targetPath, Buffer.from(result.data, "base64"));
  return targetPath;
}

async function runApiTests() {
  const results = [];
  const timestamp = Date.now();
  const sampleCustomer = {
    name: `QA Customer ${timestamp}`,
    mobile: `9${String(timestamp).slice(-9)}`,
    customer_type: "Business",
    company_name: "QA Traders",
    address: "123 Test Street",
    gst_number: "27ABCDE1234F1Z5",
    opening_balance: 100,
    credit_limit: 5000,
    email: "qa.customer@example.com",
    city: "Pune",
    state: "Maharashtra",
    pincode: "411001"
  };
  let createdCustomer = null;

  async function record(name, fn) {
    try {
      const detail = await fn();
      results.push({ name, status: "passed", detail });
    } catch (error) {
      results.push({ name, status: "failed", detail: error.message });
    }
  }

  await record("GET /health returns success", async () => {
    const res = await request("GET", `${API_BASE}/health`);
    if (res.status !== 200 || !res.json || !res.json.success) {
      throw new Error(`Unexpected response: ${res.status}`);
    }
    return res.json;
  });

  await record("GET /customers returns array", async () => {
    const res = await request("GET", `${API_BASE}/customers`);
    if (res.status !== 200 || !Array.isArray(res.json && res.json.data)) {
      throw new Error(`Unexpected response: ${res.status}`);
    }
    return { count: res.json.data.length };
  });

  await record("POST /customers creates valid customer", async () => {
    const res = await request("POST", `${API_BASE}/customers`, sampleCustomer);
    if (res.status !== 200 || !res.json || !res.json.success) {
      throw new Error(`Unexpected response: ${res.status} ${res.text}`);
    }
    createdCustomer = res.json.data;
    return createdCustomer;
  });

  await record("POST /customers rejects duplicate mobile", async () => {
    const res = await request("POST", `${API_BASE}/customers`, sampleCustomer);
    if (res.status !== 400) {
      throw new Error(`Expected 400, got ${res.status}`);
    }
    return res.json;
  });

  await record("POST /customers validates invalid mobile", async () => {
    const res = await request("POST", `${API_BASE}/customers`, {
      ...sampleCustomer,
      mobile: "123",
      name: "Bad Mobile"
    });
    if (res.status !== 400) {
      throw new Error(`Expected 400, got ${res.status}`);
    }
    return res.json;
  });

  await record("POST /customers validates invalid GST", async () => {
    const res = await request("POST", `${API_BASE}/customers`, {
      ...sampleCustomer,
      mobile: `8${String(timestamp).slice(-9)}`,
      gst_number: "BADGST"
    });
    if (res.status !== 400) {
      throw new Error(`Expected 400, got ${res.status}`);
    }
    return res.json;
  });

  await record("GET /customers/:id fetches created customer", async () => {
    if (!createdCustomer) {
      throw new Error("Create customer step did not produce an id");
    }
    const res = await request("GET", `${API_BASE}/customers/${createdCustomer.id}`);
    if (res.status !== 200 || !res.json || !res.json.data) {
      throw new Error(`Unexpected response: ${res.status}`);
    }
    return res.json.data;
  });

  await record("PUT /customers/:id updates customer", async () => {
    if (!createdCustomer) {
      throw new Error("Create customer step did not produce an id");
    }
    const res = await request("PUT", `${API_BASE}/customers/${createdCustomer.id}`, {
      city: "Mumbai",
      credit_limit: 6500
    });
    if (res.status !== 200 || res.json.data.city !== "Mumbai") {
      throw new Error(`Unexpected response: ${res.status}`);
    }
    return res.json.data;
  });

  await record("GET /customers/:id validates bad id", async () => {
    const res = await request("GET", `${API_BASE}/customers/abc`);
    if (res.status !== 400) {
      throw new Error(`Expected 400, got ${res.status}`);
    }
    return res.json;
  });

  await record("DELETE /customers/:id deletes customer", async () => {
    if (!createdCustomer) {
      throw new Error("Create customer step did not produce an id");
    }
    const res = await request("DELETE", `${API_BASE}/customers/${createdCustomer.id}`);
    if (res.status !== 200 || !res.json.success) {
      throw new Error(`Unexpected response: ${res.status}`);
    }
    return res.json;
  });

  await record("GET /customers/:id returns 404 after delete", async () => {
    if (!createdCustomer) {
      throw new Error("Create customer step did not produce an id");
    }
    const res = await request("GET", `${API_BASE}/customers/${createdCustomer.id}`);
    if (res.status !== 404) {
      throw new Error(`Expected 404, got ${res.status}`);
    }
    return res.json;
  });

  return results;
}

async function runUiTests(cdp) {
  const results = [];
  const stamp = Date.now();
  const product = {
    name: `QA Product ${stamp}`,
    barcode: `QB${stamp}`,
    hsn: "9988",
    price: "149.50",
    gst: "18",
    stock: "12"
  };

  async function record(name, fn) {
    try {
      const detail = await fn();
      results.push({ name, status: "passed", detail });
    } catch (error) {
      results.push({ name, status: "failed", detail: error.message });
    }
  }

  await setViewport(cdp, 1440, 1100, false);
  await navigate(cdp, APP_URL);

  await record("Dashboard loads with top widgets", async () => {
    const state = await evaluate(
      cdp,
      `(() => ({
        activeModule: window.Unidex && window.Unidex.app && window.Unidex.app.activeModule,
        widgetCount: document.querySelectorAll('#dashboard-overview .dashboard-widget').length,
        chartExists: !!document.getElementById('dashboard-chart')
      }))()`
    );
    if (state.activeModule !== "dashboard" || state.widgetCount < 3 || !state.chartExists) {
      throw new Error(JSON.stringify(state));
    }
    return state;
  });
  await captureScreenshot(cdp, "dashboard-desktop.png");

  await record("Sales module opens invoice view without blank state", async () => {
    const state = await evaluate(
      cdp,
      `(() => {
        const btn = document.querySelector('.feature-button[data-module="sales"]');
        btn && btn.click();
        const activeScreen = document.querySelector('.module-screen.is-active');
        const invoiceView = document.getElementById('billing-invoice-view');
        return {
          activeModule: window.Unidex.app.activeModule,
          activeScreen: activeScreen && activeScreen.dataset.module,
          invoiceVisible: !!(invoiceView && invoiceView.classList.contains('is-active')),
          toolbarVisible: getComputedStyle(document.querySelector('.workspace-toolbar')).display !== 'none'
        };
      })()`
    );
    if (state.activeModule !== "sales" || state.activeScreen !== "sales" || !state.invoiceVisible || !state.toolbarVisible) {
      throw new Error(JSON.stringify(state));
    }
    return state;
  });
  await captureScreenshot(cdp, "sales-desktop.png");

  await record("Quick Bill module opens as standalone and hides toolbar", async () => {
    const state = await evaluate(
      cdp,
      `(() => {
        const btn = document.querySelector('.feature-button[data-module="quickbill"]');
        btn && btn.click();
        const activeScreen = document.querySelector('.module-screen.is-active');
        const quickBillInput = document.getElementById('quick-barcode-input');
        return {
          activeModule: window.Unidex.app.activeModule,
          activeScreen: activeScreen && activeScreen.dataset.module,
          toolbarDisplay: getComputedStyle(document.querySelector('.workspace-toolbar')).display,
          quickBillInputExists: !!quickBillInput
        };
      })()`
    );
    if (state.activeModule !== "quickbill" || state.activeScreen !== "quickbill" || state.toolbarDisplay !== "none" || !state.quickBillInputExists) {
      throw new Error(JSON.stringify(state));
    }
    return state;
  });
  await captureScreenshot(cdp, "quickbill-desktop.png");

  await record("Products module renders add-product form", async () => {
    const state = await evaluate(
      cdp,
      `(() => {
        const btn = document.querySelector('.feature-button[data-module="products"]');
        btn && btn.click();
        return {
          activeModule: window.Unidex.app.activeModule,
          productForm: !!document.getElementById('product-form'),
          inventoryPanel: !!document.getElementById('product-inventory-list')
        };
      })()`
    );
    if (state.activeModule !== "products" || !state.productForm || !state.inventoryPanel) {
      throw new Error(JSON.stringify(state));
    }
    return state;
  });

  await record("Products module adds inventory item", async () => {
    const state = await evaluate(
      cdp,
      `(() => {
        const form = document.getElementById('product-form');
        document.getElementById('product-name').value = ${JSON.stringify(product.name)};
        document.getElementById('product-barcode').value = ${JSON.stringify(product.barcode)};
        document.getElementById('product-hsn').value = ${JSON.stringify(product.hsn)};
        document.getElementById('product-price').value = ${JSON.stringify(product.price)};
        document.getElementById('product-gst').value = ${JSON.stringify(product.gst)};
        document.getElementById('product-stock').value = ${JSON.stringify(product.stock)};
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        const created = window.Unidex.app.data.products.find((item) => item.barcode === ${JSON.stringify(product.barcode)});
        return {
          created: !!created,
          stock: created && created.stock,
          inventoryContainsProduct: document.getElementById('product-inventory-list').innerText.includes(${JSON.stringify(product.name)})
        };
      })()`
    );
    if (!state.created || !state.inventoryContainsProduct) {
      throw new Error(JSON.stringify(state));
    }
    return state;
  });
  await captureScreenshot(cdp, "products-desktop.png");

  await record("Quick Bill adds scanned product to cart", async () => {
    const state = await evaluate(
      cdp,
      `(() => {
        const btn = document.querySelector('.feature-button[data-module="quickbill"]');
        btn && btn.click();
        const input = document.getElementById('quick-barcode-input');
        input.value = ${JSON.stringify(product.barcode)};
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        const cart = window.Unidex.app.quickBillCart || [];
        return {
          cartCount: cart.length,
          firstItemName: cart[0] && cart[0].name,
          totalText: document.getElementById('quick-bill-total').textContent.trim()
        };
      })()`
    );
    if (state.cartCount < 1 || state.firstItemName !== product.name) {
      throw new Error(JSON.stringify(state));
    }
    return state;
  });

  await record("Admin module renders company form", async () => {
    const state = await evaluate(
      cdp,
      `(() => {
        const btn = document.querySelector('.feature-button[data-module="admin"]');
        btn && btn.click();
        return {
          activeModule: window.Unidex.app.activeModule,
          companyForm: !!document.getElementById('company-form'),
          logoInput: !!document.getElementById('company-logo'),
          signatureInput: !!document.getElementById('company-signature')
        };
      })()`
    );
    if (state.activeModule !== "admin" || !state.companyForm || !state.logoInput || !state.signatureInput) {
      throw new Error(JSON.stringify(state));
    }
    return state;
  });
  await captureScreenshot(cdp, "admin-desktop.png");

  await record("Sales module saves invoice with typed customer", async () => {
    const state = await evaluate(
      cdp,
      `(() => {
        const salesBtn = document.querySelector('.feature-button[data-module="sales"]');
        salesBtn && salesBtn.click();
        const app = window.Unidex.app;
        const beforeCount = app.data.invoices.length;
        const invoiceNumber = 'QA-INV-' + Date.now();
        document.getElementById('invoice-number').value = invoiceNumber;
        document.getElementById('invoice-date').value = '2026-04-16';
        document.getElementById('invoice-customer-name').value = 'QA Walkin Customer';
        document.getElementById('invoice-customer-name').dispatchEvent(new Event('input', { bubbles: true }));
        const row = document.querySelector('#line-items .line-item-row');
        const productSelect = row.querySelector('.line-product');
        const created = app.data.products.find((item) => item.barcode === ${JSON.stringify(product.barcode)});
        productSelect.value = created.id;
        productSelect.dispatchEvent(new Event('change', { bubbles: true }));
        row.querySelector('.line-qty').value = '2';
        row.querySelector('.line-qty').dispatchEvent(new Event('input', { bubbles: true }));
        row.querySelector('.line-rate').value = ${JSON.stringify(product.price)};
        row.querySelector('.line-rate').dispatchEvent(new Event('input', { bubbles: true }));
        row.querySelector('.line-gst').value = ${JSON.stringify(product.gst)};
        row.querySelector('.line-gst').dispatchEvent(new Event('input', { bubbles: true }));
        document.getElementById('invoice-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        return {
          beforeCount,
          afterCount: app.data.invoices.length,
          latestInvoiceNumber: app.data.invoices[0] && app.data.invoices[0].invoiceNumber,
          successMessage: document.getElementById('invoice-form-message').textContent.trim(),
          historyContainsInvoice: document.getElementById('invoice-history').innerText.includes(invoiceNumber)
        };
      })()`
    );
    if (state.afterCount !== state.beforeCount + 1 || !state.successMessage || !state.historyContainsInvoice) {
      throw new Error(JSON.stringify(state));
    }
    return state;
  });

  await setViewport(cdp, 390, 844, true);
  await navigate(cdp, APP_URL);

  await record("Mobile dashboard keeps bottom nav visible", async () => {
    const state = await evaluate(
      cdp,
      `(() => ({
        activeModule: window.Unidex.app.activeModule,
        bottomNavVisible: getComputedStyle(document.querySelector('.pwa-bottom-nav')).display !== 'none',
        dashboardVisible: !!document.querySelector('.module-screen.is-active[data-module="dashboard"]')
      }))()`
    );
    if (state.activeModule !== "dashboard" || !state.bottomNavVisible || !state.dashboardVisible) {
      throw new Error(JSON.stringify(state));
    }
    return state;
  });
  await captureScreenshot(cdp, "dashboard-mobile.png");

  await record("Mobile SCAN opens Quick Bill and hides toolbar", async () => {
    const state = await evaluate(
      cdp,
      `(() => {
        const scan = document.getElementById('tab-scan');
        scan && scan.click();
        return {
          activeModule: window.Unidex.app.activeModule,
          quickBillVisible: !!document.querySelector('.module-screen.is-active[data-module="quickbill"]'),
          toolbarDisplay: getComputedStyle(document.querySelector('.workspace-toolbar')).display
        };
      })()`
    );
    if (state.activeModule !== "quickbill" || !state.quickBillVisible || state.toolbarDisplay !== "none") {
      throw new Error(JSON.stringify(state));
    }
    return state;
  });
  await captureScreenshot(cdp, "quickbill-mobile.png");

  await record("Mobile Sales tab opens Sales invoice view", async () => {
    const state = await evaluate(
      cdp,
      `(() => {
        const salesTab = document.getElementById('tab-billing');
        salesTab && salesTab.click();
        const invoiceView = document.getElementById('billing-invoice-view');
        return {
          activeModule: window.Unidex.app.activeModule,
          salesVisible: !!document.querySelector('.module-screen.is-active[data-module="sales"]'),
          invoiceVisible: !!(invoiceView && invoiceView.classList.contains('is-active')),
          toolbarVisible: getComputedStyle(document.querySelector('.workspace-toolbar')).display !== 'none'
        };
      })()`
    );
    if (state.activeModule !== "sales" || !state.salesVisible || !state.invoiceVisible || !state.toolbarVisible) {
      throw new Error(JSON.stringify(state));
    }
    return state;
  });
  await captureScreenshot(cdp, "sales-mobile.png");

  return results;
}

async function main() {
  const startedAt = new Date().toISOString();
  const backend = spawnProcess(NODE_PATH, ["src/server.js"], BACKEND_ROOT);
  const frontend = spawnProcess(NODE_PATH, ["static-server.js"], ROOT);
  const report = {
    startedAt,
    environment: {
      appUrl: APP_URL,
      apiBase: API_BASE
    },
    api: [],
    ui: [],
    db: {},
    logs: {}
  };

  let edge;
  let cdp;

  try {
    await waitForHttp(`${API_BASE}/health`, 15000);
    await waitForHttp(`${APP_URL}/`, 15000);

    report.api = await runApiTests();

    report.db = {
      note: "Customer backend database uses a single simplified customers table. Structural verification was executed outside this script."
    };

    const browser = await launchBrowserAndConnect();
    edge = browser.edge;
    cdp = browser.cdp;
    report.ui = await runUiTests(cdp);
  } finally {
    if (cdp) {
      cdp.close();
    }
    if (edge) {
      edge.kill();
    }
    backend.kill();
    frontend.kill();
    report.logs.backend = backend.getLogs();
    report.logs.frontend = frontend.getLogs();
    report.finishedAt = new Date().toISOString();
  }

  const outputPath = path.join(RESULTS_DIR, "full-qa-results.json");
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(outputPath);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
