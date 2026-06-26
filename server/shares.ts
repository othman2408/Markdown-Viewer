import express, { type Response } from "express";

import { MAX_DOCUMENT_BYTES, SHARE_DB_MAX_BYTES, publicBaseUrl, randomToken } from "./config";
import { getSessionUserId } from "./auth";
import { pipeAsset } from "./assets";
import { getPool } from "./db";
import { ensureBucket, getObject, isR2Configured, putObject, streamToString } from "./r2";
import type { AssetRow, ShareRow } from "./types";

function extractAssetIds(markdown: string): string[] {
  const ids = new Set<string>();
  const regex = /\/api\/assets\/([A-Za-z0-9_-]+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(markdown))) {
    ids.add(match[1]);
  }
  return Array.from(ids);
}

export function createPublicShareRouter(options: {
  sendClientApp: (res: Response) => void;
}) {
  const router = express.Router();

  router.get("/api/shares/:token", async (req, res, next) => {
    try {
      const result = await getPool().query<ShareRow>(
        "SELECT token, title, mode, content, content_object_key FROM shares WHERE token = $1",
        [req.params.token]
      );
      if (!result.rowCount) return res.status(404).json({ error: "not_found" });
      const share = result.rows[0];
      let content = share.content || "";
      if (!content && share.content_object_key) {
        const object = await getObject(share.content_object_key);
        if (!object.Body) return res.status(404).json({ error: "not_found" });
        content = await streamToString(object.Body as AsyncIterable<Buffer | Uint8Array | string>);
      }
      res.json({
        token: share.token,
        title: share.title,
        mode: share.mode,
        content
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/api/shared-assets/:token/:assetId", async (req, res, next) => {
    try {
      const shareResult = await getPool().query<Pick<ShareRow, "asset_ids">>(
        "SELECT asset_ids FROM shares WHERE token = $1",
        [req.params.token]
      );
      if (!shareResult.rowCount) return res.status(404).end();
      const assetIds = Array.isArray(shareResult.rows[0].asset_ids) ? shareResult.rows[0].asset_ids : [];
      if (!assetIds.includes(req.params.assetId)) return res.status(404).end();
      const assetResult = await getPool().query<AssetRow>(
        "SELECT object_key, content_type FROM assets WHERE id = $1",
        [req.params.assetId]
      );
      if (!assetResult.rowCount) return res.status(404).end();
      await pipeAsset(res, assetResult.rows[0]);
    } catch (error) {
      next(error);
    }
  });

  router.get("/share/:token", (_req, res) => {
    options.sendClientApp(res);
  });

  return router;
}

export function createSharesRouter() {
  const router = express.Router();

  router.post("/shares", async (req, res, next) => {
    try {
      const content = String(req.body.content || "");
      if (Buffer.byteLength(content, "utf8") > MAX_DOCUMENT_BYTES) {
        return res.status(413).json({ error: "document_too_large" });
      }
      const title = String(req.body.title || "Shared document").trim().slice(0, 255) || "Shared document";
      const mode = req.body.mode === "edit" ? "edit" : "view";
      const token = randomToken(20);
      const assetIds = extractAssetIds(content);
      const rewrittenContent = content.replace(/\/api\/assets\/([A-Za-z0-9_-]+)/g, `/api/shared-assets/${token}/$1`);
      const userId = getSessionUserId(req);
      let dbContent: string | null = rewrittenContent;
      let objectKey: string | null = null;
      if (Buffer.byteLength(rewrittenContent, "utf8") > SHARE_DB_MAX_BYTES && isR2Configured()) {
        await ensureBucket();
        objectKey = `${userId}/shares/${token}.md`;
        await putObject(objectKey, Buffer.from(rewrittenContent, "utf8"), "text/markdown;charset=utf-8");
        dbContent = null;
      }
      await getPool().query(
        `INSERT INTO shares (token, user_id, title, mode, content, content_object_key, asset_ids)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
        [token, userId, title, mode, dbContent, objectKey, JSON.stringify(assetIds)]
      );
      res.json({
        token,
        url: `${publicBaseUrl(req)}/share/${token}${mode === "edit" ? "?edit=1" : ""}`
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
