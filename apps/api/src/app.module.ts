import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { LoggerModule } from "nestjs-pino";
import { resolveRequestId } from "./common/request-id.js";
import { ConfigModule, ENV } from "./config/config.module.js";
import type { Env } from "./config/env.js";
import { DatabaseModule } from "./database/database.module.js";
import { HealthModule } from "./health/health.module.js";

@Module({
  imports: [
    ConfigModule,
    LoggerModule.forRootAsync({
      inject: [ENV],
      useFactory: (env: Env) => ({
        pinoHttp: {
          level: env.LOG_LEVEL,
          // One request id per request: returned to the client and attached to every log line.
          genReqId: (req, res) => {
            const id = resolveRequestId(req.headers["x-request-id"]);
            res.setHeader("x-request-id", id);
            return id;
          },
          // Log only what is needed. No headers, no query strings (may hold tokens or child data).
          serializers: {
            req: (req: { id?: unknown; method?: string; url?: string }) => ({
              id: req.id,
              method: req.method,
              path: req.url?.split("?")[0],
            }),
            res: (res: { statusCode?: number }) => ({ statusCode: res.statusCode }),
          },
          redact: { paths: ["req.headers.authorization", "req.headers.cookie"], remove: true },
          autoLogging: { ignore: (req) => (req.url ?? "").startsWith("/v1/health") },
        },
      }),
    }),
    // Global default limit; stricter limits are added on auth/audio/assessment routes later.
    ThrottlerModule.forRootAsync({
      inject: [ENV],
      useFactory: (env: Env) => [{ ttl: 60_000, limit: env.RATE_LIMIT_PER_MINUTE }],
    }),
    DatabaseModule,
    HealthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
