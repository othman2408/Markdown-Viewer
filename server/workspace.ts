import express from "express";

import { MAX_DOCUMENT_BYTES, VIEW_MODES } from "./config";
import { ensureCsrfToken, getSessionUserId } from "./auth";
import { getDb, withTransaction } from "./db";
import type {
  ClientTab,
  DocumentRow,
  HttpError,
  JsonObject,
  NormalizedTab,
  NormalizedWorkspaceBody,
  ViewMode,
  WorkspaceStateRow
} from "./types";

export function normalizeTab(tab: unknown, index: number): NormalizedTab | null {
  if (!tab || typeof tab !== "object") return null;
  const rawTab = tab as Record<string, unknown>;
  const id = String(rawTab.id || "").slice(0, 128);
  if (!id) return null;
  const rawContent = typeof rawTab.content === "string" ? rawTab.content : "";
  if (Buffer.byteLength(rawContent, "utf8") > MAX_DOCUMENT_BYTES) {
    const error = new Error("Document is too large") as HttpError;
    error.status = 413;
    throw error;
  }
  const title = String(rawTab.title || "Untitled").trim().slice(0, 255) || "Untitled";
  const viewMode = VIEW_MODES.has(String(rawTab.viewMode)) ? rawTab.viewMode as ViewMode : "split";
  const scrollPos = Number.isFinite(Number(rawTab.scrollPos))
    ? Math.max(0, Math.floor(Number(rawTab.scrollPos)))
    : 0;
  const createdAt = Number.isFinite(Number(rawTab.createdAt)) ? Math.floor(Number(rawTab.createdAt)) : Date.now();
  return {
    id,
    title,
    content: rawContent,
    scrollPos,
    viewMode,
    sortOrder: index,
    createdAt
  };
}

function toClientTab(row: DocumentRow): ClientTab {
  return {
    id: row.id,
    title: row.title,
    content: row.content || "",
    scrollPos: row.scroll_pos || 0,
    viewMode: row.view_mode || "split",
    createdAt: row.client_created_at ? Number(row.client_created_at) : new Date(row.created_at).getTime()
  };
}

export function normalizeWorkspaceBody(body: unknown): NormalizedWorkspaceBody {
  const rawBody = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const tabs = Array.isArray(rawBody.tabs)
    ? rawBody.tabs.map((tab, index) => normalizeTab(tab, index)).filter((tab): tab is NormalizedTab => Boolean(tab))
    : [];
  const activeTabId = typeof rawBody.activeTabId === "string" ? rawBody.activeTabId.slice(0, 128) : null;
  const untitledCounter = Number.isFinite(Number(rawBody.untitledCounter))
    ? Math.max(0, Math.floor(Number(rawBody.untitledCounter)))
    : 0;
  const globalState = rawBody.globalState && typeof rawBody.globalState === "object" && !Array.isArray(rawBody.globalState)
    ? rawBody.globalState as JsonObject
    : {};
  const findReplaceDocked = Boolean(rawBody.findReplaceDocked);
  return { activeTabId, findReplaceDocked, globalState, tabs, untitledCounter };
}

