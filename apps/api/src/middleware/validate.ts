import type { RequestHandler } from "express";
import type { ZodType } from "zod";

/**
 * Schema-based request validation (architecture 8.1). Use `.strict()` schemas so unknown
 * fields are rejected, e.g.
 *   router.post("/children", validateBody(createChildSchema), handler)
 * Responses list field paths and rules only, never the submitted values.
 */
export function validateBody(schema: ZodType): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: "validation_failed",
        issues: result.error.issues.map((issue) => ({
          path: issue.path.map(String).join("."),
          message: issue.message,
        })),
      });
      return;
    }
    req.body = result.data;
    next();
  };
}
