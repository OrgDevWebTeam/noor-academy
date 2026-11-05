import { Router, type Request, type Response } from "express";
import { z } from "zod";
import type { AuditEventInput, AuditLog } from "../audit/audit.js";
import { getAuth, requirePermission } from "../auth/middleware.js";
import { hashPin, verifyPin } from "../auth/pin.js";
import type { AuthContext } from "../auth/types.js";
import { wrap } from "../common/async-handler.js";
import { uuidParam } from "../common/params.js";
import { validateBody } from "../middleware/validate.js";
import type { AccessScope, ChildrenRepository, FamilyScope } from "./children.repository.js";

const currentYear = new Date().getFullYear();
const createChildSchema = z
  .object({
    displayName: z.string().trim().min(1).max(50),
    birthYear: z
      .number()
      .int()
      .min(currentYear - 18)
      .max(currentYear),
  })
  .strict();
const pinSchema = z.object({ pin: z.string().regex(/^\d{4,6}$/) }).strict();

function familyScope(auth: AuthContext): FamilyScope | null {
  return auth.roles.includes("parent") && auth.familyId
    ? { kind: "family", familyId: auth.familyId }
    : null;
}

// A user with both roles is treated as a parent here; revisit if that case is ever needed.
function anyScope(auth: AuthContext): AccessScope | null {
  const family = familyScope(auth);
  if (family) return family;
  return auth.roles.includes("teacher") ? { kind: "teacher", teacherId: auth.userId } : null;
}

const notFound = (res: Response): void => {
  // Same answer for "missing" and "belongs to another family": no existence leak.
  res.status(404).json({ error: "not_found" });
};
const forbidden = (res: Response): void => {
  res.status(403).json({ error: "forbidden" });
};

export function childrenRouter(deps: { children: ChildrenRepository; audit: AuditLog }): Router {
  const { children, audit } = deps;
  const router = Router();

  async function record(req: Request, res: Response, event: AuditEventInput): Promise<void> {
    try {
      // TODO: write the audit event in the same transaction as the change (replica set).
      await audit.record({ ...event, requestId: String(res.locals.requestId) });
    } catch (error) {
      req.log?.error({ err: error }, "audit write failed");
    }
  }

  router.get(
    "/",
    requirePermission("child:read"),
    wrap(async (req, res) => {
      const scope = anyScope(getAuth(req));
      if (!scope) return forbidden(res);
      res.json({ children: await children.list(scope) });
    }),
  );

  router.post(
    "/",
    requirePermission("child:create"),
    validateBody(createChildSchema),
    wrap(async (req, res) => {
      const auth = getAuth(req);
      const scope = familyScope(auth);
      if (!scope) return forbidden(res);
      const body = req.body as { displayName: string; birthYear: number };
      const child = await children.create(scope, body);
      await record(req, res, {
        actorType: "parent",
        actorId: auth.userId,
        action: "child.create",
        resourceType: "child",
        resourceId: child.id,
        familyId: scope.familyId,
      });
      res.status(201).json({ child });
    }),
  );

  router.get(
    "/:childId",
    requirePermission("child:read"),
    wrap(async (req, res) => {
      const scope = anyScope(getAuth(req));
      const childId = uuidParam(req, "childId");
      if (!scope) return forbidden(res);
      if (!childId) return notFound(res);
      const child = await children.find(scope, childId);
      if (!child) return notFound(res);
      res.json({ child });
    }),
  );

  router.post(
    "/:childId/pin",
    requirePermission("child:pin:manage"),
    validateBody(pinSchema),
    wrap(async (req, res) => {
      const auth = getAuth(req);
      const scope = familyScope(auth);
      const childId = uuidParam(req, "childId");
      if (!scope) return forbidden(res);
      if (!childId) return notFound(res);
      const pinHash = await hashPin((req.body as { pin: string }).pin);
      if (!(await children.setPin(scope, childId, pinHash))) return notFound(res);
      await record(req, res, {
        actorType: "parent",
        actorId: auth.userId,
        action: "child.pin.set",
        resourceType: "child",
        resourceId: childId,
        familyId: scope.familyId,
      });
      res.status(204).end();
    }),
  );

  router.post(
    "/:childId/pin/verify",
    requirePermission("child:pin:manage"),
    validateBody(pinSchema),
    wrap(async (req, res) => {
      const auth = getAuth(req);
      const scope = familyScope(auth);
      const childId = uuidParam(req, "childId");
      if (!scope) return forbidden(res);
      if (!childId) return notFound(res);

      const state = await children.getPinState(scope, childId);
      if (!state) return notFound(res);
      const now = new Date();
      if (state.pinLockedUntil && state.pinLockedUntil > now) {
        res.status(423).json({ error: "pin_locked" });
        return;
      }
      if (!state.pinHash) {
        res.status(409).json({ error: "pin_not_set" });
        return;
      }

      if (await verifyPin((req.body as { pin: string }).pin, state.pinHash)) {
        await children.recordPinSuccess(scope, childId);
        res.json({ ok: true });
        return;
      }

      const { locked } = await children.recordPinFailure(scope, childId, now);
      if (locked) {
        await record(req, res, {
          actorType: "parent",
          actorId: auth.userId,
          action: "child.pin.locked",
          resourceType: "child",
          resourceId: childId,
          familyId: scope.familyId,
        });
        res.status(423).json({ error: "pin_locked" });
        return;
      }
      res.status(401).json({ error: "invalid_pin" });
    }),
  );

  return router;
}
