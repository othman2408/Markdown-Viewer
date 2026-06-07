#!/usr/bin/env node

/**
 * Build a Windows-only embedded Neutralino executable.
 *
 * `neu build --embed-resources` embeds every platform binary it finds in bin/.
 * With this app's offline libraries, embedding all platforms can exhaust Node's
 * heap before the Windows binary is reached, leaving a stale Windows EXE in
 * dist/. Temporarily hiding non-Windows binaries makes the CLI embed only the
 * target users actually run on Windows.
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const APP_DIR = __dirname;
const BIN_DIR = path.join(APP_DIR, "bin");
const CONFIG_FILE = path.join(APP_DIR, "neutralino.config.json");
const WIN_BINARY = "neutralino-win_x64.exe";
const NEU_CLI = "@neutralinojs/neu@11.7.0";

function getArgValue(name) {
  const prefix = `${name}=`;
  for (let i = 2; i < process.argv.length; i += 1) {
    const arg = process.argv[i];
    if (arg === name) return process.argv[i + 1] || "";
    if (arg.startsWith(prefix)) return arg.slice(prefix.length);
  }
  return "";
}

function createConfigOverride(distributionPath) {
  if (!distributionPath) return CONFIG_FILE;

  const config = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
  config.cli = config.cli || {};
  config.cli.distributionPath = distributionPath.replace(/\\/g, "/");

  const tmpDir = path.join(APP_DIR, ".tmp");
  fs.mkdirSync(tmpDir, { recursive: true });

  const tempConfigFile = path.join(tmpDir, `neutralino.windows.${process.pid}.config.json`);
  fs.writeFileSync(tempConfigFile, `${JSON.stringify(config, null, 2)}\n`, "utf-8");
  return tempConfigFile;
}

function hideNonWindowsBinaries(tempDir) {
  const hidden = [];
  fs.mkdirSync(tempDir, { recursive: true });

  for (const entry of fs.readdirSync(BIN_DIR, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    if (!entry.name.startsWith("neutralino-")) continue;
    if (entry.name === WIN_BINARY) continue;

    const from = path.join(BIN_DIR, entry.name);
    const to = path.join(tempDir, entry.name);
    fs.renameSync(from, to);
    hidden.push({ from, to });
  }

  return hidden;
}

function restoreHiddenBinaries(hidden) {
  for (let i = hidden.length - 1; i >= 0; i -= 1) {
    const item = hidden[i];
    if (fs.existsSync(item.to)) {
      fs.renameSync(item.to, item.from);
    }
  }
}

function main() {
  const windowsBinaryPath = path.join(BIN_DIR, WIN_BINARY);
  if (!fs.existsSync(windowsBinaryPath)) {
    console.error(`Missing ${WIN_BINARY}. Run npm run setup before building.`);
    process.exit(1);
  }

  const distributionPath = getArgValue("--dist");
  const tempDir = path.join(BIN_DIR, `.nonwin-disabled-${process.pid}`);
  const configFile = createConfigOverride(distributionPath);
  const hidden = hideNonWindowsBinaries(tempDir);
  let exitCode = 0;

  try {
    const npx = "npx";
    const args = [
      "-y",
      NEU_CLI,
      "build",
      "--embed-resources",
      "--clean",
      "--config-file",
      configFile,
    ];

    const result = spawnSync(npx, args, {
      cwd: APP_DIR,
      stdio: "inherit",
      env: process.env,
      shell: process.platform === "win32",
    });

    if (result.error) {
      console.error(result.error.message);
      exitCode = 1;
    } else {
      exitCode = result.status || 0;
    }
  } finally {
    restoreHiddenBinaries(hidden);
    fs.rmSync(tempDir, { recursive: true, force: true });
    if (configFile !== CONFIG_FILE) {
      fs.rmSync(configFile, { force: true });
    }
  }

  process.exit(exitCode);
}

main();
