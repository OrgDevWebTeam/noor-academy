import { Router } from "express";
import { getAuth } from "../auth/middleware.js";

export function meRouter(): Router {
  const router = Router();
  router.get("/", (req, res) => {
    const { userId, roles, familyId } = getAuth(req);
    res.json({ userId, roles, familyId });
  });
  return router;
}
