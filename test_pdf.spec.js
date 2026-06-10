const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test('PDF Page Breaking Verification', async ({ page }) => {
  test.setTimeout(120000);
  // Handle page console logs
  page.on('console', msg => {
    console.log(`BROWSER LOG: ${msg.text()}`);
  });

  page.on('pageerror', err => {
    console.error(`BROWSER ERROR: ${err.message}`);
  });

  page.on('request', request => {
    console.log(`REQ: ${request.method()} ${request.url()}`);
  });
  page.on('requestfailed', request => {
    console.log(`REQ FAIL: ${request.url()} - ${request.failure()?.errorText}`);
  });
  page.on('response', response => {
    console.log(`RES: ${response.status()} ${response.url()}`);
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
  await page.waitForTimeout(4000);

  // Analyze preview element height and elements
  const analysis = await page.evaluate(() => {
    // Let's run a test query of elements
    const preview = document.getElementById('markdown-preview');
    const elements = [];
    preview.querySelectorAll('img, svg, pre, table, p, li, h1, h2, h3, h4, h5, h6, blockquote, hr, .math-block, mjx-container').forEach(el => {
      elements.push({
        tag: el.tagName,
        text: el.innerText ? el.innerText.substring(0, 30) : '',
        height: el.getBoundingClientRect().height,
        top: el.getBoundingClientRect().top
      });
    });
    return {
      scrollHeight: preview.scrollHeight,
      elementsCount: elements.length,
      elements: elements
    };
  });

  console.log("Preview scrollHeight:", analysis.scrollHeight);
  console.log("Found preview elements count:", analysis.elementsCount);
  console.log("First 10 elements:", analysis.elements.slice(0, 10));

  // Let's trigger PDF export and wait for the download
  console.log("Opening Export dropdown...");
  await page.click('#exportDropdown');
  console.log("Clicking PDF export button...");
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 60000 }),
    page.click('#export-pdf')
  ]);

  const downloadPath = path.join(__dirname, 'exported_document.pdf');
  await download.saveAs(downloadPath);
  console.log(`PDF saved successfully to ${downloadPath}`);
});
