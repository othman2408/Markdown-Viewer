import express, { type Express, type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";

import { configureTrustProxy, requireEnv } from "./config";
import { createAssetsRouter } from "./assets";
import { createAuthRouter, requireAuth, requireCsrf, sanitizeReturnTo } from "./auth";
import { createClientStaticMiddleware, sendClientApp } from "./static";
import { createHealthRouter } from "./health";
import { createFilesRouter } from "./files";
import { createPublicShareRouter, createSharesRouter } from "./shares";
import { createSessionMiddleware } from "./session";
import { createWorkspaceRouter, normalizeWorkspaceBody } from "./workspace";
import type { HttpError } from "./types";

function createApp(): Express {
  requireEnv();
  const app = express();
  configureTrustProxy(app);
  app.disable("x-powered-by");

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "'unsafe-inline'"],
        styleSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "'unsafe-inline'"],
        imgSrc: ["'self'", "https:", "data:", "blob:"],
        fontSrc: ["'self'", "https://cdn.jsdelivr.net"],
        connectSrc: ["'self'", "https://api.github.com", "https://raw.githubusercontent.com", "https://cdnjs.cloudflare.com", "https://paulrosen.github.io"],
        mediaSrc: ["'self'", "https://paulrosen.github.io"],
        workerSrc: ["'self'", "blob:"],
        objectSrc: ["'none'"],
        frameAncestors: ["'self'"]
      }
    },
    crossOriginEmbedderPolicy: false
  }));

  app.use(express.urlencoded({ extended: false, limit: "32kb" }));
  app.use(express.json({ limit: "12mb" }));
  app.use(createSessionMiddleware());

  const serveClientStatic = createClientStaticMiddleware();
  app.use((req, res, next) => {
    if (
      req.path === "/" ||
      req.path === "/index.html" ||
      req.path.startsWith("/api/") ||
      req.path === "/login" ||
      req.path.startsWith("/share/")
    ) {
      return next();
    }
    return serveClientStatic(req, res, next);
  });

  app.use(createHealthRouter());
  app.use(createAuthRouter({ sendClientApp }));
  app.use(createPublicShareRouter({ sendClientApp }));

  app.use("/api", requireAuth, requireCsrf);
  app.use("/api", createWorkspaceRouter());
  app.use("/api", createFilesRouter());
  app.use("/api", createAssetsRouter());
  app.use("/api", createSharesRouter());

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "not_found" });
  });

  app.get("/", requireAuth, (_req, res) => {
    sendClientApp(res);
  });

  app.get("*", requireAuth, (_req, res) => {
    sendClientApp(res);
  });

  app.use((error: HttpError, _req: Request, res: Response, _next: NextFunction) => {
    const status = error.status || error.statusCode || 500;
    if (process.env.NODE_ENV !== "test") {
      console.error(error);
    }
    res.status(status >= 400 && status < 600 ? status : 500).json({
      error: status === 500 ? "server_error" : (error.message || "request_failed")
    });
  });

  return app;
}

export {
  createApp,
  normalizeWorkspaceBody,
  sanitizeReturnTo
};
