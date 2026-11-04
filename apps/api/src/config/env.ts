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

export const envSchema = z
  .object({
    APP_ENV: z.enum(APP_ENVS),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    HOST: z.string().min(1).default("127.0.0.1"),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    LOG_LEVEL: z.enum(LOG_LEVELS).default("info"),
    RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).default(100),
    CORS_ORIGINS: commaList,
    DATABASE_URL: z.string().refine((value) => /^mongodb(\+srv)?:\/\//.test(value), {
      message: "must be a mongodb:// or mongodb+srv:// URL",
    }),
  })
  .superRefine((env, ctx) => {
    const isDeployed = env.APP_ENV === "staging" || env.APP_ENV === "production";

    // Environment isolation guards: a deployed environment must never run in dev mode
    // or point at a local database.
    if (isDeployed && env.NODE_ENV !== "production") {
      ctx.addIssue({
        code: "custom",
        path: ["NODE_ENV"],
        message: `must be "production" when APP_ENV is ${env.APP_ENV}`,
      });
    }

    if (isDeployed) {
      try {
        const host = new URL(env.DATABASE_URL).hostname;
        if (LOCAL_HOSTS.has(host)) {
          ctx.addIssue({
            code: "custom",
            path: ["DATABASE_URL"],
            message: `must not point to a local database when APP_ENV is ${env.APP_ENV}`,
          });
        }
      } catch {
        // Invalid URLs are already reported by the field validator.
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
