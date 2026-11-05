/**
 * AI result contract v3.0 (docs/contracts/ai-result.md).
 * Source of truth: schemas/recitation_result.schema.json. ai.test.ts fails if these drift from it.
 */

export const AI_DECISIONS = ["accepted", "error", "uncertain"] as const;
export type AiDecision = (typeof AI_DECISIONS)[number];

/** Anything but "ok" is a quality rejection and does not count as an attempt (VAL-014). */
export const AI_QUALITIES = ["ok", "silent", "too_short", "too_noisy"] as const;
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
