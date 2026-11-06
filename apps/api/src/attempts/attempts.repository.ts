import type { AiResult, RecitationLevel } from "@noor/contracts";
import type { Db } from "mongodb";
import type { AiFailure } from "../ai/ai-client.js";
import type { FamilyScope } from "../children/children.repository.js";

/** Attempts are child data: every method takes a family scope (ADR-0003). */
export interface AttemptView {
  id: string;
  childId: string;
  surah: number;
  ayah: number;
  level: RecitationLevel;
  /** False for quality rejections, which are not attempts (VAL-014). */
  counted: boolean;
  result: AiResult;
  createdAt: Date;
}

interface AttemptDoc extends Omit<AttemptView, "id"> {
  _id: string;
  familyId: string;
  aiFailure: AiFailure | null;
}

const toView = (doc: AttemptDoc): AttemptView => ({
  id: doc._id,
  childId: doc.childId,
  surah: doc.surah,
  ayah: doc.ayah,
  level: doc.level,
  counted: doc.counted,
  result: doc.result,
  createdAt: doc.createdAt,
});

export function createAttemptsRepository(db: Db) {
  const attempts = () => db.collection<AttemptDoc>("attempts");

  return {
    async create(
      scope: FamilyScope,
      input: {
        id: string;
        childId: string;
        surah: number;
        ayah: number;
        level: RecitationLevel;
        result: AiResult;
        aiFailure: AiFailure | null;
      },
    ): Promise<AttemptView> {
      const doc: AttemptDoc = {
        _id: input.id,
        familyId: scope.familyId,
        childId: input.childId,
        surah: input.surah,
        ayah: input.ayah,
        level: input.level,
        counted: input.result.quality === "ok",
        result: input.result,
        aiFailure: input.aiFailure,
        createdAt: new Date(),
      };
      await attempts().insertOne(doc);
      return toView(doc);
    },

    async find(scope: FamilyScope, attemptId: string): Promise<AttemptView | null> {
      const doc = await attempts().findOne({ _id: attemptId, familyId: scope.familyId });
      return doc ? toView(doc) : null;
    },
  };
}

export type AttemptsRepository = ReturnType<typeof createAttemptsRepository>;
