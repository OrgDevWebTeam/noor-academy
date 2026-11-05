import { describe, expect, it } from "vitest";
import { recitationEvaluationRequestSchema, recitationEvaluationResultSchema } from "./recitation";

const request = {
  evaluationId: "7b0a5c52-3e4f-4c1a-9a53-0d9b6f2f8c11",
  audioRef: "audio/abc123",
  audio: { format: "wav_pcm16", sampleRateHz: 16000, channels: 1, durationMs: 8000 },
  target: { surah: 1, ayahStart: 1, ayahEnd: 3 },
  locale: "ar",
};

const result = {
  evaluationId: request.evaluationId,
  status: "completed",
  overallConfidence: 0.9,
  findings: [
    {
      ayah: 1,
      wordIndex: 2,
      ruleId: "example.rule",
      severity: "minor",
      confidence: 0.8,
      feedbackKey: "feedback.example",
    },
  ],
  escalation: { required: false, reasonKey: null },
};

describe("recitation request", () => {
  it("accepts a valid request", () => {
    expect(recitationEvaluationRequestSchema.safeParse(request).success).toBe(true);
  });

  it("rejects identity fields (privacy boundary)", () => {
    expect(recitationEvaluationRequestSchema.safeParse({ ...request, childId: "x" }).success).toBe(
      false,
    );
    expect(recitationEvaluationRequestSchema.safeParse({ ...request, familyId: "x" }).success).toBe(
      false,
    );
  });

  it("rejects ayahEnd before ayahStart", () => {
    const bad = { ...request, target: { surah: 1, ayahStart: 5, ayahEnd: 2 } };
    expect(recitationEvaluationRequestSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects unsupported sample rates and overlong audio", () => {
    const rate = { ...request, audio: { ...request.audio, sampleRateHz: 12345 } };
    const long = { ...request, audio: { ...request.audio, durationMs: 999_999 } };
    expect(recitationEvaluationRequestSchema.safeParse(rate).success).toBe(false);
    expect(recitationEvaluationRequestSchema.safeParse(long).success).toBe(false);
  });
});

describe("recitation result", () => {
  it("accepts a valid result", () => {
    expect(recitationEvaluationResultSchema.safeParse(result).success).toBe(true);
  });

  it("rejects free-form generated text", () => {
    const bad = { ...result, feedbackText: "Great job!" };
    expect(recitationEvaluationResultSchema.safeParse(bad).success).toBe(false);
  });
});
