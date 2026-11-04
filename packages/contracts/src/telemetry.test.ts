import { describe, expect, it } from "vitest";
import { evaluationTelemetrySchema } from "./telemetry";

const event = {
  evaluationId: "7b0a5c52-3e4f-4c1a-9a53-0d9b6f2f8c11",
  providerId: "stub",
  modelVersion: "stub-1",
  occurredAt: "2026-11-04T10:00:00.000Z",
  latencyMs: 120,
  outcome: "success",
  overallConfidence: 0.9,
  audioDurationMs: 8000,
  locale: "ar",
  findingsCount: 0,
  escalated: false,
  errorCode: null,
};

describe("evaluation telemetry", () => {
  it("accepts a valid event", () => {
    expect(evaluationTelemetrySchema.safeParse(event).success).toBe(true);
  });

  it("rejects personal or content fields", () => {
    for (const extra of [{ childId: "x" }, { transcript: "..." }, { audioRef: "a/b" }]) {
      expect(evaluationTelemetrySchema.safeParse({ ...event, ...extra }).success).toBe(false);
    }
  });
});
