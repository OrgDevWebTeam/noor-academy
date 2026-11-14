import { z } from "zod";
import { LANGUAGES } from "../constants/index.js";
import { text } from "./helpers.js";

const level = (label) =>
  z
    .number({
      error: (issue) =>
        issue.input === undefined ? `${label} is required` : `${label} must be a number`,
    })
    .int(`${label} must be a whole number`)
    .min(0, `${label} must be between 0 and 5`)
    .max(5, `${label} must be between 0 and 5`);

const list = (label, itemMax) =>
  z
    .array(
      text(label).trim().min(1, `${label} cannot be empty`).max(itemMax, `${label} is too long`),
      { error: `${label} must be a list` },
    )
    .max(20, `${label} can have at most 20 items`);

const childFields = {
  name: text("Name")
    .trim()
    .min(1, "Name is required")
    .max(40, "Name must be at most 40 characters"),
  dateOfBirth: z.iso.date({
    error: (issue) =>
      issue.input === undefined
        ? "Date of birth is required"
        : "Date of birth must look like 2018-03-15",
  }),
  country: text("Country").trim().max(60, "Country must be at most 60 characters"),
  homeLanguage: z.enum(LANGUAGES, {
    error: `Home language must be one of: ${LANGUAGES.join(", ")}`,
  }),
  interests: list("Interest", 50),
  learningGoals: list("Learning goal", 100),
  arabicLevel: level("Arabic level"),
  quranLevel: level("Quran level"),
  preferredSchedule: text("Preferred schedule")
    .trim()
    .max(200, "Preferred schedule must be at most 200 characters"),
};

export const createChildSchema = z
  .object(childFields)
  .partial()
  .extend({
    name: childFields.name,
    dateOfBirth: childFields.dateOfBirth,
  })
  .strict();

export const updateChildSchema = z
  .object(childFields)
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update",
  });
