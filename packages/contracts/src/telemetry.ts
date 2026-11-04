import { z } from "zod";
import { LOCALES } from "./locale";
import { identifierSchema } from "./recitation";

/**
 * Evaluation telemetry: one event per AI evaluation, for quality and cost monitoring.
 * Owner: Qussai.
 *
 * PRIVACY: contains no audio, transcript, child/family id or free text. The strict schema
 * rejects any field not listed here, so personal data cannot be added by accident.
 */
export const OUTCOMES = ["success", "low_confidence", "provider_error", "timeout"] as const;

export const evaluationTelemetrySchema = z
  .object({
    evaluationId: z.string().uuid(),
    providerId: identifierSchema,
    modelVersion: z.string().min(1).max(64),
    occurredAt: z.string().datetime(),
    latencyMs: z.number().int().min(0).max(600_000),
    outcome: z.enum(OUTCOMES),
    overallConfidence: z.number().min(0).max(1).nullable(),
    audioDurationMs: z.number().int().min(0),
    locale: z.enum(LOCALES),
    findingsCount: z.number().int().min(0).max(200),
    escalated: z.boolean(),
    errorCode: identifierSchema.nullable(),
  })
  .strict();
export type EvaluationTelemetry = z.infer<typeof evaluationTelemetrySchema>;
