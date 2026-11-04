import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { API_VERSION } from "@noor/contracts";
import helmet from "helmet";
import { Logger } from "nestjs-pino";
import { AppModule } from "./app.module.js";
import { loadEnv } from "./config/env.js";

async function bootstrap(): Promise<void> {
  // Fail fast on bad configuration, before anything else starts.
  const env = loadEnv();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  app.use(helmet());
  // Behind the load balancer (staging/production) the client IP comes from X-Forwarded-For,
  // which rate limiting needs.
  if (env.APP_ENV !== "local") {
    app.set("trust proxy", 1);
  }
  app.enableCors({ origin: env.CORS_ORIGINS, credentials: true });
  app.setGlobalPrefix(API_VERSION);
  app.enableShutdownHooks();

  await app.listen(env.PORT, env.HOST);
}

bootstrap().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
