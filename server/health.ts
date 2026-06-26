import express from "express";

import { getPool } from "./db";
import { ensureBucket, isR2Configured } from "./r2";

export function createHealthRouter() {
  const router = express.Router();

  router.get("/healthz", async (_req, res) => {
    const result = { ok: true, db: "unknown", r2: "not_configured" };
    try {
      await getPool().query("SELECT 1");
      result.db = "ok";
    } catch (error) {
      result.ok = false;
      result.db = "error";
    }
    if (isR2Configured()) {
      try {
        await ensureBucket();
        result.r2 = "ok";
      } catch (error) {
        result.ok = false;
        result.r2 = "error";
      }
    }
    res.status(result.ok ? 200 : 503).json(result);
  });

  return router;
}
