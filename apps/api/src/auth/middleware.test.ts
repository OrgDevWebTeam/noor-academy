import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { authenticate, getAuth, requirePermission, type UserRecord } from "./middleware.js";
import type { TokenVerifier } from "./types.js";

const tokens: Record<string, { subject: string; claims: Record<string, unknown> }> = {
  parent: { subject: "p1", claims: {} },
  disabled: { subject: "d1", claims: {} },
  teacher: { subject: "t1", claims: {} },
  "teacher-mfa": { subject: "t1", claims: { amr: ["mfa"] } },
  admin: { subject: "a1", claims: { amr: ["mfa"] } },
};

const records: Record<string, UserRecord> = {
  p1: { id: "u-p1", roles: ["parent"], familyId: "f1", status: "active" },
  d1: { id: "u-d1", roles: ["parent"], familyId: "f2", status: "disabled" },
  t1: { id: "u-t1", roles: ["teacher"], familyId: null, status: "active" },
  a1: { id: "u-a1", roles: ["platform_admin"], familyId: null, status: "active" },
};

const verifier: TokenVerifier = (token) => {
  const entry = tokens[token];
  return entry ? Promise.resolve(entry) : Promise.reject(new Error("bad token"));
};
const users = {
  findOrProvisionParent: (subject: string) => {
    const record = records[subject];
    return record ? Promise.resolve(record) : Promise.reject(new Error("unknown"));
  },
};

const app = express();
const auth = authenticate({ verifier, users });
app.get("/read", auth, requirePermission("child:read"), (req, res) => {
  res.json({ userId: getAuth(req).userId });
});
app.get("/manage", auth, requirePermission("user:manage"), (_req, res) => {
  res.json({ ok: true });
});

const get = (path: string, token?: string) => {
  const req = request(app).get(path);
  return token ? req.set("Authorization", `Bearer ${token}`) : req;
};

describe("authenticate", () => {
  it("returns 401 without a token", async () => {
    const res = await get("/read");
    expect(res.status).toBe(401);
    expect(res.headers["www-authenticate"]).toBe("Bearer");
  });

  it("returns 401 for an invalid token without explaining why", async () => {
    const res = await get("/read", "garbage");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "unauthenticated" });
  });

  it("lets a valid parent through", async () => {
    const res = await get("/read", "parent");
    expect(res.status).toBe(200);
    expect(res.body.userId).toBe("u-p1");
  });

  it("blocks disabled accounts", async () => {
    const res = await get("/read", "disabled");
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("account_disabled");
  });

  it("requires MFA for staff", async () => {
    const without = await get("/read", "teacher");
    expect(without.status).toBe(403);
    expect(without.body.error).toBe("mfa_required");
    expect((await get("/read", "teacher-mfa")).status).toBe(200);
  });
});

describe("requirePermission", () => {
  it("returns 403 when the role lacks the permission", async () => {
    expect((await get("/manage", "parent")).status).toBe(403);
    expect((await get("/manage", "teacher-mfa")).status).toBe(403);
  });

  it("allows a role that has the permission", async () => {
    expect((await get("/manage", "admin")).status).toBe(200);
  });
});
