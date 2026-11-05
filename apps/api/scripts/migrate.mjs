import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { MongoClient } from "mongodb";

const direction = process.argv[2] === "down" ? "down" : "up";
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;
const appEnv = process.env.APP_ENV;

if (!uri || !dbName) {
  console.error("MONGODB_URI and MONGODB_DB must be set.");
  process.exit(1);
}

// Rolling back is a local/development tool only.
if (direction === "down" && (appEnv === "staging" || appEnv === "production")) {
  console.error(`Refusing to run "down" migrations when APP_ENV=${appEnv}.`);
  process.exit(1);
}

const dir = fileURLToPath(new URL("../migrations", import.meta.url));
const files = (await readdir(dir)).filter((file) => /^\d+_.+\.mjs$/.test(file)).sort();

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });

try {
  await client.connect();
  const db = client.db(dbName);
  const applied = db.collection("_migrations");
  await applied.createIndex({ name: 1 }, { unique: true });
  const done = new Set((await applied.find().toArray()).map((doc) => doc.name));

  const load = (file) => import(pathToFileURL(path.join(dir, file)).href);

  if (direction === "up") {
    let count = 0;
    for (const file of files) {
      if (done.has(file)) continue;
      const migration = await load(file);
      await migration.up(db);
      await applied.insertOne({ name: file, appliedAt: new Date() });
      console.warn(`applied ${file}`);
      count += 1;
    }
    if (count === 0) console.warn("nothing to apply");
  } else {
    const last = [...files].reverse().find((file) => done.has(file));
    if (!last) {
      console.warn("nothing to roll back");
    } else {
      const migration = await load(last);
      await migration.down(db);
      await applied.deleteOne({ name: last });
      console.warn(`rolled back ${last}`);
    }
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await client.close();
}
