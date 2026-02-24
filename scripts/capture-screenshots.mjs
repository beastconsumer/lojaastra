import fs from "fs/promises";
import path from "path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "docs", "screenshots");
const PORTAL_BASE = "http://127.0.0.1:3100";
const ADMIN_URL = "http://127.0.0.1:3000/admin";
const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

async function waitForUi(page, ms = 1400) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(ms);
}

async function capture() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    executablePath: EDGE_PATH
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  await page.goto(PORTAL_BASE, { waitUntil: "networkidle" });
  await waitForUi(page);
  await page.screenshot({ path: path.join(OUT_DIR, "01-home.png"), fullPage: true });

  await page.goto(`${PORTAL_BASE}/plans`, { waitUntil: "networkidle" });
  await waitForUi(page);
  await page.screenshot({ path: path.join(OUT_DIR, "02-plans.png"), fullPage: true });

  const email = `portfolio_${Date.now()}@example.com`;
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

  await page.goto(`${PORTAL_BASE}/dashboard`, { waitUntil: "networkidle" });
  await waitForUi(page, 1800);
  await page.screenshot({ path: path.join(OUT_DIR, "03-dashboard.png"), fullPage: true });

  await page.goto(`${PORTAL_BASE}/tutorials`, { waitUntil: "networkidle" });
  await waitForUi(page);
  await page.screenshot({ path: path.join(OUT_DIR, "04-tutorials.png"), fullPage: true });

  await page.goto(ADMIN_URL, { waitUntil: "networkidle" });
  await waitForUi(page, 1800);
  await page.screenshot({ path: path.join(OUT_DIR, "05-admin.png"), fullPage: true });

  await browser.close();

  const files = [
    "01-home.png",
    "02-plans.png",
    "03-dashboard.png",
    "04-tutorials.png",
    "05-admin.png"
  ];
  console.log("Screenshots gerados:");
  for (const file of files) {
    console.log(path.join("docs", "screenshots", file));
  }
}

capture().catch((err) => {
  console.error(err?.stack || err?.message || String(err));
  process.exit(1);
});
