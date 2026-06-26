import type { RequestHandler } from "express";
import session, { type SessionData } from "express-session";

import { requiredEnv } from "./config";
import { getDb } from "./db";

declare module "express-session" {
  interface SessionData {
    csrfToken?: string;
    email?: string;
    userId?: string;
  }
}

const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 14;
const SESSION_PRUNE_INTERVAL_MS = 1000 * 60 * 60;

type SessionCallback = (error?: unknown) => void;
type SessionGetCallback = (error?: unknown, session?: SessionData | null) => void;

interface SessionRow {
  sess: SessionData | string | null;
}

class BunSqlSessionStore extends session.Store {
  private lastPruneAt = 0;

  get(sid: string, callback: SessionGetCallback): void {
    void this.getSession(sid).then(
      (storedSession) => callback(undefined, storedSession),
      (error) => callback(error)
    );
  }

  set(sid: string, storedSession: SessionData, callback?: SessionCallback): void {
    void this.setSession(sid, storedSession).then(
      () => callback?.(),
      (error) => callback?.(error)
    );
  }

  destroy(sid: string, callback?: SessionCallback): void {
    void this.destroySession(sid).then(
      () => callback?.(),
      (error) => callback?.(error)
    );
  }

  touch(sid: string, storedSession: SessionData, callback?: SessionCallback): void {
    void this.touchSession(sid, storedSession).then(
      () => callback?.(),
      (error) => callback?.(error)
    );
  }

  private async getSession(sid: string): Promise<SessionData | null> {
    const rows = await getDb()<SessionRow>`
      SELECT sess
      FROM session
      WHERE sid = ${sid} AND expire > now()
    `;
    const sess = rows[0]?.sess;
    if (!sess) return null;
    return typeof sess === "string" ? JSON.parse(sess) as SessionData : sess;
  }

  private async setSession(sid: string, storedSession: SessionData): Promise<void> {
    await getDb()`
      INSERT INTO session (sid, sess, expire)
      VALUES (${sid}, ${JSON.stringify(storedSession)}::json, ${this.getExpiration(storedSession)})
      ON CONFLICT (sid) DO UPDATE SET
        sess = EXCLUDED.sess,
        expire = EXCLUDED.expire
    `;
    await this.pruneExpiredSessions();
  }

  private async destroySession(sid: string): Promise<void> {
    await getDb()`DELETE FROM session WHERE sid = ${sid}`;
  }

  private async touchSession(sid: string, storedSession: SessionData): Promise<void> {
    await getDb()`
      UPDATE session
      SET expire = ${this.getExpiration(storedSession)}
      WHERE sid = ${sid}
    `;
  }

  private getExpiration(storedSession: SessionData): Date {
    const expires = storedSession.cookie?.expires;
    if (expires) return new Date(expires);
    return new Date(Date.now() + SESSION_MAX_AGE_MS);
  }

  private async pruneExpiredSessions(): Promise<void> {
    const now = Date.now();
    if (now - this.lastPruneAt < SESSION_PRUNE_INTERVAL_MS) return;
    this.lastPruneAt = now;
    await getDb()`DELETE FROM session WHERE expire <= now()`;
  }
}

export function createSessionMiddleware(): RequestHandler {
  return session({
    name: "mv.sid",
    secret: requiredEnv("SESSION_SECRET"),
    resave: false,
    saveUninitialized: false,
    store: new BunSqlSessionStore(),
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.COOKIE_SECURE === "true",
      maxAge: SESSION_MAX_AGE_MS
    }
  });
}
