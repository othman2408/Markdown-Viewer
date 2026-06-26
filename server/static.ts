import * as path from "path";
import { fileURLToPath } from "url";

import express, { type RequestHandler, type Response } from "express";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const CLIENT_DIST_DIR = path.join(ROOT_DIR, "dist", "client");

export function getClientRoot(): string {
  return CLIENT_DIST_DIR;
}

export function sendClientApp(res: Response): void {
  res.sendFile(path.join(getClientRoot(), "index.html"));
}

export function createClientStaticMiddleware(): RequestHandler {
  return express.static(getClientRoot(), {
    index: false,
    setHeaders(res: Response, filePath: string) {
      if (/\.(js|css)$/i.test(filePath) || /sw\.js$/i.test(filePath)) {
        res.setHeader("Cache-Control", "no-cache");
      } else if (/\.(png|jpg|jpeg|gif|ico|svg|woff2?)$/i.test(filePath)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      }
    }
  });
}
