import connectPgSimple from "connect-pg-simple";
import type { RequestHandler } from "express";
import session from "express-session";

import { requiredEnv } from "./config";
import { getPool } from "./db";

declare module "express-session" {
  interface SessionData {
    csrfToken?: string;
    email?: string;
    userId?: string;
  }
}

export function createSessionMiddleware(): RequestHandler {
  const PgSession = connectPgSimple(session);
  return session({
    name: "mv.sid",
    secret: requiredEnv("SESSION_SECRET"),
    resave: false,
    saveUninitialized: false,
    store: new PgSession({
      pool: getPool(),
      tableName: "session"
    }),
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.COOKIE_SECURE === "true",
      maxAge: 1000 * 60 * 60 * 24 * 14
    }
  });
}
