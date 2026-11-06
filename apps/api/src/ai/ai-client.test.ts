import { describe, expect, it } from "vitest";
import { type RecitationRequest, createAiClient } from "./ai-client.js";

const request: RecitationRequest = {
  attemptId: "attempt-1",
  surah: 1,
  ayah: 1,
  level: "beginner",
  audio: { buffer: Buffer.from("fake audio"), mimeType: "audio/webm", fileName: "recording" },
};

const validResult = {
  attemptId: "attempt-1",
  model: "mock",
  modelVersion: "0.2",
  decision: "accepted",
  quality: "ok",
  findings: [],
  processingMs: 4,
};

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

const client = (fetchFn: typeof fetch, timeoutMs = 1_000) =>
  createAiClient({ baseUrl: "http://ai.internal:8000", timeoutMs, fetchFn });

describe("AI client", () => {
  it("sends only the contract fields and returns a valid result", async () => {
    let sent: FormData | undefined;
    let calledUrl = "";
    const ai = client((url, init) => {
      calledUrl = String(url);
      sent = init?.body as FormData;
      return json(validResult);
    });

    const outcome = await ai.analyzeRecitation(request);

    expect(outcome).toEqual({ result: validResult, failure: null });
    expect(calledUrl).toBe("http://ai.internal:8000/v1/recitation/analyze");
    expect([...sent!.keys()].sort()).toEqual(["attemptId", "audio", "ayah", "level", "surah"]);
  });

  it.each([
    ["a 500 response", () => json({ error: "boom" }, 500), "bad_status"],
    [
      "a result that breaks the contract",
      () => json({ ...validResult, decision: "maybe" }),
      "invalid_result",
    ],
    [
      "a result for another attempt",
      () => json({ ...validResult, attemptId: "other" }),
      "invalid_result",
    ],
    ["a body that is not JSON", () => Promise.resolve(new Response("<html>")), "invalid_result"],
    ["a connection error", () => Promise.reject(new TypeError("fetch failed")), "unreachable"],
  ] as const)("falls back to uncertain on %s", async (_name, fetchFn, failure) => {
    const outcome = await client(fetchFn as unknown as typeof fetch).analyzeRecitation(request);
    expect(outcome.failure).toBe(failure);
    expect(outcome.result).toMatchObject({
      attemptId: "attempt-1",
      model: "none",
      decision: "uncertain",
      quality: "ok",
      findings: [],
    });
  });

  it("falls back to uncertain when the AI service is too slow", async () => {
    const slow: typeof fetch = (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
      });
    const outcome = await client(slow, 100).analyzeRecitation(request);
    expect(outcome.failure).toBe("timeout");
    expect(outcome.result.decision).toBe("uncertain");
  });
});
