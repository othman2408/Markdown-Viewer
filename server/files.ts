import express from "express";

import { randomToken } from "./config";
import { getSessionUserId } from "./auth";
import { getDb, withTransaction } from "./db";
import { createDocumentVersionIfChanged } from "./documentHistory";
import type {
  DocumentVersionRow,
  FileDetailRow,
  FileSummaryRow,
  HttpError,
  ViewMode
} from "./types";

interface VersionContentRow {
  content: string | null;
  title: string;
}

function normalizeLimit(value: unknown): number {
  const limit = Number(value);
  if (!Number.isFinite(limit)) return 50;
  return Math.min(100, Math.max(1, Math.floor(limit)));
}

function escapeLikeTerm(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

function toIsoDate(value: string | Date): string {
  return new Date(value).toISOString();
}

function toClientTimestamp(value: string | number | null | undefined, fallback: string | Date): number {
  if (Number.isFinite(Number(value))) return Number(value);
  return new Date(fallback).getTime();
}

function toViewMode(value: ViewMode | null | undefined): ViewMode {
  return value === "editor" || value === "preview" || value === "split" ? value : "split";
}

function toFileSummary(row: FileSummaryRow) {
  return {
    id: row.id,
    title: row.title,
    contentLength: Number(row.content_length || 0),
    contentPreview: row.content_preview || "",
    createdAt: toIsoDate(row.created_at),
    updatedAt: toIsoDate(row.updated_at),
    versionCount: Number(row.version_count || 0)
  };
}

function toFileDetail(row: FileDetailRow) {
  return {
    id: row.id,
    title: row.title,
    content: row.content || "",
    scrollPos: Number(row.scroll_pos || 0),
    viewMode: toViewMode(row.view_mode),
    createdAt: toClientTimestamp(row.client_created_at, row.created_at),
    updatedAt: toIsoDate(row.updated_at),
    contentLength: Number(row.content_length || 0)
  };
}

function toDocumentVersion(row: DocumentVersionRow) {
  return {
    id: row.id,
    documentId: row.document_id,
    title: row.title,
    contentHash: row.content_hash,
    contentLength: Number(row.content_length || 0),
    contentPreview: row.content_preview || "",
    source: row.source,
    createdAt: toIsoDate(row.created_at)
  };
}

function toDocumentVersionDetail(row: DocumentVersionRow) {
  return {
    ...toDocumentVersion(row),
    content: row.content || ""
  };
}

async function getFileDetail(userId: string, documentId: string) {
  const rows = await getDb()<FileDetailRow>`
    SELECT
      id,
      title,
      content,
      scroll_pos,
      view_mode,
      client_created_at,
      created_at,
      updated_at,
      length(content) AS content_length
    FROM documents
    WHERE user_id = ${userId} AND id = ${documentId} AND deleted_at IS NULL
  `;
  return rows[0] ? toFileDetail(rows[0]) : null;
}

async function getVersionContent(userId: string, documentId: string, versionId: string): Promise<VersionContentRow | null> {
  const rows = await getDb()<VersionContentRow>`
    SELECT v.title, v.content
    FROM document_versions v
    INNER JOIN documents d ON d.id = v.document_id AND d.user_id = v.user_id
    WHERE v.user_id = ${userId}
      AND v.document_id = ${documentId}
      AND v.id = ${versionId}
      AND d.deleted_at IS NULL
  `;
  return rows[0] || null;
}

async function getVersionDetail(userId: string, documentId: string, versionId: string) {
  const rows = await getDb()<DocumentVersionRow>`
    SELECT
      v.id,
      v.document_id,
      v.title,
      v.content,
      v.content_hash,
      left(v.content, 240) AS content_preview,
      length(v.content) AS content_length,
      v.source,
      v.created_at
    FROM document_versions v
    INNER JOIN documents d ON d.id = v.document_id AND d.user_id = v.user_id
    WHERE v.user_id = ${userId}
      AND v.document_id = ${documentId}
      AND v.id = ${versionId}
      AND d.deleted_at IS NULL
  `;
  return rows[0] ? toDocumentVersionDetail(rows[0]) : null;
}

function missingFileError(): HttpError {
  const error = new Error("not_found") as HttpError;
  error.status = 404;
  return error;
}

export function createFilesRouter() {
  const router = express.Router();

  router.get("/files", async (req, res, next) => {
    try {
      const userId = getSessionUserId(req);
      const query = String(req.query.query || "").trim();
      const limit = normalizeLimit(req.query.limit);
      const pattern = `%${escapeLikeTerm(query)}%`;
      const escapeCharacter = "\\";
      const rows = query
        ? await getDb()<FileSummaryRow>`
          SELECT
            d.id,
            d.title,
            left(d.content, 240) AS content_preview,
            length(d.content) AS content_length,
            d.created_at,
            d.updated_at,
            (
              SELECT count(*)
              FROM document_versions v
              WHERE v.user_id = d.user_id AND v.document_id = d.id
            ) AS version_count
          FROM documents d
          WHERE d.user_id = ${userId}
            AND d.deleted_at IS NULL
            AND (d.title ILIKE ${pattern} ESCAPE ${escapeCharacter} OR d.content ILIKE ${pattern} ESCAPE ${escapeCharacter})
          ORDER BY d.updated_at DESC
          LIMIT ${limit}
        `
        : await getDb()<FileSummaryRow>`
          SELECT
            d.id,
            d.title,
            left(d.content, 240) AS content_preview,
            length(d.content) AS content_length,
            d.created_at,
            d.updated_at,
            (
              SELECT count(*)
              FROM document_versions v
              WHERE v.user_id = d.user_id AND v.document_id = d.id
            ) AS version_count
          FROM documents d
          WHERE d.user_id = ${userId} AND d.deleted_at IS NULL
          ORDER BY d.updated_at DESC
          LIMIT ${limit}
        `;

      res.json({ files: rows.map(toFileSummary) });
    } catch (error) {
      next(error);
    }
  });

  router.get("/files/:id", async (req, res, next) => {
    try {
      const file = await getFileDetail(getSessionUserId(req), req.params.id);
      if (!file) return res.status(404).json({ error: "not_found" });
      res.json(file);
    } catch (error) {
      next(error);
    }
  });

  router.get("/files/:id/history", async (req, res, next) => {
    try {
      const userId = getSessionUserId(req);
      const file = await getFileDetail(userId, req.params.id);
      if (!file) return res.status(404).json({ error: "not_found" });
      const rows = await getDb()<DocumentVersionRow>`
        SELECT
          id,
          document_id,
          title,
          content_hash,
          left(content, 240) AS content_preview,
          length(content) AS content_length,
          source,
          created_at
        FROM document_versions
        WHERE user_id = ${userId} AND document_id = ${req.params.id}
        ORDER BY created_at DESC
      `;
      res.json({ versions: rows.map(toDocumentVersion) });
    } catch (error) {
      next(error);
    }
  });

  router.get("/files/:id/history/:versionId", async (req, res, next) => {
    try {
      const version = await getVersionDetail(getSessionUserId(req), req.params.id, req.params.versionId);
      if (!version) return res.status(404).json({ error: "not_found" });
      res.json(version);
    } catch (error) {
      next(error);
    }
  });

  router.post("/files/:id/restore", async (req, res, next) => {
    try {
      const userId = getSessionUserId(req);
      const versionId = String(req.body.versionId || "");
      const version = versionId ? await getVersionContent(userId, req.params.id, versionId) : null;
      if (!version) throw missingFileError();
      await withTransaction(async (db) => {
        await db`
          UPDATE documents
          SET title = ${version.title},
              content = ${version.content || ""},
              updated_at = now(),
              deleted_at = NULL
          WHERE user_id = ${userId} AND id = ${req.params.id} AND deleted_at IS NULL
        `;
        await createDocumentVersionIfChanged(db, {
          content: version.content || "",
          documentId: req.params.id,
          force: true,
          source: "restore",
          title: version.title,
          userId
        });
      });
      const file = await getFileDetail(userId, req.params.id);
      if (!file) throw missingFileError();
      res.json(file);
    } catch (error) {
      next(error);
    }
  });

  router.post("/files/:id/copy-version", async (req, res, next) => {
    try {
      const userId = getSessionUserId(req);
      const versionId = String(req.body.versionId || "");
      const version = versionId ? await getVersionContent(userId, req.params.id, versionId) : null;
      if (!version) throw missingFileError();
      const id = randomToken(18);
      const createdAt = Date.now();
      const title = `${version.title || "Untitled"} (copy)`.slice(0, 255);
      const content = version.content || "";
      await withTransaction(async (db) => {
        await db`
          INSERT INTO documents
            (id, user_id, title, content, scroll_pos, view_mode, sort_order, client_created_at, deleted_at, in_workspace)
          VALUES (${id}, ${userId}, ${title}, ${content}, 0, 'split', 0, ${createdAt}, NULL, false)
        `;
        await createDocumentVersionIfChanged(db, {
          content,
          documentId: id,
          force: true,
          source: "restore",
          title,
          userId
        });
      });
      const file = await getFileDetail(userId, id);
      if (!file) throw missingFileError();
      res.json(file);
    } catch (error) {
      next(error);
    }
  });

  router.delete("/files/:id", async (req, res, next) => {
    try {
      const rows = await getDb()<Pick<FileDetailRow, "id">>`
        UPDATE documents
        SET deleted_at = now(), updated_at = now()
        WHERE user_id = ${getSessionUserId(req)} AND id = ${req.params.id} AND deleted_at IS NULL
        RETURNING id
      `;
      if (!rows.length) return res.status(404).json({ error: "not_found" });
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
