import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import type { TokenVerifier } from "./auth/types.js";
import { loadEnv } from "./config/env.js";
import { type TestDatabase, createTestDatabase } from "./testing/mongo.js";

const tokens: Record<string, { subject: string; claims: Record<string, unknown> }> = {
  alice: { subject: "alice", claims: {} },
  bob: { subject: "bob", claims: {} },
  "teacher-mfa": { subject: "teacher-1", claims: { amr: ["mfa"] } },
  "teacher-nomfa": { subject: "teacher-1", claims: {} },
  "admin-mfa": { subject: "admin-1", claims: { amr: ["mfa"] } },
  "admin-nomfa": { subject: "admin-1", claims: {} },
};
const verifier: TokenVerifier = (token) => {
  const entry = tokens[token];
  return entry ? Promise.resolve(entry) : Promise.reject(new Error("bad token"));
};

let t: TestDatabase | undefined;
let app: ReturnType<typeof createApp>;
const teacherId = randomUUID();

const call = (method: "get" | "post", path: string, token?: string) => {
  const req = request(app)[method](path);
  return token ? req.set("Authorization", `Bearer ${token}`) : req;
};

async function createChild(token: string, displayName = "Aya"): Promise<string> {
  const res = await call("post", "/v1/children", token).send({ displayName, birthYear: 2018 });
  expect(res.status).toBe(201);
  return res.body.child.id as string;
}

beforeAll(async () => {
  t = await createTestDatabase();
  const env = loadEnv({
    APP_ENV: "local",
    LOG_LEVEL: "silent",
    MONGODB_URI: t.uri,
    MONGODB_DB: "ignored",
    RATE_LIMIT_PER_MINUTE: "10000",
  });
  app = createApp({ env, database: { db: t.db, ping: () => Promise.resolve() }, verifier });

  const now = new Date();
  await t.db.collection("users").insertMany([
    {
      _id: teacherId as never,
      subject: "teacher-1",
      roles: ["teacher"],
      familyId: null,
      status: "active",
      createdAt: now,
    },
    {
      _id: randomUUID() as never,
      subject: "admin-1",
      roles: ["platform_admin"],
      familyId: null,
      status: "active",
      createdAt: now,
    },
  ]);
});
afterAll(async () => {
  await t?.cleanup();
});

describe("authentication", () => {
  it("rejects missing and invalid tokens", async () => {
    expect((await call("get", "/v1/me")).status).toBe(401);
    expect((await call("get", "/v1/me", "nonsense")).status).toBe(401);
  });

  it("provisions a parent and family on first login, idempotently", async () => {
    const first = await call("get", "/v1/me", "alice");
    const second = await call("get", "/v1/me", "alice");
    expect(first.status).toBe(200);
    expect(first.body.roles).toEqual(["parent"]);
    expect(second.body.userId).toBe(first.body.userId);
  });
});

describe("cross-family isolation (release gate)", () => {
  it("hides one family's children from another family", async () => {
    const childId = await createChild("alice");
    expect((await call("get", `/v1/children/${childId}`, "alice")).status).toBe(200);
    expect((await call("get", `/v1/children/${childId}`, "bob")).status).toBe(404);
    expect((await call("get", "/v1/children", "bob")).body.children).toEqual([]);
    const pin = await call("post", `/v1/children/${childId}/pin`, "bob").send({ pin: "1234" });
    expect(pin.status).toBe(404);
  });

  it("returns the same 404 for a missing child and another family's child", async () => {
    const childId = await createChild("alice");
    const other = await call("get", `/v1/children/${childId}`, "bob");
    const missing = await call("get", `/v1/children/${randomUUID()}`, "bob");
    expect(other.status).toBe(missing.status);
    expect(other.body).toEqual(missing.body);
  });
});

describe("roles and permissions", () => {
  it("returns 403 when a parent calls an admin route", async () => {
    expect((await call("get", "/v1/admin/ping", "alice")).status).toBe(403);
  });

  it("lets an admin with MFA in, and refuses one without", async () => {
    expect((await call("get", "/v1/admin/ping", "admin-mfa")).status).toBe(200);
    const res = await call("get", "/v1/admin/ping", "admin-nomfa");
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("mfa_required");
  });

  it("keeps admins away from children's data", async () => {
    expect((await call("get", "/v1/children", "admin-mfa")).status).toBe(403);
  });

  it("rejects unknown fields and invalid input", async () => {
    const extra = await call("post", "/v1/children", "alice").send({
      displayName: "A",
      birthYear: 2018,
      role: "admin",
    });
    expect(extra.status).toBe(400);
    const bad = await call("post", "/v1/children", "alice").send({
      displayName: "",
      birthYear: 2018,
    });
    expect(bad.status).toBe(400);
  });
});

describe("teachers", () => {
  it("requires MFA, and refuses unassigned teachers", async () => {
    const childId = await createChild("alice");
    const noMfa = await call("get", `/v1/children/${childId}`, "teacher-nomfa");
    expect(noMfa.status).toBe(403);
    expect((await call("get", `/v1/children/${childId}`, "teacher-mfa")).status).toBe(404);
    expect((await call("get", "/v1/children", "teacher-mfa")).body.children).toEqual([]);
  });

  it("shows a child once the teacher is assigned", async () => {
    const childId = await createChild("alice");
    const me = await call("get", "/v1/me", "alice");
    await t!.db.collection("teacherAssignments").insertOne({
      _id: randomUUID() as never,
      teacherId,
      childId,
      familyId: me.body.familyId,
      status: "active",
      createdAt: new Date(),
    });
    expect((await call("get", `/v1/children/${childId}`, "teacher-mfa")).status).toBe(200);
  });
});

describe("child PIN", () => {
  it("verifies the right PIN, rejects wrong ones and locks after repeated failures", async () => {
    const childId = await createChild("bob", "Omar");
    const verify = (pin: string) =>
      call("post", `/v1/children/${childId}/pin/verify`, "bob").send({ pin });

    expect((await verify("1234")).status).toBe(409);
    const set = await call("post", `/v1/children/${childId}/pin`, "bob").send({ pin: "1234" });
    expect(set.status).toBe(204);
    expect((await verify("1234")).body).toEqual({ ok: true });

    for (let i = 0; i < 4; i += 1) expect((await verify("9999")).status).toBe(401);
    expect((await verify("9999")).status).toBe(423);
    expect((await verify("1234")).status).toBe(423);
  });

  it("rejects malformed PINs", async () => {
    const childId = await createChild("bob", "Omar");
    const res = await call("post", `/v1/children/${childId}/pin`, "bob").send({ pin: "abc" });
    expect(res.status).toBe(400);
  });
});

describe("audit trail", () => {
  it("records child creation without personal content", async () => {
    const childId = await createChild("alice", "Layla");
    const me = await call("get", "/v1/me", "alice");
    const events = await t!.db
      .collection("audit_events")
      .find({ familyId: me.body.familyId, resourceId: childId })
      .toArray();
    expect(events.map((e) => e.action)).toContain("child.create");
    expect(JSON.stringify(events)).not.toContain("Layla");
  });
});
