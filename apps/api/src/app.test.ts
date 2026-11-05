import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { loadEnv } from "./config/env.js";

const env = loadEnv({
  APP_ENV: "local",
  LOG_LEVEL: "silent",
  MONGODB_URI: "mongodb://127.0.0.1:27018/?directConnection=true",
  MONGODB_DB: "noor_test",
  RATE_LIMIT_PER_MINUTE: "3",
});

const healthy = { ping: () => Promise.resolve(), db: {} as never };
const noAuth = () => Promise.reject(new Error("unused"));
const build = (database: { ping: () => Promise<void>; db: never } = healthy) =>
  createApp({ env, database, verifier: noAuth });

describe("health", () => {
  it("reports liveness with a request id and security headers", async () => {
    const res = await request(build()).get("/v1/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
    expect(res.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });

  it("reuses a well-formed incoming request id", async () => {
    const res = await request(build()).get("/v1/health").set("x-request-id", "trace-abc-12345");
    expect(res.headers["x-request-id"]).toBe("trace-abc-12345");
  });

  it("reports readiness when the database is up", async () => {
    const res = await request(build()).get("/v1/health/ready");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", checks: { database: "up" } });
  });

  it("hides failure details when the database is down", async () => {
    const down = { ping: () => Promise.reject(new Error("mongodb://user:secret@host")) };
    const res = await request(build({ ...healthy, ...down })).get("/v1/health/ready");
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: "unavailable", checks: { database: "down" } });
    expect(res.text).not.toContain("secret");
  });
});

describe("authentication wall", () => {
  it("returns 401 for protected routes without a token", async () => {
    const app = build();
    for (const path of ["/v1/me", "/v1/children", "/v1/admin/ping"]) {
      const res = await request(app).get(path);
      expect(res.status).toBe(401);
      expect(res.headers["www-authenticate"]).toBe("Bearer");
    }
  });

  it("returns 401 for a token the verifier rejects", async () => {
    const res = await request(build()).get("/v1/me").set("Authorization", "Bearer nonsense");
    expect(res.status).toBe(401);
  });
});

describe("app behaviour", () => {
  it("returns a generic 404 for unknown routes", async () => {
    const res = await request(build()).get("/v1/nope");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "not_found" });
  });

  it("rate limits normal routes but never health probes", async () => {
    const app = build();
    for (let i = 0; i < 3; i += 1) {
      expect((await request(app).get("/v1/nope")).status).toBe(404);
    }
    expect((await request(app).get("/v1/nope")).status).toBe(429);
    for (let i = 0; i < 6; i += 1) {
      expect((await request(app).get("/v1/health")).status).toBe(200);
    }
  });

  it("rejects malformed JSON without leaking parser details", async () => {
    const res = await request(build())
      .post("/v1/nope")
      .set("Content-Type", "application/json")
      .send("{bad");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("bad_request");
    expect(res.text).not.toContain("Unexpected");
  });
});
