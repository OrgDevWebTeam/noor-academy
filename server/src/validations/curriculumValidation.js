import { z } from "zod";
import { DOMAINS } from "../constants/index.js";
import { text } from "./helpers.js";

const domain = z.enum(DOMAINS, {
  error: `Domain must be one of: ${DOMAINS.join(", ")}`,
});

const name = z
  .object(
    {
      ar: text("Arabic name")
        .trim()
        .min(1, "Arabic name is required")
        .max(100, "Arabic name is too long"),
      en: text("English name")
        .trim()
        .min(1, "English name is required")
        .max(100, "English name is too long"),
    },
    { error: "Name must have an Arabic (ar) and English (en) value" },
  )
  .strict();

export const createCompetencySchema = z
  .object({
    domain,
    code: text("Code")
      .trim()
      .min(1, "Code is required")
      .max(30, "Code is too long")
      .regex(/^[A-Za-z0-9_-]+$/, "Code can only use letters, numbers, - and _"),
    name,
  })
  .strict();

export const updateCompetencySchema = z
  .object({ domain, name })
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update",
  });

export const competencyStatusSchema = z
  .object({
    active: z.boolean({ error: "Active must be true or false" }),
  })
  .strict();

export const listCompetenciesQuery = z.object({
  domain: domain.optional(),
  active: z
    .enum(["true", "false"], { error: "Active must be true or false" })
    .transform((value) => value === "true")
    .optional(),
  page: z.coerce.number({ error: "Page must be a number" }).int().min(1).default(1),
  limit: z.coerce
    .number({ error: "Limit must be a number" })
    .int()
    .min(1)
    .max(100, "Limit can be at most 100")
    .default(20),
});
