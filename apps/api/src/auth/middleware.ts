import { type Permission, type Role, hasPermission, isStaffRole } from "@noor/contracts";
import type { Request, RequestHandler, Response } from "express";
import { satisfiesMfa } from "./mfa.js";
import type { AuthContext, TokenVerifier } from "./types.js";

export interface UserRecord {
  id: string;
  roles: readonly Role[];
  familyId: string | null;
  status: "active" | "disabled";
}

export interface UserLookup {
  /** Finds the user for an identity-provider subject; creates a parent + family on first login. */
  findOrProvisionParent(subject: string): Promise<UserRecord>;
}

function unauthenticated(res: Response): void {
  res.setHeader("WWW-Authenticate", "Bearer");
  res.status(401).json({ error: "unauthenticated" });
}

/** Verifies the bearer token, loads our own user, enforces MFA for staff, sets req.auth. */
export function authenticate(deps: { verifier: TokenVerifier; users: UserLookup }): RequestHandler {
  return async (req, res, next) => {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : "";
    if (!token) {
      unauthenticated(res);
      return;
    }

    let verified;
    try {
      verified = await deps.verifier(token);
    } catch {
      // Never reveal why a token was rejected.
      unauthenticated(res);
      return;
    }

    try {
      const user = await deps.users.findOrProvisionParent(verified.subject);
      if (user.status !== "active") {
        res.status(403).json({ error: "account_disabled" });
        return;
      }
      if (user.roles.some(isStaffRole) && !satisfiesMfa(verified.claims)) {
        res.status(403).json({ error: "mfa_required" });
        return;
      }
      req.auth = {
        userId: user.id,
        subject: verified.subject,
        roles: user.roles,
        familyId: user.familyId,
      };
      next();
    } catch (error) {
      next(error);
    }
  };
}

/** Checks a permission, never a role name (architecture 6.2). Use after `authenticate`. */
export function requirePermission(permission: Permission): RequestHandler {
  return (req, res, next) => {
    if (!req.auth) {
      unauthenticated(res);
      return;
    }
    if (!hasPermission(req.auth.roles, permission)) {
      res.status(403).json({ error: "forbidden" });
      return;
    }
    next();
  };
}

export function getAuth(req: Request): AuthContext {
  if (!req.auth) throw new Error("authenticate middleware is missing on this route");
  return req.auth;
}
