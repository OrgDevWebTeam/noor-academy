import { Inject, Injectable, type OnModuleDestroy } from "@nestjs/common";
import { MongoClient, type Db } from "mongodb";
import { ENV } from "../config/config.module.js";
import type { Env } from "../config/env.js";

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly client: MongoClient;

  constructor(@Inject(ENV) env: Env) {
    // TODO(staging/production): enable TLS for the managed database connection.
    // The client connects lazily on first use, so startup does not block on the database.
    this.client = new MongoClient(env.DATABASE_URL, {
      maxPoolSize: 10,
      connectTimeoutMS: 5_000,
      serverSelectionTimeoutMS: 5_000,
      maxIdleTimeMS: 30_000,
    });
  }

  /** The database named in DATABASE_URL (e.g. mongodb://localhost:27017/noor). */
  get db(): Db {
    return this.client.db();
  }

  /** Throws if the database is unreachable. */
  async ping(): Promise<void> {
    await this.client.db("admin").command({ ping: 1 });
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.close();
  }
}
