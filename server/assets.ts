import * as path from "path";

import express, { type Response } from "express";
import multer from "multer";

import { MAX_ASSET_BYTES } from "./config";
import { getSessionUserId } from "./auth";
import { getDb } from "./db";
import { ensureBucket, getObject, isR2Configured, putObject } from "./r2";
import { randomToken } from "./config";
import type { AssetRow } from "./types";

function isPipeableBody(body: unknown): body is { pipe(destination: NodeJS.WritableStream): unknown } {
  return Boolean(body && typeof (body as { pipe?: unknown }).pipe === "function");
}

function isTransformableBody(body: unknown): body is { transformToByteArray(): Promise<Uint8Array> } {
  return Boolean(body && typeof (body as { transformToByteArray?: unknown }).transformToByteArray === "function");
}

export async function pipeAsset(res: Response, asset: AssetRow): Promise<void> {
  const object = await getObject(asset.object_key);
  res.setHeader("Content-Type", asset.content_type || "application/octet-stream");
  res.setHeader("Cache-Control", "private, max-age=3600");
  if (isPipeableBody(object.Body)) {
    object.Body.pipe(res);
  } else if (isTransformableBody(object.Body)) {
    res.end(Buffer.from(await object.Body.transformToByteArray()));
  } else {
    res.status(404).end();
  }
}

export function createAssetsRouter() {
  const router = express.Router();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_ASSET_BYTES, files: 1 }
  });

  router.post("/assets", upload.single("file"), async (req, res, next) => {
    try {
      if (!isR2Configured()) return res.status(503).json({ error: "r2_not_configured" });
      if (!req.file) return res.status(400).json({ error: "file_required" });
      if (!String(req.file.mimetype || "").startsWith("image/")) {
        return res.status(415).json({ error: "unsupported_media_type" });
      }
      await ensureBucket();
      const id = randomToken(18);
      const safeName = path.basename(req.file.originalname || "image").replace(/[^\w.-]+/g, "_").slice(0, 120) || "image";
      const userId = getSessionUserId(req);
      const objectKey = `${userId}/assets/${id}-${safeName}`;
      await putObject(objectKey, req.file.buffer, req.file.mimetype);
      await getDb()`
        INSERT INTO assets (id, user_id, object_key, filename, content_type, byte_size)
        VALUES (${id}, ${userId}, ${objectKey}, ${safeName}, ${req.file.mimetype}, ${req.file.size})
      `;
      res.json({ id, url: `/api/assets/${id}` });
    } catch (error) {
      next(error);
    }
  });

  router.get("/assets/:id", async (req, res, next) => {
    try {
      const rows = await getDb()<AssetRow>`
        SELECT object_key, content_type
        FROM assets
        WHERE user_id = ${getSessionUserId(req)} AND id = ${req.params.id}
      `;
      if (!rows.length) return res.status(404).end();
      await pipeAsset(res, rows[0]);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
