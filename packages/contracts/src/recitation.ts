import { z } from "zod";
import { LOCALES } from "./locale";

/**
 * Quran audio input/output contract between the API and any AI provider.
 *
 * PRIVACY RULES (enforced by `.strict()` schemas and tests):
 *  - No child id, family id, name or any other identity ever crosses this boundary.
 *    Evaluations are identified only by an opaque `evaluationId`.
 *  - Audio is passed by opaque reference (`audioRef`), never inline and never a public URL.
 *  - Results contain machine-readable keys (rule ids, feedback keys), not free-form generated
 *    text, so nothing unreviewed is shown to a child. Wording lives in the reviewed
 *    feedback-language catalog (docs/ai/feedback-language.md).
 *
 * Owners: Ismail (audio schema), Qussai/Ismail (taxonomy ids, feedback keys).
 */

/** Format for rule ids, feedback keys, reason keys and provider ids. */
export const IDENTIFIER_PATTERN = /^[a-z0-9][a-z0-9_.-]{0,63}$/;
export const identifierSchema = z.string().regex(IDENTIFIER_PATTERN);

export const AUDIO_FORMATS = ["wav_pcm16", "webm_opus", "m4a_aac"] as const;
export type AudioFormat = (typeof AUDIO_FORMATS)[number];

// STARTING VALUES (owner: Ismail). Confirm against docs/ai/evaluation-dataset-requirements.md.
export const AUDIO_LIMITS = {
  minDurationMs: 500,
  maxDurationMs: 120_000,
  sampleRatesHz: [16_000, 22_050, 44_100, 48_000],
} as const;

export const recitationEvaluationRequestSchema = z
  .object({
    evaluationId: z.string().uuid(),
    audioRef: z.string().min(1).max(512),
    audio: z
      .object({
        format: z.enum(AUDIO_FORMATS),
        sampleRateHz: z
          .number()
          .int()
          .refine((rate) => (AUDIO_LIMITS.sampleRatesHz as readonly number[]).includes(rate), {
            message: "unsupported sample rate",
          }),
        channels: z.union([z.literal(1), z.literal(2)]),
        durationMs: z
          .number()
          .int()
          .min(AUDIO_LIMITS.minDurationMs)
          .max(AUDIO_LIMITS.maxDurationMs),
      })
      .strict(),
    // Ayah upper bounds per surah need Quran metadata; add that check in the content module.
    target: z
      .object({
        surah: z.number().int().min(1).max(114),
        ayahStart: z.number().int().min(1),
        ayahEnd: z.number().int().min(1),
      })
      .strict()
      .refine((target) => target.ayahEnd >= target.ayahStart, {
        message: "ayahEnd must be >= ayahStart",
        path: ["ayahEnd"],
      }),
    locale: z.enum(LOCALES),
  })
  .strict();
export type RecitationEvaluationRequest = z.infer<typeof recitationEvaluationRequestSchema>;

export const FINDING_SEVERITIES = ["info", "minor", "major"] as const;
export const EVALUATION_STATUSES = ["completed", "low_confidence", "failed"] as const;

export const findingSchema = z
  .object({
    ayah: z.number().int().min(1),
    wordIndex: z.number().int().min(0).nullable(),
    /** Id from the Tajweed taxonomy (docs/ai/tajweed-taxonomy.md). */
    ruleId: identifierSchema,
    severity: z.enum(FINDING_SEVERITIES),
    confidence: z.number().min(0).max(1),
    /** Key into the reviewed feedback-language catalog. */
    feedbackKey: identifierSchema,
  })
  .strict();
export type Finding = z.infer<typeof findingSchema>;

export const recitationEvaluationResultSchema = z
  .object({
    evaluationId: z.string().uuid(),
    status: z.enum(EVALUATION_STATUSES),
    overallConfidence: z.number().min(0).max(1).nullable(),
    findings: z.array(findingSchema).max(200),
    /** Teacher-escalation decision (rules: docs/ai/teacher-escalation-rules.md). */
    escalation: z
      .object({ required: z.boolean(), reasonKey: identifierSchema.nullable() })
      .strict(),
  })
  .strict();
export type RecitationEvaluationResult = z.infer<typeof recitationEvaluationResultSchema>;
