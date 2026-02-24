import fs from "fs/promises";
import path from "path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "docs", "screenshots");
const PORTAL_BASE = "http://127.0.0.1:3100";
const ADMIN_URL = "http://127.0.0.1:3000/admin";
const BROWSER_CANDIDATES = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
];

const DESKTOP_VIEWPORT = { width: 1920, height: 1080 };

async function findBrowserExecutable() {
  for (const candidate of BROWSER_CANDIDATES) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {}
  }
  throw new Error("Nenhum browser Chromium encontrado (Edge/Chrome).");
}

async function cleanOutputDir() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const files = await fs.readdir(OUT_DIR);
  for (const file of files) {
    if (file.toLowerCase().endsWith(".png")) {
      await fs.unlink(path.join(OUT_DIR, file)).catch(() => null);
    }
  }
}

async function waitForUi(page, ms = 1400) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(ms);
}

async function shoot(page, name, options = {}) {
  const filePath = path.join(OUT_DIR, name);
  await page.screenshot({
    path: filePath,
    fullPage: options.fullPage === true
  });
  return name;
}

async function registerAndSeedPlan(context, seed) {
  const email = `portfolio_${seed}_${Date.now()}@example.com`;
  const register = await context.request.post(`${PORTAL_BASE}/auth/local/register`, {
    data: {
      email,
      password: "12345678",
      username: "Portfolio User"
    }
  });
  if (!register.ok()) {
    const body = await register.text();
    throw new Error(`register_failed: ${register.status()} ${body}`);
  }

  // Best effort to activate trial and enrich dashboard visuals.
  await context.request
    .post(`${PORTAL_BASE}/api/plans/trial`, { data: {} })
    .catch(() => null);
}

async function captureDashboardTab(page, tab, fileName) {
  await page.goto(`${PORTAL_BASE}/dashboard`, { waitUntil: "networkidle" });
  await page.evaluate((tabValue) => {
    window.localStorage.setItem("as_dash_tab", tabValue);
  }, tab);
  await page.goto(`${PORTAL_BASE}/dashboard`, { waitUntil: "networkidle" });
  await waitForUi(page, 1600);
  return shoot(page, fileName);
}

async function capturePortalDesktop(browser, outFiles) {
  const context = await browser.newContext({ viewport: DESKTOP_VIEWPORT });
  const page = await context.newPage();

  await page.goto(PORTAL_BASE, { waitUntil: "networkidle" });
  await waitForUi(page);
  outFiles.push(await shoot(page, "01-home-desktop.png"));

  await page.goto(`${PORTAL_BASE}/login`, { waitUntil: "networkidle" });
  await waitForUi(page);
  outFiles.push(await shoot(page, "02-login-desktop.png"));

  await page.goto(`${PORTAL_BASE}/plans`, { waitUntil: "networkidle" });
  await waitForUi(page);
  outFiles.push(await shoot(page, "03-plans-desktop.png"));

  await page.goto(`${PORTAL_BASE}/tutorials`, { waitUntil: "networkidle" });
  await waitForUi(page);
  outFiles.push(await shoot(page, "04-tutorials-desktop.png"));

  await page.goto(`${PORTAL_BASE}/terms`, { waitUntil: "networkidle" });
  await waitForUi(page);
  outFiles.push(await shoot(page, "05-terms-desktop.png"));

  await page.goto(`${PORTAL_BASE}/privacy`, { waitUntil: "networkidle" });
  await waitForUi(page);
  outFiles.push(await shoot(page, "06-privacy-desktop.png"));

  await registerAndSeedPlan(context, "desktop");

  outFiles.push(await captureDashboardTab(page, "overview", "07-dashboard-overview-desktop.png"));
  outFiles.push(await captureDashboardTab(page, "instances", "08-dashboard-instances-desktop.png"));
  outFiles.push(await captureDashboardTab(page, "store", "09-dashboard-store-desktop.png"));
  outFiles.push(await captureDashboardTab(page, "wallet", "10-dashboard-wallet-desktop.png"));
  outFiles.push(await captureDashboardTab(page, "account", "11-dashboard-account-desktop.png"));

  await context.close();
}

async function captureAdminDesktop(browser, outFiles) {
  const context = await browser.newContext({ viewport: DESKTOP_VIEWPORT });
  const page = await context.newPage();

  await page.goto(ADMIN_URL, { waitUntil: "networkidle" });
  await waitForUi(page, 2200);
  outFiles.push(await shoot(page, "12-admin-full-desktop.png", { fullPage: true }));

  const sections = [
    { id: "dashboard-panel", file: "13-admin-resumo-desktop.png" },
    { id: "business-panel", file: "14-admin-operacao-desktop.png" },
    { id: "requests-panel", file: "15-admin-solicitacoes-desktop.png" },
    { id: "accounts-panel", file: "16-admin-contas-desktop.png" },
    { id: "timeline-panel", file: "17-admin-auditoria-desktop.png" },
    { id: "orders-panel", file: "18-admin-pedidos-desktop.png" }
  ];

  for (const section of sections) {
    await page.evaluate((sectionId) => {
      const target = document.getElementById(sectionId);
      if (target) target.scrollIntoView({ block: "start" });
    }, section.id);
    await page.waitForTimeout(700);
    outFiles.push(await shoot(page, section.file));
  }

  await context.close();
}

async function capture() {
  await cleanOutputDir();
  const executablePath = await findBrowserExecutable();

  const browser = await chromium.launch({
    headless: true,
    executablePath
  });

  const outFiles = [];
  await capturePortalDesktop(browser, outFiles);
  await captureAdminDesktop(browser, outFiles);

  await browser.close();

  console.log("Screenshots gerados:");
  for (const file of outFiles) {
    console.log(path.join("docs", "screenshots", file));
  }
}

capture().catch((err) => {
  console.error(err?.stack || err?.message || String(err));
  process.exit(1);
});
