import { randomUUID } from "node:crypto";
import { readdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { type Db, MongoClient } from "mongodb";

export interface TestDatabase {
  db: Db;
  uri: string;
  cleanup(): Promise<void>;
}

/**
 * Creates a throwaway database, applies every migration, and returns it.
 * In CI MONGODB_TEST_URI must be set (a missing database fails loudly instead of skipping).
 * Locally it defaults to the Docker Compose database (pnpm --filter @noor/api db:up).
 */
export async function createTestDatabase(): Promise<TestDatabase> {
  const uri =
    process.env.MONGODB_TEST_URI ??
    (process.env.CI ? undefined : "mongodb://127.0.0.1:27018/?directConnection=true");
  if (!uri) throw new Error("MONGODB_TEST_URI must be set in CI");

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5_000 });
  await client.connect();
  const db = client.db(`noor_test_${randomUUID().replace(/-/g, "").slice(0, 12)}`);

  const dir = path.join(process.cwd(), "migrations");
  const files = readdirSync(dir)
    .filter((file) => /^\d+_.+\.mjs$/.test(file))
    .sort();
  for (const file of files) {
    const migration = await import(/* @vite-ignore */ pathToFileURL(path.join(dir, file)).href);
    await migration.up(db);
  }

  return {
    db,
    uri,
    async cleanup() {
      await db.dropDatabase();
      await client.close();
    },
  };
}
