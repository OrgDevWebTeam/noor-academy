import { describe, expect, it } from "vitest";
import { loadEnv, mongoHosts, mongoUsesTls } from "./env.js";

const base = {
  APP_ENV: "local",
  MONGODB_URI: "mongodb://127.0.0.1:27018/?directConnection=true",
  MONGODB_DB: "noor_local",
};

const atlas = "mongodb+srv://user:pass@cluster0.example.mongodb.net/?retryWrites=true";

const oidc = {
  OIDC_ISSUER_URL: "https://idp.example.com/",
  OIDC_AUDIENCE: "noor-api",
  OIDC_JWKS_URL: "https://idp.example.com/.well-known/jwks.json",
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

  it("fails when MONGODB_URI is missing", () => {
    expect(() => loadEnv({ APP_ENV: "local", MONGODB_DB: "noor_local" })).toThrow(/MONGODB_URI/);
  });

  it("rejects an invalid database name", () => {
    expect(() => loadEnv({ ...base, MONGODB_DB: "bad name!" })).toThrow(/MONGODB_DB/);
  });

  it("rejects an unknown APP_ENV", () => {
    expect(() => loadEnv({ ...base, APP_ENV: "prod" })).toThrow(/APP_ENV/);
  });

  it("never echoes secret values in the error message", () => {
    let message = "";
    try {
      loadEnv({ APP_ENV: "local", MONGODB_URI: "hunter2-not-a-uri", MONGODB_DB: "noor_local" });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain("MONGODB_URI");
    expect(message).not.toContain("hunter2");
  });

  it("rejects a local database in production", () => {
    expect(() =>
      loadEnv({
        APP_ENV: "production",
        NODE_ENV: "production",
        MONGODB_URI: "mongodb://127.0.0.1:27018/?tls=true",
        MONGODB_DB: "noor",
      }),
    ).toThrow(/local database/);
  });

  it("rejects a local host hidden in a multi-host seed list", () => {
    expect(() =>
      loadEnv({
        APP_ENV: "staging",
        NODE_ENV: "production",
        MONGODB_URI: "mongodb://db1.example.internal:27017,localhost:27017/?tls=true",
        MONGODB_DB: "noor",
      }),
    ).toThrow(/local database/);
  });

  it("requires TLS in deployed environments", () => {
    expect(() =>
      loadEnv({
        APP_ENV: "production",
        NODE_ENV: "production",
        MONGODB_URI: "mongodb://db.example.internal:27017/?replicaSet=rs0",
        MONGODB_DB: "noor",
      }),
    ).toThrow(/TLS/);
  });

  it("rejects non-production NODE_ENV in staging", () => {
    expect(() =>
      loadEnv({
        APP_ENV: "staging",
        NODE_ENV: "development",
        MONGODB_URI: atlas,
        MONGODB_DB: "noor",
      }),
    ).toThrow(/NODE_ENV/);
  });

  it("rejects debug logging in production", () => {
    expect(() =>
      loadEnv({
        APP_ENV: "production",
        NODE_ENV: "production",
        LOG_LEVEL: "debug",
        MONGODB_URI: atlas,
        MONGODB_DB: "noor",
      }),
    ).toThrow(/LOG_LEVEL/);
  });

  it("accepts a valid production config", () => {
    const env = loadEnv({
      APP_ENV: "production",
      NODE_ENV: "production",
      MONGODB_URI: atlas,
      MONGODB_DB: "noor",
      ...oidc,
    });
    expect(env.APP_ENV).toBe("production");
  });

  it("requires identity provider settings when deployed", () => {
    expect(() =>
      loadEnv({
        APP_ENV: "production",
        NODE_ENV: "production",
        MONGODB_URI: atlas,
        MONGODB_DB: "noor",
      }),
    ).toThrow(/OIDC_ISSUER_URL/);
  });

  it("requires https for identity provider URLs when deployed", () => {
    expect(() =>
      loadEnv({
        APP_ENV: "production",
        NODE_ENV: "production",
        MONGODB_URI: atlas,
        MONGODB_DB: "noor",
        ...oidc,
        OIDC_ISSUER_URL: "http://idp.example.com/",
      }),
    ).toThrow(/https/);
  });

  it("allows local runs with no identity provider", () => {
    expect(loadEnv(base).OIDC_ISSUER_URL).toBeUndefined();
  });

  it("accepts a complete local OIDC config but rejects a partial one", () => {
    expect(loadEnv({ ...base, ...oidc }).OIDC_AUDIENCE).toBe("noor-api");
    expect(() => loadEnv({ ...base, OIDC_AUDIENCE: "noor-api" })).toThrow(/OIDC_ISSUER_URL/);
  });
});

describe("mongoHosts", () => {
  it("extracts hosts, ignoring credentials, ports and options", () => {
    expect(mongoHosts("mongodb://u:p@A.example:27017,B.example:27018/db?tls=true")).toEqual([
      "a.example",
      "b.example",
    ]);
  });

  it("handles srv strings and IPv6 loopback", () => {
    expect(mongoHosts(atlas)).toEqual(["cluster0.example.mongodb.net"]);
    expect(mongoHosts("mongodb://[::1]:27017/")).toEqual(["[::1]"]);
  });
});

describe("mongoUsesTls", () => {
  it("is on for srv and tls=true, off otherwise or when disabled", () => {
    expect(mongoUsesTls(atlas)).toBe(true);
    expect(mongoUsesTls("mongodb://h:27017/?tls=true")).toBe(true);
    expect(mongoUsesTls("mongodb://h:27017/")).toBe(false);
    expect(mongoUsesTls("mongodb+srv://h/?tls=false")).toBe(false);
  });
});
