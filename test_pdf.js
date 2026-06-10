const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log("Launching browser...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Handle page console logs
  page.on('console', msg => {
    console.log(`BROWSER LOG: ${msg.text()}`);
  });

  page.on('pageerror', err => {
    console.error(`BROWSER ERROR: ${err.message}`);
  });

  const indexPath = 'file:///' + path.resolve('c:/Users/User/Desktop/Markdown-Viewer/index.html').replace(/\\/g, '/');
  console.log(`Navigating to ${indexPath}...`);
  await page.goto(indexPath);

  // Wait for the editor to load
  await page.waitForSelector('#markdown-editor');

  // Load the test markdown document
  const mdContent = fs.readFileSync('C:/Users/User/.gemini/antigravity/scratch/document_166.md', 'utf8');
  console.log("Setting editor value...");
  
  // Set editor value and trigger change/input events
  await page.evaluate((content) => {
    const editor = document.getElementById('markdown-editor');
    editor.value = content;
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    editor.dispatchEvent(new Event('change', { bubbles: true }));
  }, mdContent);

  // Wait for rendering to complete (including MathJax and Mermaid)
  console.log("Waiting for MathJax/Mermaid rendering...");
  await page.waitForTimeout(4000);

  // Let's click the PDF export button and listen for the download
  console.log("Clicking PDF export button...");
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 30000 }),
    page.click('#export-pdf')
  ]);

  const downloadPath = path.join(__dirname, 'exported_document.pdf');
  await download.saveAs(downloadPath);
  console.log(`PDF saved to ${downloadPath}`);

  await browser.close();
})();
