import type { RecitationEvaluationRequest, RecitationEvaluationResult } from "@noor/contracts";

/**
 * The only way the platform talks to an AI model. Implementations (a hosted API, a self-hosted
 * model, the stub) live behind this interface so providers can be swapped without touching
 * product code. Owner: Qussai.
 *
 * The request type carries no child identity by design (see @noor/contracts recitation.ts).
 */
export interface AiProvider {
  /** Stable identifier, matches IDENTIFIER_PATTERN, e.g. "stub". */
  readonly id: string;
  /** Provider model/version label recorded in telemetry. */
  readonly modelVersion: string;
  evaluateRecitation(
    request: RecitationEvaluationRequest,
    options?: { signal?: AbortSignal },
  ): Promise<RecitationEvaluationResult>;
}

/** Failure with a machine-readable code. The message must never contain user content. */
export class ProviderError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly retryable = false,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
