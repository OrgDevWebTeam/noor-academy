import { z } from "zod";

export const text = (label) =>
  z.string({
    error: (issue) =>
      issue.input === undefined ? `${label} is required` : `${label} must be text`,
  });

export const objectId = (label) => text(label).regex(/^[0-9a-fA-F]{24}$/, `${label} is not valid`);

export const oneOf = (label, values) =>
  z.enum(values, { error: `${label} must be one of: ${values.join(", ")}` });

export const whole = (label, min, max) =>
  z
    .number({
      error: (issue) =>
        issue.input === undefined ? `${label} is required` : `${label} must be a number`,
    })
    .int(`${label} must be a whole number`)
    .min(min, `${label} must be between ${min} and ${max}`)
    .max(max, `${label} must be between ${min} and ${max}`);
