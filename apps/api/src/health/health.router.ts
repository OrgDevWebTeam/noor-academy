import { Router } from "express";
import type { Database } from "../database/database.js";

/** Health probes come from load balancers, so this router is mounted before rate limiting. */
export function healthRouter(database: Pick<Database, "ping">): Router {
  const router = Router();

  // Liveness: the process is up.
  router.get("/", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Readiness: dependencies are reachable. Reveals no error details.
  router.get("/ready", async (_req, res) => {
    try {
      await database.ping();
      res.json({ status: "ok", checks: { database: "up" } });
    } catch {
      res.status(503).json({ status: "unavailable", checks: { database: "down" } });
    }
  });

  return router;
}
