import { z } from "zod";
import { text, objectId } from "./helpers.js";

export const createConsentSchema = z
  .object({
    childId: objectId("Child id"),
    status: z.enum(["granted", "withdrawn"], {
      error: "Status must be granted or withdrawn",
    }),
    policyVersion: text("Policy version")
      .trim()
      .min(1, "Policy version is required")
      .max(50, "Policy version is too long"),
  })
  .strict();
