import { z } from "zod";
import { AGE_BANDS, DOMAINS, LANGUAGES } from "../constants/index.js";
import { text, objectId, oneOf, whole } from "./helpers.js";

const TYPES = ["lesson", "story", "activity", "quran_task"];
const STATUSES = ["draft", "in_review", "published", "archived"];

const contentFields = {
  title: text("Title").trim().min(1, "Title is required").max(200, "Title is too long"),
  type: oneOf("Type", TYPES),
  description: text("Description").trim().max(2000, "Description is too long"),
  ageBand: oneOf("Age band", AGE_BANDS),
  language: oneOf("Language", LANGUAGES),
  domain: oneOf("Domain", DOMAINS),
  level: whole("Level", 1, 5),
  estimatedMinutes: whole("Estimated minutes", 1, 240),
  competencies: z
    .array(objectId("Competency id"), { error: "Competencies must be a list" })
    .max(20, "At most 20 competencies"),
  reviewRequired: z.boolean({ error: "Review required must be true or false" }),
};

export const createContentSchema = z
  .object(contentFields)
  .partial()
  .extend({
    title: contentFields.title,
    type: contentFields.type,
    ageBand: contentFields.ageBand,
    domain: contentFields.domain,
    level: contentFields.level,
    estimatedMinutes: contentFields.estimatedMinutes,
  })
  .strict();

export const updateContentSchema = z
  .object(contentFields)
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update",
  });

export const listContentQuery = z.object({
  type: oneOf("Type", TYPES).optional(),
  ageBand: oneOf("Age band", AGE_BANDS).optional(),
  language: oneOf("Language", LANGUAGES).optional(),
  domain: oneOf("Domain", DOMAINS).optional(),
  status: oneOf("Status", STATUSES).optional(),
  page: z.coerce.number({ error: "Page must be a number" }).int().min(1).default(1),
  limit: z.coerce
    .number({ error: "Limit must be a number" })
    .int()
    .min(1)
    .max(100, "Limit can be at most 100")
    .default(20),
});
