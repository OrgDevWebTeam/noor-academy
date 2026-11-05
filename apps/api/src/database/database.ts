import { type Db, MongoClient } from "mongodb";
import type { Env } from "../config/env.js";

export interface Database {
  /**
   * Repositories use this. Every query on child-owned collections MUST include familyId
   * (architecture 6.2); that rule lives in the repository layer added with identity.
   */
  readonly db: Db;
  /** Throws if the database is unreachable. */
  ping(): Promise<void>;
  close(): Promise<void>;
}

export function createDatabase(env: Env): Database {
  // The driver connects lazily on first use. Never log the connection string.
  const client = new MongoClient(env.MONGODB_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5_000,
  });
  return {
    get db() {
      return client.db(env.MONGODB_DB);
    },
    async ping() {
      await client.db(env.MONGODB_DB).command({ ping: 1 });
    },
    async close() {
      await client.close();
    },
  };
}
