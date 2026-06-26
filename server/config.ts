import * as crypto from "crypto";
import type { Express, Request } from "express";

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const MAX_ASSET_BYTES = 10 * 1024 * 1024;
export const SHARE_DB_MAX_BYTES = 128 * 1024;
export const VIEW_MODES = new Set(["editor", "split", "preview"]);

export function randomToken(bytes = 24): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function safeCompare(a: unknown, b: unknown): boolean {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export function publicBaseUrl(req: Request): string {
  const configured = (process.env.PUBLIC_BASE_URL || "").replace(/\/+$/, "");
  if (configured) return configured;
  return `${req.protocol}://${req.get("host")}`;
}

export function requireEnv(): void {
  const missing = [];
  for (const name of ["DATABASE_URL", "SESSION_SECRET", "ADMIN_EMAIL", "ADMIN_PASSWORD_HASH"]) {
    if (!process.env[name]) missing.push(name);
  }
  if (missing.length) {
    throw new Error(`Missing required environment variable(s): ${missing.join(", ")}`);
  }
}

export function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function configureTrustProxy(app: Express): void {
  const value = process.env.TRUST_PROXY;
  if (!value) return;
  if (/^\d+$/.test(value)) {
    app.set("trust proxy", Number(value));
  } else {
    app.set("trust proxy", value);
  }
}
