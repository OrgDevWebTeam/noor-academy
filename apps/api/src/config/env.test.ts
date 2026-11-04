import { describe, expect, it } from "vitest";
import { loadEnv } from "./env.js";

const base = {
  APP_ENV: "local",
  DATABASE_URL: "mongodb://noor:noor@127.0.0.1:27018/noor_local?authSource=admin",
};

describe("loadEnv", () => {
  it("accepts a minimal local config and applies defaults", () => {
    const env = loadEnv(base);
    expect(env.PORT).toBe(4000);
    expect(env.HOST).toBe("127.0.0.1");
    expect(env.CORS_ORIGINS).toEqual([]);
    expect(env.NODE_ENV).toBe("development");
  });

  it("parses a comma-separated CORS list", () => {
    const env = loadEnv({ ...base, CORS_ORIGINS: "http://a.test, http://b.test," });
    expect(env.CORS_ORIGINS).toEqual(["http://a.test", "http://b.test"]);
  });

  it("fails when DATABASE_URL is missing", () => {
    expect(() => loadEnv({ APP_ENV: "local" })).toThrow(/DATABASE_URL/);
  });

  it("rejects an unknown APP_ENV", () => {
    expect(() => loadEnv({ ...base, APP_ENV: "prod" })).toThrow(/APP_ENV/);
  });

  it("never echoes secret values in the error message", () => {
    let message = "";
    try {
      loadEnv({ APP_ENV: "local", DATABASE_URL: "hunter2-not-a-url" });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain("DATABASE_URL");
    expect(message).not.toContain("hunter2");
  });

  it("rejects a local database in production", () => {
    expect(() => loadEnv({ ...base, APP_ENV: "production", NODE_ENV: "production" })).toThrow(
      /local database/,
    );
  });

  it("rejects non-production NODE_ENV in staging", () => {
    expect(() =>
      loadEnv({
        APP_ENV: "staging",
        NODE_ENV: "development",
        DATABASE_URL: "mongodb://u:p@db.example.internal:27017/noor?authSource=admin",
      }),
    ).toThrow(/NODE_ENV/);
  });

  it("rejects debug logging in production", () => {
    expect(() =>
      loadEnv({
        APP_ENV: "production",
        NODE_ENV: "production",
        LOG_LEVEL: "debug",
        DATABASE_URL: "mongodb://u:p@db.example.internal:27017/noor?authSource=admin",
      }),
    ).toThrow(/LOG_LEVEL/);
  });

  it("accepts a valid production config", () => {
    const env = loadEnv({
      APP_ENV: "production",
      NODE_ENV: "production",
      DATABASE_URL: "mongodb://u:p@db.example.internal:27017/noor?authSource=admin",
    });
    expect(env.APP_ENV).toBe("production");
  });
});
it("accepts a multi-host replica-set URL and an SRV URL", () => {
  const hosts = "mongodb://u:p@db1.example.internal:27017,db2.example.internal:27017/noor";
  expect(
    loadEnv({ APP_ENV: "production", NODE_ENV: "production", DATABASE_URL: hosts }).APP_ENV,
  ).toBe("production");
  expect(
    loadEnv({
      APP_ENV: "production",
      NODE_ENV: "production",
      DATABASE_URL: "mongodb+srv://u:p@cluster0.example.mongodb.net/noor",
    }).APP_ENV,
  ).toBe("production");
});
