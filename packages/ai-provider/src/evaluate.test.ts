import { evaluationTelemetrySchema, type EvaluationTelemetry } from "@noor/contracts";
import { describe, expect, it } from "vitest";
import { evaluateWithTelemetry, type TelemetrySink } from "./evaluate";
import { ProviderError, type AiProvider } from "./provider";
import { StubAiProvider } from "./stub";

const request = {
  evaluationId: "7b0a5c52-3e4f-4c1a-9a53-0d9b6f2f8c11",
  audioRef: "audio/abc123",
  audio: { format: "wav_pcm16", sampleRateHz: 16000, channels: 1, durationMs: 8000 },
  target: { surah: 1, ayahStart: 1, ayahEnd: 3 },
  locale: "ar",
};

class CollectingSink implements TelemetrySink {
  events: EvaluationTelemetry[] = [];
  record(event: EvaluationTelemetry): void {
    this.events.push(event);
  }
}

const providerReturning = (result: unknown): AiProvider => ({
  id: "fake",
  modelVersion: "v1",
  evaluateRecitation: () => Promise.resolve(result as never),
});

describe("evaluateWithTelemetry", () => {
  it("returns the result and emits one valid success event", async () => {
    const sink = new CollectingSink();
    const result = await evaluateWithTelemetry(new StubAiProvider("ok"), request, sink);
    expect(result.status).toBe("completed");
    expect(sink.events).toHaveLength(1);
    expect(evaluationTelemetrySchema.safeParse(sink.events[0]).success).toBe(true);
    expect(sink.events[0]?.outcome).toBe("success");
  });

  it("maps low confidence and records the escalation", async () => {
    const sink = new CollectingSink();
    await evaluateWithTelemetry(new StubAiProvider("low_confidence"), request, sink);
    expect(sink.events[0]?.outcome).toBe("low_confidence");
    expect(sink.events[0]?.escalated).toBe(true);
  });

  it("records provider errors with a code and rethrows", async () => {
    const sink = new CollectingSink();
    await expect(
      evaluateWithTelemetry(new StubAiProvider("error"), request, sink),
    ).rejects.toMatchObject({ code: "stub_error" });
    expect(sink.events[0]?.outcome).toBe("provider_error");
    expect(sink.events[0]?.errorCode).toBe("stub_error");
  });

  it("times out a slow provider", async () => {
    const sink = new CollectingSink();
    const slow: AiProvider = {
      id: "slow",
      modelVersion: "v1",
      evaluateRecitation: () => new Promise<never>(() => undefined),
    };
    await expect(
      evaluateWithTelemetry(slow, request, sink, { timeoutMs: 20 }),
    ).rejects.toMatchObject({
      code: "timeout",
    });
    expect(sink.events[0]?.outcome).toBe("timeout");
  });

  it("rejects a response that belongs to a different evaluation", async () => {
    const sink = new CollectingSink();
    const other = {
      evaluationId: "11111111-1111-4111-8111-111111111111",
      status: "completed",
      overallConfidence: 0.9,
      findings: [],
      escalation: { required: false, reasonKey: null },
    };
    await expect(
      evaluateWithTelemetry(providerReturning(other), request, sink),
    ).rejects.toMatchObject({ code: "invalid_response" });
    expect(sink.events[0]?.outcome).toBe("provider_error");
  });

  it("rejects a malformed provider response", async () => {
    const sink = new CollectingSink();
    await expect(
      evaluateWithTelemetry(providerReturning({ nonsense: true }), request, sink),
    ).rejects.toMatchObject({ code: "invalid_response" });
  });

  it("rejects requests carrying identity without calling the provider", async () => {
    const sink = new CollectingSink();
    let called = false;
    const provider: AiProvider = {
      id: "spy",
      modelVersion: "v1",
      evaluateRecitation: () => {
        called = true;
        return Promise.reject(new ProviderError("never", "should not be called"));
      },
    };
    await expect(
      evaluateWithTelemetry(provider, { ...request, childId: "abc" }, sink),
    ).rejects.toMatchObject({ code: "invalid_request" });
    expect(called).toBe(false);
    expect(sink.events).toHaveLength(0);
  });

  it("keeps working when the telemetry sink throws", async () => {
    const failing: TelemetrySink = {
      record: () => {
        throw new Error("sink down");
      },
    };
    const result = await evaluateWithTelemetry(new StubAiProvider("ok"), request, failing);
    expect(result.status).toBe("completed");
  });
});
