import * as bcrypt from "bcryptjs";
import express, { type NextFunction, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";

import { randomToken, requiredEnv, safeCompare } from "./config";
import { getPool } from "./db";
import type { HttpError } from "./types";

export function sanitizeReturnTo(value: unknown): string {
  if (!value || typeof value !== "string") return "/";
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/";
  if (value.startsWith("/api/") || value.startsWith("/login")) return "/";
  return value;
}

export function ensureCsrfToken(req: Request): string {
  if (!req.session.csrfToken) {
    req.session.csrfToken = randomToken(18);
  }
  return req.session.csrfToken;
}

export function getSessionUserId(req: Request): string {
  if (!req.session.userId) {
    const error = new Error("Authentication required") as HttpError;
    error.status = 401;
    throw error;
  }
  return req.session.userId;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.session && req.session.userId) return next();
  const isApiRequest = req.originalUrl.startsWith("/api/") || req.baseUrl === "/api";
  if (isApiRequest) {
    res.status(401).json({ error: "auth_required" });
    return;
  }
  const returnTo = encodeURIComponent(req.originalUrl || "/");
  res.redirect(`/login?returnTo=${returnTo}`);
}

export function requireCsrf(req: Request, res: Response, next: NextFunction): void {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();

  const origin = req.get("origin");
  if (origin) {
    try {
      const expected = `${req.protocol}://${req.get("host")}`;
      if (new URL(origin).origin !== expected) {
        res.status(403).json({ error: "bad_origin" });
        return;
      }
    } catch (_) {
      res.status(403).json({ error: "bad_origin" });
      return;
    }
  }

  const token = req.get("x-csrf-token");
  if (!token || !req.session.csrfToken || !safeCompare(token, req.session.csrfToken)) {
    res.status(403).json({ error: "bad_csrf" });
    return;
  }
  next();
}

async function ensureUser(email: string): Promise<string> {
  const normalizedEmail = email.toLowerCase();
  const existing = await getPool().query("SELECT id FROM users WHERE email = $1", [normalizedEmail]);
  if (existing.rowCount) return existing.rows[0].id;
  const id = randomToken(18);
  await getPool().query("INSERT INTO users (id, email) VALUES ($1, $2)", [id, normalizedEmail]);
  return id;
}

export function createAuthRouter(options: {
  sendClientApp: (res: Response) => void;
}) {
  const router = express.Router();
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false
  });

  router.get("/login", (req, res) => {
    if (req.session.userId) return res.redirect(sanitizeReturnTo(req.query.returnTo));
    options.sendClientApp(res);
  });

  router.post("/api/login", loginLimiter, async (req, res, next) => {
    try {
      const email = String(req.body.email || "").trim().toLowerCase();
      const password = String(req.body.password || "");
      const returnTo = sanitizeReturnTo(req.body.returnTo);
      const wantsHtml = req.is("application/x-www-form-urlencoded") && req.accepts("html");
      const okEmail = email === String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
      const okPassword = okEmail && await bcrypt.compare(password, requiredEnv("ADMIN_PASSWORD_HASH"));
      if (!okPassword) {
        if (wantsHtml) return res.redirect(`/login?error=1&returnTo=${encodeURIComponent(returnTo)}`);
        return res.status(401).json({ error: "invalid_credentials" });
      }
      const userId = await ensureUser(email);
      req.session.regenerate((error) => {
        if (error) return next(error);
        req.session.userId = userId;
        req.session.email = email;
        ensureCsrfToken(req);
        if (wantsHtml) return res.redirect(returnTo);
        res.json({ ok: true, csrfToken: req.session.csrfToken });
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/api/logout", requireAuth, requireCsrf, (req, res, next) => {
    req.session.destroy((error) => {
      if (error) return next(error);
      res.clearCookie("mv.sid");
      res.json({ ok: true });
    });
  });

  router.get("/api/session", (req, res) => {
    if (!req.session.userId) return res.json({ authenticated: false });
    res.json({
      authenticated: true,
      csrfToken: ensureCsrfToken(req),
      email: req.session.email
    });
  });

  return router;
}
