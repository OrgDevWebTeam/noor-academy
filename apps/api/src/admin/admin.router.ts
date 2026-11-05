import { Router } from "express";
import { requirePermission } from "../auth/middleware.js";

/** Role-gated example route. Real admin features (assignments, users) attach here later. */
export function adminRouter(): Router {
  const router = Router();
  router.get("/ping", requirePermission("user:manage"), (_req, res) => {
    res.json({ status: "ok" });
  });
  return router;
}
