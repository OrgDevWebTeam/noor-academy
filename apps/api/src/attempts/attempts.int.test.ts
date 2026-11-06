import { randomUUID } from "node:crypto";
import { aiFallbackResult } from "@noor/contracts";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AiClient, AiOutcome, RecitationRequest } from "../ai/ai-client.js";
import { createApp } from "../app.js";
import type { TokenVerifier } from "../auth/types.js";
import { loadEnv } from "../config/env.js";
import { type TestDatabase, createTestDatabase } from "../testing/mongo.js";

const verifier: TokenVerifier = (token) =>
  ["alice", "bob"].includes(token)
    ? Promise.resolve({ subject: token, claims: {} })
    : token === "teacher"
      ? Promise.resolve({ subject: "teacher-1", claims: { amr: ["mfa"] } })
      : Promise.reject(new Error("bad token"));

// Fake AI service: contract-valid mock result, or the fallback when "down".
const seen: RecitationRequest[] = [];
let aiDown = false;
const ai: AiClient = {
  analyzeRecitation(req): Promise<AiOutcome> {
    seen.push(req);
    if (aiDown)
      return Promise.resolve({
        result: aiFallbackResult(req.attemptId, 20_000),
        failure: "timeout",
      });
    return Promise.resolve({
      failure: null,
      result: {
        attemptId: req.attemptId,
        model: "mock",
        modelVersion: "0.2",
        decision: "error",
        quality: "ok",
        findings: [
          {
            wordIndex: 2,
            category: "memorization",
            code: "ERR_MEM_SUBSTITUTION",
            confidence: 0.92,
            wordStartMs: 580,
            wordEndMs: 1409,
            messageKey: "FEEDBACK_WORD_DIFFERENT",
          },
        ],
        processingMs: 12,
      },
    });
  },
};

let t: TestDatabase | undefined;
let app: ReturnType<typeof createApp>;
let aliceChild = "";

const upload = (
  token: string,
  fields: Record<string, string>,
  audio: Buffer | null = Buffer.from("RIFF fake"),
) => {
  let req = request(app).post("/v1/attempts").set("Authorization", `Bearer ${token}`);
  for (const [k, v] of Object.entries(fields)) req = req.field(k, v);
  if (audio) req = req.attach("audio", audio, { filename: "a.webm", contentType: "audio/webm" });
  return req;
};

beforeAll(async () => {
  t = await createTestDatabase();
  const env = loadEnv({
    APP_ENV: "local",
    LOG_LEVEL: "silent",
    MONGODB_URI: t.uri,
    MONGODB_DB: "ignored",
    RATE_LIMIT_PER_MINUTE: "10000",
  });
  app = createApp({ env, database: { db: t.db, ping: () => Promise.resolve() }, verifier, ai });
  await t.db.collection("users").insertOne({
    _id: randomUUID() as never,
    subject: "teacher-1",
    roles: ["teacher"],
    familyId: null,
    status: "active",
    createdAt: new Date(),
  });
  const res = await request(app)
    .post("/v1/children")
    .set("Authorization", "Bearer alice")
    .send({ displayName: "Aya", birthYear: 2018 });
  aliceChild = res.body.child.id as string;
});
afterAll(async () => {
  await t?.cleanup();
});

describe("POST /v1/attempts (week 1 exit gate: API -> AI -> API -> MongoDB)", () => {
  it("sends the audio to the AI service and saves the result in MongoDB", async () => {
    const res = await upload("alice", {
      childId: aliceChild,
      surah: "1",
      ayah: "1",
      level: "beginner",
    });

    expect(res.status).toBe(201);
    const { attempt } = res.body;
    expect(attempt).toMatchObject({ childId: aliceChild, surah: 1, ayah: 1, counted: true });
    expect(attempt.result).toMatchObject({
      attemptId: attempt.id,
      model: "mock",
      decision: "error",
    });

    // No child or family identity crosses to the AI service.
    const sent = seen.at(-1)!;
    expect(Object.keys(sent).sort()).toEqual(["attemptId", "audio", "ayah", "level", "surah"]);
    expect(sent.attemptId).toBe(attempt.id);

    const doc = await t!.db.collection("attempts").findOne({ _id: attempt.id });
    expect(doc).toMatchObject({
      childId: aliceChild,
      aiFailure: null,
      result: { decision: "error" },
    });
    expect(doc?.familyId).toEqual(expect.any(String));

    const read = await request(app)
      .get(`/v1/attempts/${attempt.id}`)
      .set("Authorization", "Bearer alice");
    expect(read.status).toBe(200);
    expect(read.body.attempt.result.findings).toHaveLength(1);
  });

  it("saves an uncertain result when the AI service is down, and the session goes on", async () => {
    aiDown = true;
    try {
      const res = await upload("alice", {
        childId: aliceChild,
        surah: "114",
        ayah: "6",
        level: "beginner",
      });
      expect(res.status).toBe(201);
      expect(res.body.attempt.result).toMatchObject({ model: "none", decision: "uncertain" });
      const doc = await t!.db.collection("attempts").findOne({ _id: res.body.attempt.id });
      expect(doc?.aiFailure).toBe("timeout");
    } finally {
      aiDown = false;
    }
  });

  it("hides another family's child and attempt behind the same 404", async () => {
    const res = await upload("bob", {
      childId: aliceChild,
      surah: "1",
      ayah: "1",
      level: "beginner",
    });
    expect(res.status).toBe(404);

    const own = await upload("alice", {
      childId: aliceChild,
      surah: "112",
      ayah: "1",
      level: "beginner",
    });
    const read = await request(app)
      .get(`/v1/attempts/${own.body.attempt.id}`)
      .set("Authorization", "Bearer bob");
    expect(read.status).toBe(404);
  });

  it("does not let teachers create attempts", async () => {
    const res = await upload("teacher", {
      childId: aliceChild,
      surah: "1",
      ayah: "1",
      level: "beginner",
    });
    expect(res.status).toBe(403);
  });

  it.each([
    ["an ayah outside the 25 prototype ayat", { surah: "2", ayah: "1" }],
    ["an ayah past the end of the surah", { surah: "108", ayah: "4" }],
    ["an unknown level", { level: "expert" }],
    ["an unknown field", { extra: "x" }],
  ])("rejects %s", async (_name, override) => {
    const base = { childId: aliceChild, surah: "1", ayah: "1", level: "beginner" };
    const res = await upload("alice", { ...base, ...override });
    expect(res.status).toBe(400);
  });

  it("rejects a missing, non-audio or too large file", async () => {
    const fields = { childId: aliceChild, surah: "1", ayah: "1", level: "beginner" };
    expect((await upload("alice", fields, null)).status).toBe(400);

    const notAudio = await request(app)
      .post("/v1/attempts")
      .set("Authorization", "Bearer alice")
      .field(fields)
      .attach("audio", Buffer.from("x"), { filename: "a.txt", contentType: "text/plain" });
    expect(notAudio.status).toBe(400);

    const big = await upload("alice", fields, Buffer.alloc(5 * 1024 * 1024 + 1));
    expect(big.status).toBe(413);
  });

  it("requires a token", async () => {
    expect((await request(app).post("/v1/attempts")).status).toBe(401);
  });
});
