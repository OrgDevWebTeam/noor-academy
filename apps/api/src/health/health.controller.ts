import { Controller, Get, Inject, ServiceUnavailableException } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { DatabaseService } from "../database/database.service.js";

// Health probes come from load balancers, so they are exempt from rate limiting.
@SkipThrottle()
@Controller("health")
export class HealthController {
  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}

  /** Liveness: the process is up. */
  @Get()
  live(): { status: string } {
    return { status: "ok" };
  }

  /** Readiness: dependencies are reachable. Reveals no error details. */
  @Get("ready")
  async ready(): Promise<{ status: string; checks: { database: string } }> {
    try {
      await this.db.ping();
      return { status: "ok", checks: { database: "up" } };
    } catch {
      throw new ServiceUnavailableException({
        status: "unavailable",
        checks: { database: "down" },
      });
    }
  }
}
