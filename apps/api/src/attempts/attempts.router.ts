import { randomUUID } from "node:crypto";
import { RECITATION_LEVELS } from "@noor/contracts";
import { Router, type RequestHandler, type Response } from "express";
import multer from "multer";
import { z } from "zod";
import type { AiClient } from "../ai/ai-client.js";
import { getAuth, requirePermission } from "../auth/middleware.js";
import type { AuthContext } from "../auth/types.js";
import type { ChildrenRepository, FamilyScope } from "../children/children.repository.js";
import { wrap } from "../common/async-handler.js";
import { uuidParam } from "../common/params.js";
import type { AttemptsRepository } from "./attempts.repository.js";

/** Same limit as the AI service (VAL-016). */
export const MAX_AUDIO_BYTES = 5 * 1024 * 1024;

/** The 5 prototype surahs and their ayah counts (CRS v3.0: 25 ayat). */
export const PROTOTYPE_AYAT: Readonly<Record<number, number>> = {
  1: 7,
  108: 3,
  112: 4,
  113: 5,
  114: 6,
};

const fieldsSchema = z
  .object({
    childId: z.string().uuid(),
    surah: z.coerce.number().int(),
    ayah: z.coerce.number().int().min(1),
    level: z.enum(RECITATION_LEVELS),
  })
  .strict()
  .refine((f) => f.ayah <= (PROTOTYPE_AYAT[f.surah] ?? 0), {
    message: "not one of the prototype ayat",
    path: ["ayah"],
  });

function familyScope(auth: AuthContext): FamilyScope | null {
  return auth.roles.includes("parent") && auth.familyId
    ? { kind: "family", familyId: auth.familyId }
    : null;
}

const notFound = (res: Response): void => {
  res.status(404).json({ error: "not_found" });
};

/** Audio stays in memory: it is only forwarded to the AI service, never stored here yet. */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AUDIO_BYTES, files: 1, fields: 10 },
}).single("audio");

const parseUpload: RequestHandler = (req, res, next) => {
  upload(req, res, (error: unknown) => {
    if (!error) return next();
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      res.status(413).json({ error: "payload_too_large" });
      return;
    }
    res.status(400).json({ error: "bad_request" });
  });
};

export function attemptsRouter(deps: {
  attempts: AttemptsRepository;
  children: ChildrenRepository;
  ai: AiClient;
}): Router {
  const { attempts, children, ai } = deps;
  const router = Router();

  // POST /v1/attempts (multipart): audio + childId, surah, ayah, level.
  // Flow: check child -> AI service -> zod contract check -> save in MongoDB -> return result.
  router.post(
    "/",
    requirePermission("attempt:create"),
    parseUpload,
    wrap(async (req, res) => {
      const scope = familyScope(getAuth(req));
      if (!scope) {
        res.status(403).json({ error: "forbidden" });
        return;
      }
      const fields = fieldsSchema.safeParse(req.body);
      if (!fields.success) {
        res.status(400).json({
          error: "validation_failed",
          issues: fields.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        });
        return;
      }
      const file = req.file;
      if (!file || file.size === 0 || !file.mimetype.startsWith("audio/")) {
        res.status(400).json({
          error: "validation_failed",
          issues: [{ path: "audio", message: "an audio file is required" }],
        });
        return;
      }
      const { childId, surah, ayah, level } = fields.data;
      // Same 404 for "missing" and "another family's child".
      if (!(await children.find(scope, childId))) return notFound(res);

      const attemptId = randomUUID();
      const { result, failure } = await ai.analyzeRecitation({
        attemptId,
        surah,
        ayah,
        level,
        audio: { buffer: file.buffer, mimeType: file.mimetype, fileName: "recording" },
      });
      if (failure)
        req.log?.warn({ attemptId, aiFailure: failure }, "AI service failed; saved as uncertain");

      const attempt = await attempts.create(scope, {
        id: attemptId,
        childId,
        surah,
        ayah,
        level,
        result,
        aiFailure: failure,
      });
      res.status(201).json({ attempt });
    }),
  );

  router.get(
    "/:attemptId",
    requirePermission("child:read"),
    wrap(async (req, res) => {
      const scope = familyScope(getAuth(req));
      const attemptId = uuidParam(req, "attemptId");
      if (!scope || !attemptId) return notFound(res);
      const attempt = await attempts.find(scope, attemptId);
      if (!attempt) return notFound(res);
      res.json({ attempt });
    }),
  );

  return router;
}
