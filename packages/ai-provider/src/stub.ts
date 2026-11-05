import type { RecitationEvaluationRequest, RecitationEvaluationResult } from "@noor/contracts";
import { ProviderError, type AiProvider } from "./provider";

export type StubBehavior = "ok" | "low_confidence" | "error";

/**
 * Deterministic fake provider for local development, tests and CI. Makes no network calls
 * and judges nothing. The escalation shown for low confidence is a placeholder, NOT the
 * product rule (that lives in docs/ai/teacher-escalation-rules.md).
 */
export class StubAiProvider implements AiProvider {
  readonly id = "stub";
  readonly modelVersion = "stub-1";

  constructor(private readonly behavior: StubBehavior = "ok") {}

  async evaluateRecitation(
    request: RecitationEvaluationRequest,
  ): Promise<RecitationEvaluationResult> {
    if (this.behavior === "error") {
      throw new ProviderError("stub_error", "Stub provider configured to fail", true);
    }
    if (this.behavior === "low_confidence") {
      return {
        evaluationId: request.evaluationId,
        status: "low_confidence",
        overallConfidence: 0.2,
        findings: [],
        escalation: { required: true, reasonKey: "escalation.low_confidence" },
      };
    }
    return {
      evaluationId: request.evaluationId,
      status: "completed",
      overallConfidence: 0.9,
      findings: [],
      escalation: { required: false, reasonKey: null },
    };
  }
}
