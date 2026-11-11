import { z } from "zod";

export const text = (label) =>
  z.string({
    error: (issue) =>
      issue.input === undefined ? `${label} is required` : `${label} must be text`,
  });
