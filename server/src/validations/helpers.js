import { z } from "zod";

export const text = (label) =>
  z.string({
    error: (issue) =>
      issue.input === undefined ? `${label} is required` : `${label} must be text`,
  });

export const objectId = (label) => text(label).regex(/^[0-9a-fA-F]{24}$/, `${label} is not valid`);
