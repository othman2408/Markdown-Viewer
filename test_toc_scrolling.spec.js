const { test, expect } = require('@playwright/test');
const path = require('path');

test('TOC Anchor Link Smooth Scrolling', async ({ page }) => {
  test.setTimeout(60000);
  
  // Handle console logs from the page
  page.on('console', msg => {
    console.log(`BROWSER LOG: ${msg.text()}`);
  });

  page.on('pageerror', err => {
    console.error(`BROWSER ERROR: ${err.message}`);
  });

  const indexPath = 'file:///' + path.resolve('index.html').replace(/\\/g, '/');
  console.log(`Navigating to ${indexPath}...`);
  await page.goto(indexPath);

  // Wait for the editor to load
  await page.waitForSelector('#markdown-editor');

  // Load a long markdown document with a TOC and headings
  const tocMarkdown = `
# Table of Contents
- [Section 1](#section-1)
- [Section 2](#section-2)
- [Section 3](#section-3)

# Section 1
Paragraph content to take up vertical space 1.
Paragraph content to take up vertical space 2.
Paragraph content to take up vertical space 3.
Paragraph content to take up vertical space 4.
Paragraph content to take up vertical space 5.
Paragraph content to take up vertical space 6.
Paragraph content to take up vertical space 7.
Paragraph content to take up vertical space 8.
Paragraph content to take up vertical space 9.
Paragraph content to take up vertical space 10.
Paragraph content to take up vertical space 11.
Paragraph content to take up vertical space 12.
Paragraph content to take up vertical space 13.
Paragraph content to take up vertical space 14.
Paragraph content to take up vertical space 15.
Paragraph content to take up vertical space 16.
Paragraph content to take up vertical space 17.
Paragraph content to take up vertical space 18.
Paragraph content to take up vertical space 19.
Paragraph content to take up vertical space 20.
Paragraph content to take up vertical space 21.
Paragraph content to take up vertical space 22.
Paragraph content to take up vertical space 23.
Paragraph content to take up vertical space 24.
Paragraph content to take up vertical space 25.
Paragraph content to take up vertical space 26.
Paragraph content to take up vertical space 27.
Paragraph content to take up vertical space 28.
Paragraph content to take up vertical space 29.
Paragraph content to take up vertical space 30.

# Section 2
This is Section 2 content.
Paragraph content to take up vertical space 1.
Paragraph content to take up vertical space 2.
Paragraph content to take up vertical space 3.
Paragraph content to take up vertical space 4.
Paragraph content to take up vertical space 5.
Paragraph content to take up vertical space 6.
Paragraph content to take up vertical space 7.
Paragraph content to take up vertical space 8.
Paragraph content to take up vertical space 9.
Paragraph content to take up vertical space 10.
Paragraph content to take up vertical space 11.
Paragraph content to take up vertical space 12.
Paragraph content to take up vertical space 13.
Paragraph content to take up vertical space 14.
Paragraph content to take up vertical space 15.
Paragraph content to take up vertical space 16.
Paragraph content to take up vertical space 17.
Paragraph content to take up vertical space 18.
Paragraph content to take up vertical space 19.
Paragraph content to take up vertical space 20.
Paragraph content to take up vertical space 21.
Paragraph content to take up vertical space 22.
Paragraph content to take up vertical space 23.
Paragraph content to take up vertical space 24.
Paragraph content to take up vertical space 25.
Paragraph content to take up vertical space 26.
Paragraph content to take up vertical space 27.
Paragraph content to take up vertical space 28.
Paragraph content to take up vertical space 29.
Paragraph content to take up vertical space 30.

# Section 3
This is Section 3 content.
`;

  console.log("Setting editor value...");
  await page.evaluate((content) => {
    const editor = document.getElementById('markdown-editor');
    editor.value = content;
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    editor.dispatchEvent(new Event('change', { bubbles: true }));
  }, tocMarkdown);

  // Wait for rendering to complete
  await page.waitForTimeout(4000);

  // Check if headings have generated IDs
  const headings = await page.evaluate(() => {
    const preview = document.getElementById('markdown-preview');
    return Array.from(preview.querySelectorAll('h1, h2, h3')).map(h => ({
      text: h.textContent.trim(),
      id: h.id
    }));
  });
  console.log("Generated Headings:", headings);

  // Confirm target heading has an ID
  const section2Heading = headings.find(h => h.text === 'Section 2');
  expect(section2Heading).toBeDefined();
  expect(section2Heading.id).toBe('section-2');

  const scrollContainerSelector = '.preview-pane';
  const editorSelector = '#markdown-editor';

  // Get initial scroll position
  const initialScrollTop = await page.evaluate((selector) => {
    const container = document.querySelector(selector);
    return container ? container.scrollTop : null;
  }, scrollContainerSelector);
  expect(initialScrollTop).toBe(0);

  const initialEditorScrollTop = await page.evaluate((selector) => {
    const el = document.querySelector(selector);
    return el ? el.scrollTop : null;
  }, editorSelector);
  expect(initialEditorScrollTop).toBe(0);

  // Click on the Section 2 link in the TOC
  console.log("Clicking the Section 2 link...");
  await page.click('a[href="#section-2"]');

  // Wait for scroll transition
  await page.waitForTimeout(2000);

  // Check URL hash (should remain empty)
  const currentHash = await page.evaluate(() => window.location.hash);
  expect(currentHash).toBe('');

  // Verify the container has scrolled
  const afterClickScrollTop = await page.evaluate((selector) => {
    const container = document.querySelector(selector);
    return container ? container.scrollTop : null;
  }, scrollContainerSelector);
  
  console.log(`Scroll position after click: ${afterClickScrollTop}`);
  expect(afterClickScrollTop).toBeGreaterThan(0);

  // Verify the editor has scrolled as well
  const afterClickEditorScrollTop = await page.evaluate((selector) => {
    const el = document.querySelector(selector);
    return el ? el.scrollTop : null;
  }, editorSelector);

  console.log(`Editor scroll position after click: ${afterClickEditorScrollTop}`);
  expect(afterClickEditorScrollTop).toBeGreaterThan(0);
});
