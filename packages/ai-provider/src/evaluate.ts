import {
  IDENTIFIER_PATTERN,
  recitationEvaluationRequestSchema,
  recitationEvaluationResultSchema,
  type EvaluationTelemetry,
  type RecitationEvaluationResult,
} from "@noor/contracts";
import { ProviderError, type AiProvider } from "./provider";

export interface TelemetrySink {
  record(event: EvaluationTelemetry): void | Promise<void>;
}

export interface EvaluateOptions {
  timeoutMs?: number;
  /** Clock injection for tests. */
  now?: () => number;
}

/**
 * Runs one evaluation through a provider with the platform's safety checks:
 *  1. validates the request (rejects anything carrying identity),
 *  2. enforces a timeout,
 *  3. validates the provider's response and that it belongs to THIS evaluation,
 *  4. emits one privacy-safe telemetry event, whatever the outcome.
 */
export async function evaluateWithTelemetry(
  provider: AiProvider,
  request: unknown,
  sink: TelemetrySink,
  options: EvaluateOptions = {},
): Promise<RecitationEvaluationResult> {
  const parsedRequest = recitationEvaluationRequestSchema.safeParse(request);
  if (!parsedRequest.success) {
    throw new ProviderError("invalid_request", "Request failed validation");
  }
  const req = parsedRequest.data;

  const timeoutMs = options.timeoutMs ?? 30_000;
  const now = options.now ?? Date.now;
  const started = now();

  const emit = async (
    outcome: EvaluationTelemetry["outcome"],
    result: RecitationEvaluationResult | null,
    errorCode: string | null,
  ): Promise<void> => {
    const event: EvaluationTelemetry = {
      evaluationId: req.evaluationId,
      providerId: provider.id,
      modelVersion: provider.modelVersion,
      occurredAt: new Date(now()).toISOString(),
      latencyMs: Math.min(600_000, Math.max(0, now() - started)),
      outcome,
      overallConfidence: result?.overallConfidence ?? null,
      audioDurationMs: req.audio.durationMs,
      locale: req.locale,
      findingsCount: result?.findings.length ?? 0,
      escalated: result?.escalation.required ?? false,
      errorCode:
        errorCode === null
          ? null
          : IDENTIFIER_PATTERN.test(errorCode)
            ? errorCode
            : "unknown_error",
    };
    try {
      await sink.record(event);
    } catch {
      // Telemetry must never break an evaluation.
    }
  };

  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new ProviderError("timeout", "Provider timed out", true));
    }, timeoutMs);
  });

  try {
    const raw = await Promise.race([
      provider.evaluateRecitation(req, { signal: controller.signal }),
      timeout,
    ]);
    const parsedResult = recitationEvaluationResultSchema.safeParse(raw);
    // A result for a different evaluation must never reach the caller (cross-child leak risk).
    if (!parsedResult.success || parsedResult.data.evaluationId !== req.evaluationId) {
      throw new ProviderError("invalid_response", "Provider response failed validation");
    }
    const result = parsedResult.data;
    if (result.status === "completed") {
      await emit("success", result, null);
    } else if (result.status === "low_confidence") {
      await emit("low_confidence", result, null);
    } else {
      await emit("provider_error", result, "provider_reported_failure");
    }
    return result;
  } catch (error) {
    const providerError =
      error instanceof ProviderError
        ? error
        : new ProviderError("unexpected_error", "Unexpected provider failure");
    await emit(
      providerError.code === "timeout" ? "timeout" : "provider_error",
      null,
      providerError.code,
    );
    throw providerError;
  } finally {
    clearTimeout(timer);
  }
}
