const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function runAudit() {
  console.log("Launching Chromium...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

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

  // Load the test markdown document
  const mdContent = fs.readFileSync('C:/Users/User/.gemini/antigravity/scratch/test_user_issues.md', 'utf8');
  console.log("Setting editor value...");
  
  await page.evaluate((content) => {
    const editor = document.getElementById('markdown-editor');
    editor.value = content;
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    editor.dispatchEvent(new Event('change', { bubbles: true }));
  }, mdContent);

  // Wait for rendering
  console.log("Waiting for editor preview rendering...");
  await page.waitForTimeout(4000);

  // Enable the audit hook in the browser
  console.log("Setting keepTempElementForAudit flag...");
  await page.evaluate(() => {
    window.keepTempElementForAudit = true;
  });

  console.log("Triggering PDF export...");
  await page.click('#exportDropdown');
  
  // Start the export and wait for the file saving download event
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 60000 }),
    page.click('#export-pdf')
  ]);

  console.log("Export complete. Auditing DOM layout bounds of window.auditedTempElement...");
  const auditResults = await page.evaluate(() => {
    const tempElement = window.auditedTempElement;
    if (!tempElement) {
      return { error: "window.auditedTempElement not found" };
    }

    const containerWidth = tempElement.offsetWidth;
    // A4 aspect ratio height: contentHeight / contentWidth = 267 / 180 = 1.4833
    // Wait, let's read the page boundaries used by the actual code!
    // Since page boundaries are stored during the run, wait, let's calculate them
    const pageHeightPx = containerWidth * (267 / 180);
    const containerHeight = tempElement.getBoundingClientRect().height;
    
    // Calculate page boundaries
    const pageBoundaries = [];
    let currentY = pageHeightPx;
    while (currentY < containerHeight) {
      pageBoundaries.push(currentY);
      currentY += pageHeightPx;
    }

    const containerRect = tempElement.getBoundingClientRect();
    
    // Find all target graphic elements and headings
    const elements = [];
    tempElement.querySelectorAll('img, svg, pre, table, p, li, h1, h2, h3, h4, h5, h6, blockquote, hr, .math-block, mjx-container[display="true"]').forEach(el => {
      const tag = el.tagName.toLowerCase();
      let type = '';
      if (tag === 'img') type = 'img';
      else if (tag === 'svg') {
        if (!el.closest('mjx-container, .math-block')) {
          type = 'svg';
        }
      }
      else if (tag === 'pre') type = 'pre';
      else if (tag === 'table') type = 'table';
      else if (tag === 'hr') type = 'hr';
      else if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) type = 'text';
      else if (tag === 'blockquote') {
        type = 'blockquote';
      }
      else if (tag === 'li') {
        const hasBlockChildren = el.querySelector('p, blockquote, pre, table, ul, ol') !== null;
        if (!hasBlockChildren) type = 'text';
      } else if (el.classList.contains('math-block') || tag === 'mjx-container') {
        type = 'math';
      }

      if (type) {
        const rect = el.getBoundingClientRect();
        const top = rect.top - containerRect.top;
        const height = rect.height;
        const bottom = top + height;

        // Check if it crosses any boundary
        let splitByIndex = -1;
        for (let i = 0; i < pageBoundaries.length; i++) {
          if (top < pageBoundaries[i] && bottom > pageBoundaries[i]) {
            splitByIndex = i;
            break;
          }
        }

        elements.push({
          tag: tag,
          className: el.className,
          id: el.id,
          type: type,
          top: top,
          height: height,
          bottom: bottom,
          splitPageIndex: splitByIndex,
          marginTop: el.style.marginTop || '',
          transform: el.style.transform || '',
          fontSize: el.style.fontSize || '',
          parentTag: el.parentElement ? el.parentElement.tagName.toLowerCase() : '',
          parentClass: el.parentElement ? el.parentElement.className : '',
          text: el.innerText ? el.innerText.substring(0, 40).replace(/\n/g, ' ') : ''
        });
      }
    });

    return {
      containerWidth: containerWidth,
      containerHeight: containerRect.height,
      pageHeightPx: pageHeightPx,
      pageBoundaries: pageBoundaries,
      elements: elements
    };
  });

  console.log("Saving audit results to C:/Users/User/.gemini/antigravity/scratch/audit_results.json");
  fs.writeFileSync('C:/Users/User/.gemini/antigravity/scratch/audit_results.json', JSON.stringify(auditResults, null, 2));

  console.log("Analyzing split elements...");
  if (auditResults.error) {
    console.error("ERROR during audit:", auditResults.error);
  } else {
    const splits = auditResults.elements.filter(el => el.splitPageIndex !== -1);
    if (splits.length > 0) {
      console.log(`WARNING: Found ${splits.length} split elements crossing page boundaries!`);
      splits.forEach(el => {
        console.log(`- Split Element: <${el.tag} class="${el.className}" id="${el.id}"> of type "${el.type}" crossing Page Boundary ${el.splitPageIndex + 1} (Y=${auditResults.pageBoundaries[el.splitPageIndex].toFixed(1)}px)`);
        console.log(`  Top: ${el.top.toFixed(1)}px, Height: ${el.height.toFixed(1)}px, Bottom: ${el.bottom.toFixed(1)}px`);
        console.log(`  Content: "${el.text}"`);
      });
    } else {
      console.log("SUCCESS: No elements are split across page boundaries!");
    }
  }

  // Cleanup downloaded file
  const downloadPath = path.join(__dirname, 'temp_exported.pdf');
  await download.saveAs(downloadPath);
  fs.unlinkSync(downloadPath);

  await browser.close();
}

runAudit().catch(err => {
  console.error("Audit script failed:", err);
});
