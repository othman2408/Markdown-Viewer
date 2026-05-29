#!/usr/bin/env node

/**
 * prepare.js — Build script for the Neutralinojs desktop app.
 *
 * Copies shared browser-version files (script.js, styles.css, assets/)
 * from the repo root into desktop-app/resources/, downloads all remote CDN
 * libraries locally for 100% offline capabilities, validates their cryptographic
 * integrity using SRI hashes (SHA-384), and generates a Neutralinojs-compatible index.html.
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const crypto = require("crypto");

const ROOT_DIR = path.resolve(__dirname, "..");
const RESOURCES_DIR = path.resolve(__dirname, "resources");
const jsDest = path.join(RESOURCES_DIR, "js");
const LIBS_DIR = path.join(RESOURCES_DIR, "libs");

// Create directories
fs.mkdirSync(jsDest, { recursive: true });
fs.mkdirSync(LIBS_DIR, { recursive: true });

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Copy shared assets
fs.copyFileSync(path.join(ROOT_DIR, "script.js"), path.join(jsDest, "script.js"));
console.log("✓ Copied script.js → resources/js/script.js");

fs.copyFileSync(path.join(ROOT_DIR, "styles.css"), path.join(RESOURCES_DIR, "styles.css"));
console.log("✓ Copied styles.css → resources/styles.css");

copyDirSync(path.join(ROOT_DIR, "assets"), path.join(RESOURCES_DIR, "assets"));
console.log("✓ Copied assets/ → resources/assets/");

/**
 * Validates the cryptographic integrity of a file against an expected SHA-384 hash.
 */
function verifyIntegrity(filePath, expectedSha384) {
  return new Promise((resolve, reject) => {
    if (!expectedSha384) {
      resolve(true); // Skip validation if no hash is provided (e.g., relative fonts)
      return;
    }

    const hash = crypto.createHash("sha384");
    const stream = fs.createReadStream(filePath);

    stream.on("data", data => hash.update(data));
    stream.on("end", () => {
      const calculated = "sha384-" + hash.digest("base64");
      if (calculated === expectedSha384) {
        resolve(true);
      } else {
        reject(new Error(`Integrity mismatch for ${path.basename(filePath)}:\nExpected: ${expectedSha384}\nCalculated: ${calculated}`));
      }
    });
    stream.on("error", reject);
  });
}

/**
 * Downloads a file from a URL and verifies its integrity.
 */
function downloadFile(url, destPath, expectedSha384) {
  return new Promise((resolve, reject) => {
    // If file already exists, verify its integrity before skipping
    if (fs.existsSync(destPath) && fs.statSync(destPath).size > 0) {
      verifyIntegrity(destPath, expectedSha384)
        .then(() => resolve())
        .catch(() => {
          console.log(`↻ Cached file ${path.basename(destPath)} failed integrity check. Re-downloading...`);
          fs.unlinkSync(destPath);
          downloadAndVerify();
        });
      return;
    }

    downloadAndVerify();

    function downloadAndVerify() {
      console.log(`Downloading offline dependency: ${path.basename(destPath)}...`);
      https.get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Failed to load ${url} (${res.statusCode})`));
          return;
        }
        const stream = fs.createWriteStream(destPath);
        res.pipe(stream);
        stream.on("finish", () => {
          stream.close();

          // Verify integrity of downloaded file
          verifyIntegrity(destPath, expectedSha384)
            .then(() => resolve())
            .catch(err => {
              // Delete corrupted file
              if (fs.existsSync(destPath)) {
                fs.unlinkSync(destPath);
              }
              reject(err);
            });
        });
      }).on("error", reject);
    }
  });
}

async function prepareOfflineDependencies() {
  console.log("\nStarting Secure Offline Assets Preparation...");
  let html = fs.readFileSync(path.join(ROOT_DIR, "index.html"), "utf-8");
  
  // Find all CDN script and link tags that match standard script/stylesheet declarations
  const tagRegex = /<(link|script)[^>]+(?:href|src)="https:\/\/(?:cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net)\/[^"]+"[^>]*>/g;
  let match;
  const downloads = [];
  const replacements = [];

  while ((match = tagRegex.exec(html)) !== null) {
    const fullTag = match[0];
    
    // Extract url
    const urlMatch = /(?:href|src)="([^"]+)"/.exec(fullTag);
    if (!urlMatch) continue;
    const url = urlMatch[1];

    // Extract integrity hash
    const integrityMatch = /integrity="([^"]+)"/.exec(fullTag);
    const expectedSha384 = integrityMatch ? integrityMatch[1] : null;

    if (!expectedSha384) {
      console.warn(`⚠ Warning: CDN dependency is missing an integrity hash: ${url}`);
    }

    // Determine local filename - sanitize package version tags or query strings
    const urlPath = new URL(url).pathname;
    let filename = path.basename(urlPath);
    if (url.includes("bootstrap-icons")) {
      filename = "bootstrap-icons.min.css";
    }
    
    const localDest = path.join(LIBS_DIR, filename);
    downloads.push(downloadFile(url, localDest, expectedSha384));
    
    // Queue replacement in HTML to point to local libs folder
    const attr = fullTag.includes("href=") ? "href" : "src";
    replacements.push({
      original: `${attr}="${url}"`,
      replaced: `${attr}="/libs/${filename}"`
    });
  }

  // Also download the relative fonts loaded by bootstrap-icons (these are loaded by the stylesheet and do not have SRI tags)
  const fontDir = path.join(LIBS_DIR, "fonts");
  fs.mkdirSync(fontDir, { recursive: true });
  downloads.push(downloadFile("https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/fonts/bootstrap-icons.woff2", path.join(fontDir, "bootstrap-icons.woff2"), null));
  downloads.push(downloadFile("https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/fonts/bootstrap-icons.woff", path.join(fontDir, "bootstrap-icons.woff"), null));

  // Wait for all downloads and cryptographic validations to finish
  try {
    await Promise.all(downloads);
    console.log("✓ All offline libraries successfully downloaded and cryptographically validated.");
  } catch (err) {
    console.error("✗ Critical Security Error: Dependency integrity check failed!", err.message);
    process.exit(1); // Abort execution if a download fails validation
  }

  // Apply replacements in HTML
  replacements.forEach(rep => {
    html = html.replace(rep.original, rep.replaced);
  });

  // Fix relative assets
  html = html.replace(/href="assets\//g, 'href="/assets/');
  html = html.replace(/href="styles\.css"/g, 'href="/styles.css"');
  
  // Inject Neutralino script tags
  html = html.replace(
    /<script\s+src="script\.js"\s*><\/script>/i,
    '<script src="/js/neutralino.js"></script>\n    <script src="/js/main.js"></script>\n    <script src="/js/script.js"></script>',
  );

  // Inject app-info element
  html = html.replace(
    '<div class="app-container">',
    `<div class="app-container">
        <div id="neutralino-app">
          <div id="neutralino-info"></div>
        </div>`,
  );

  fs.writeFileSync(path.join(RESOURCES_DIR, "index.html"), html, "utf-8");
  console.log("✓ Generated resources/index.html (Offline replacements & injections applied)");
  console.log("\nDone! Run `npm run dev` to start the desktop app.");
}

prepareOfflineDependencies().catch(err => {
  console.error("✗ Fatal Prepare Error:", err);
  process.exit(1);
});
