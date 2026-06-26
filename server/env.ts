import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

import { config as loadEnv, parse as parseEnv } from "dotenv";

export function loadAppEnv(): void {
  loadEnv();

  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;

  const parsed = parseEnv(readFileSync(envPath));
  for (const [key, value] of Object.entries(parsed)) {
    if (!process.env[key] && value) {
      process.env[key] = value;
    }
  }
}
