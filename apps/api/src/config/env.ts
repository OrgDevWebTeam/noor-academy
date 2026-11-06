import { APP_ENVS } from "@noor/contracts";
import { z } from "zod";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "0.0.0.0"]);
const LOG_LEVELS = ["fatal", "error", "warn", "info", "debug", "trace", "silent"] as const;

const commaList = z
  .string()
  .default("")
  .transform((value) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );

/** Host names from a MongoDB connection string (supports multi-host seed lists). */
export function mongoHosts(uri: string): string[] {
  const rest = uri.replace(/^mongodb(\+srv)?:\/\//, "");
  const authority = rest.split(/[/?]/, 1)[0] ?? "";
  const hostList = authority.includes("@")
    ? authority.slice(authority.lastIndexOf("@") + 1)
    : authority;
  return hostList
    .split(",")
    .map((host) => host.trim().replace(/:\d+$/, "").toLowerCase())
    .filter(Boolean);
}

/** True when the connection string enables TLS (mongodb+srv defaults to TLS on). */
export function mongoUsesTls(uri: string): boolean {
  if (/[?&](tls|ssl)=false(&|$)/i.test(uri)) return false;
  return /^mongodb\+srv:\/\//.test(uri) || /[?&](tls|ssl)=true(&|$)/i.test(uri);
}

export const envSchema = z
  .object({
    APP_ENV: z.enum(APP_ENVS),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    HOST: z.string().min(1).default("127.0.0.1"),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    LOG_LEVEL: z.enum(LOG_LEVELS).default("info"),
    RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).default(100),
    CORS_ORIGINS: commaList,
    MONGODB_URI: z.string().regex(/^mongodb(\+srv)?:\/\/.+/, {
      message: "must be a mongodb:// or mongodb+srv:// connection string",
    }),
    MONGODB_DB: z.string().regex(/^[A-Za-z0-9_-]{1,63}$/, {
      message: "must be 1-63 characters: letters, digits, underscore or hyphen",
    }),
    // Internal AI service (Architecture 8.1). Never exposed to browsers.
    AI_SERVICE_URL: z.string().url().default("http://127.0.0.1:8000"),
    AI_TIMEOUT_MS: z.coerce.number().int().min(100).max(60_000).default(20_000),
    // OpenID Connect (any provider: Cognito, Auth0, Keycloak...). All three or none.
    OIDC_ISSUER_URL: z.string().url().optional(),
    OIDC_AUDIENCE: z.string().min(1).optional(),
    OIDC_JWKS_URL: z.string().url().optional(),
  })
  .superRefine((env, ctx) => {
    const isDeployed = env.APP_ENV === "staging" || env.APP_ENV === "production";

    // Environment isolation guards for deployed environments.
    if (isDeployed && env.NODE_ENV !== "production") {
      ctx.addIssue({
        code: "custom",
        path: ["NODE_ENV"],
        message: `must be "production" when APP_ENV is ${env.APP_ENV}`,
      });
    }

    if (isDeployed && mongoHosts(env.MONGODB_URI).some((host) => LOCAL_HOSTS.has(host))) {
      ctx.addIssue({
        code: "custom",
        path: ["MONGODB_URI"],
        message: `must not point to a local database when APP_ENV is ${env.APP_ENV}`,
      });
    }

    if (isDeployed && !mongoUsesTls(env.MONGODB_URI)) {
      ctx.addIssue({
        code: "custom",
        path: ["MONGODB_URI"],
        message: `must use TLS when APP_ENV is ${env.APP_ENV}`,
      });
    }

    // Identity provider settings: required when deployed, all-or-nothing elsewhere.
    const oidc = {
      OIDC_ISSUER_URL: env.OIDC_ISSUER_URL,
      OIDC_AUDIENCE: env.OIDC_AUDIENCE,
      OIDC_JWKS_URL: env.OIDC_JWKS_URL,
    };
    const anyOidc = Object.values(oidc).some((value) => value !== undefined);
    if (isDeployed || anyOidc) {
      for (const [name, value] of Object.entries(oidc)) {
        if (value === undefined) {
          ctx.addIssue({
            code: "custom",
            path: [name],
            message: isDeployed
              ? `is required when APP_ENV is ${env.APP_ENV}`
              : "must be set together with the other OIDC_* variables",
          });
        }
      }
    }
    if (isDeployed) {
      for (const name of ["OIDC_ISSUER_URL", "OIDC_JWKS_URL"] as const) {
        const value = env[name];
        if (value !== undefined && !value.startsWith("https://")) {
          ctx.addIssue({ code: "custom", path: [name], message: "must use https://" });
        }
      }
    }

    // Verbose logs risk capturing child data.
    if (env.APP_ENV === "production" && (env.LOG_LEVEL === "debug" || env.LOG_LEVEL === "trace")) {
      ctx.addIssue({
        code: "custom",
        path: ["LOG_LEVEL"],
        message: "must not be debug or trace in production",
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

/**
 * Validates the process environment. Fails fast with a readable message.
 * The message lists variable names and rules only, never their values, so secrets
 * cannot leak into logs.
 */
export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const lines = result.error.issues.map(
      (issue) => `  - ${issue.path.join(".") || "(environment)"}: ${issue.message}`,
    );
    throw new Error(`Invalid environment configuration:\n${lines.join("\n")}`);
  }
  return result.data;
}