async function saveWorkspace(userId: string, body: unknown): Promise<void> {
  const state = normalizeWorkspaceBody(body);
  await withTransaction(async (db) => {
    const ids = state.tabs.map((tab) => tab.id);
    if (ids.length) {
      await db`
        UPDATE documents
        SET deleted_at = now(), updated_at = now()
        WHERE user_id = ${userId}
          AND deleted_at IS NULL
          AND NOT (id = ANY(${db.array(ids)}::text[]))
      `;
    } else {
      await db`
        UPDATE documents
        SET deleted_at = now(), updated_at = now()
        WHERE user_id = ${userId} AND deleted_at IS NULL
      `;
    }

    for (const tab of state.tabs) {
      await db`
        INSERT INTO documents
          (id, user_id, title, content, scroll_pos, view_mode, sort_order, client_created_at, deleted_at)
         VALUES (
          ${tab.id},
          ${userId},
          ${tab.title},
          ${tab.content},
          ${tab.scrollPos},
          ${tab.viewMode},
          ${tab.sortOrder},
          ${tab.createdAt},
          NULL
         )
         ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          content = EXCLUDED.content,
          scroll_pos = EXCLUDED.scroll_pos,
          view_mode = EXCLUDED.view_mode,
          sort_order = EXCLUDED.sort_order,
          client_created_at = EXCLUDED.client_created_at,
          deleted_at = NULL,
          updated_at = now()
         WHERE documents.user_id = EXCLUDED.user_id
      `;
    }

    await db`
      INSERT INTO workspace_state
        (user_id, active_tab_id, untitled_counter, global_state, find_replace_docked)
       VALUES (
        ${userId},
        ${state.activeTabId},
        ${state.untitledCounter},
        ${JSON.stringify(state.globalState)}::jsonb,
        ${state.findReplaceDocked}
       )
       ON CONFLICT (user_id) DO UPDATE SET
        active_tab_id = EXCLUDED.active_tab_id,
        untitled_counter = EXCLUDED.untitled_counter,
        global_state = EXCLUDED.global_state,
        find_replace_docked = EXCLUDED.find_replace_docked,
        updated_at = now()
    `;
  });
}

async function loadWorkspace(userId: string): Promise<{
  activeTabId: string | null;
  findReplaceDocked: boolean;
  globalState: JsonObject;
  tabs: ClientTab[];
  untitledCounter: number;
}> {
  const db = getDb();
  const [docResult, stateResult] = await Promise.all([
    db<DocumentRow>`
      SELECT id, title, content, scroll_pos, view_mode, client_created_at, created_at
       FROM documents
       WHERE user_id = ${userId} AND deleted_at IS NULL
       ORDER BY sort_order ASC, created_at ASC
    `,
    db<WorkspaceStateRow>`
      SELECT active_tab_id, untitled_counter, global_state, find_replace_docked
      FROM workspace_state
      WHERE user_id = ${userId}
    `
  ]);

  const state = stateResult[0] || {};
  return {
    activeTabId: state.active_tab_id || null,
    findReplaceDocked: Boolean(state.find_replace_docked),
    globalState: state.global_state || {},
    tabs: docResult.map(toClientTab),
    untitledCounter: Number(state.untitled_counter || 0)
  };
}

export function createWorkspaceRouter() {
  const router = express.Router();

  router.get("/bootstrap", async (req, res, next) => {
    try {
      const workspace = await loadWorkspace(getSessionUserId(req));
      res.json({
        ...workspace,
        csrfToken: ensureCsrfToken(req)
      });
    } catch (error) {
      next(error);
    }
  });

  router.put("/workspace", async (req, res, next) => {
    try {
      await saveWorkspace(getSessionUserId(req), req.body || {});
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  router.put("/documents/:id", async (req, res, next) => {
    try {
      const tab = normalizeTab({ ...req.body, id: req.params.id }, 0);
      if (!tab) return res.status(400).json({ error: "invalid_document" });
      const userId = getSessionUserId(req);
      await withTransaction(async (db) => {
        await db`
          INSERT INTO documents
            (id, user_id, title, content, scroll_pos, view_mode, sort_order, client_created_at, deleted_at)
           VALUES (
            ${tab.id},
            ${userId},
            ${tab.title},
            ${tab.content},
            ${tab.scrollPos},
            ${tab.viewMode},
            0,
            ${tab.createdAt},
            NULL
           )
           ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            content = EXCLUDED.content,
            scroll_pos = EXCLUDED.scroll_pos,
            view_mode = EXCLUDED.view_mode,
            client_created_at = EXCLUDED.client_created_at,
            deleted_at = NULL,
            updated_at = now()
           WHERE documents.user_id = EXCLUDED.user_id
        `;
      });
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/documents/:id", async (req, res, next) => {
    try {
      await getDb()`
        UPDATE documents
        SET deleted_at = now(), updated_at = now()
        WHERE user_id = ${getSessionUserId(req)} AND id = ${req.params.id}
      `;
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
