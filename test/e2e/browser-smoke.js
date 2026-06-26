const { chromium } = require("playwright");

const url = process.env.BROWSER_SMOKE_URL || "http://127.0.0.1:8080/share/smoke-token";
const viewportName = process.env.BROWSER_SMOKE_VIEWPORT || "desktop";
const viewport = viewportName === "mobile"
  ? { width: 390, height: 844, isMobile: true }
  : { width: 1440, height: 900 };

async function main() {
  console.log(`Browser smoke starting for ${viewportName}: ${url}`);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport });
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(String(error)));

    console.log("Browser smoke opened page");
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    console.log("Browser smoke DOM loaded");

    const requiredSelectors = [
      ".app-container",
      ".app-header",
      "#markdown-editor",
      "#markdown-preview",
      "#tab-list",
      "#theme-toggle",
      "#default-markdown"
    ];

    for (const selector of requiredSelectors) {
      console.log(`Browser smoke waiting for ${selector}`);
      await page.locator(selector).first().waitFor({ state: "attached", timeout: 10_000 });
    }

    const title = await page.locator(".app-header h1").innerText();
    if (title.trim() !== "Markdown Viewer") {
      throw new Error(`Unexpected app header: ${title}`);
    }

    if (viewportName === "mobile") {
      await page.locator("#mobile-menu-toggle").click();
      await page.locator("#mobile-menu-panel.active").waitFor({ state: "attached", timeout: 5_000 });
    }

    if (pageErrors.length > 0) {
      throw new Error(`Browser page errors:\n${pageErrors.join("\n")}`);
    }

    console.log(`Browser smoke passed for ${viewportName}: ${url}`);
  } finally {
    await browser.close();
  }
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
