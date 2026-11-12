import { z } from "zod";

/**
 * AI result contract v3.0 (docs/contracts/ai-result.md).
 * Source of truth: schemas/recitation_result.schema.json. ai.test.ts fails if these drift from it.
 */

export const AI_DECISIONS = ["accepted", "error", "uncertain"] as const;
export type AiDecision = (typeof AI_DECISIONS)[number];

/** Anything but "ok" is a quality rejection and does not count as an attempt (VAL-014). */
export const AI_QUALITIES = ["ok", "silent", "too_short", "too_noisy", "too_long"] as const;
export type AiQuality = (typeof AI_QUALITIES)[number];

export const AI_CATEGORIES = ["memorization", "pronunciation", "tajweed", "technical"] as const;
export type AiCategory = (typeof AI_CATEGORIES)[number];

/** Noor error codes (Ismail's taxonomy). The prefix matches the category. */
export const AI_ERROR_CODES = [
  "ERR_MEM_OMISSION",
  "ERR_MEM_SUBSTITUTION",
  "ERR_MEM_INSERTION",
  "ERR_PRON_LETTER_SUB",
  "ERR_PRON_HARAKA",
  "ERR_PRON_MADD_ASLI_SHORT",
  "ERR_TAJ_MADD_SHORT",
  "ERR_TAJ_GHONNA_OMIT",
  "ERR_TAJ_QALQALA_OMIT",
  "ERR_TAJ_UNMAPPED",
  "ERR_TECH_MODELS_DISAGREE",
] as const;
export type AiErrorCode = (typeof AI_ERROR_CODES)[number];

export const RECITATION_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type RecitationLevel = (typeof RECITATION_LEVELS)[number];

export interface AiFinding {
  /** 1 = first word of the ayah. */
  wordIndex: number;
  category: AiCategory;
  code: AiErrorCode;
  /** 0 to 1. */
  confidence: number;
  /** Segment of the reference recitation to replay. */
  wordStartMs: number;
  wordEndMs: number;
  /** Key in safe_messages_v1_1.json. Model text is never shown to a child. */
  messageKey: string;
}

export interface AiResult {
  attemptId: string;
  /** "none" means the API made a fallback result because the AI service failed. */
  model: string;
  modelVersion: string;
  decision: AiDecision;
  quality: AiQuality;
  findings: AiFinding[];
  processingMs: number;
}

/** The result the API saves when the AI service is down, slow or invalid (Architecture 8.5). */
export const aiFallbackResult = (attemptId: string, processingMs: number): AiResult => ({
  attemptId,
  model: "none",
  modelVersion: "none",
  decision: "uncertain",
  quality: "ok",
  findings: [],
  processingMs,
});

const CATEGORY_PREFIX: Record<AiCategory, string> = {
  memorization: "ERR_MEM_",
  pronunciation: "ERR_PRON_",
  tajweed: "ERR_TAJ_",
  technical: "ERR_TECH_",
};

export const aiFindingSchema = z
  .object({
    wordIndex: z.number().int().min(1),
    category: z.enum(AI_CATEGORIES),
    code: z.enum(AI_ERROR_CODES),
    confidence: z.number().min(0).max(1),
    wordStartMs: z.number().int().min(0),
    wordEndMs: z.number().int().min(0),
    messageKey: z.string().regex(/^FEEDBACK_[A-Z_]+$/),
  })
  .strict()
  .refine((f) => f.code.startsWith(CATEGORY_PREFIX[f.category]), {
    message: "code does not match category",
  })
  .refine((f) => f.wordEndMs >= f.wordStartMs, { message: "wordEndMs is before wordStartMs" });

/** The one zod check the API runs on every AI service response (Architecture 8.3). */
export const aiResultSchema = z
  .object({
    attemptId: z.string().min(1),
    model: z.string().min(1),
    modelVersion: z.string().min(1),
    decision: z.enum(AI_DECISIONS),
    quality: z.enum(AI_QUALITIES),
    findings: z.array(aiFindingSchema),
    processingMs: z.number().int().min(0),
  })
  .strict()
  .refine((r) => r.quality === "ok" || (r.decision === "uncertain" && r.findings.length === 0), {
    message: "a quality rejection must be uncertain with no findings",
  });
