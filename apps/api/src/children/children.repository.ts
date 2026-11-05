import { randomUUID } from "node:crypto";
import type { Db, Filter } from "mongodb";

/**
 * FAMILY ISOLATION (architecture 6.2, ADR-0003). MongoDB has no row-level security, so this
 * repository is the single gate to child data. Every method takes an AccessScope, and there is
 * no way to query children without one. Never add a method that skips it.
 */
export interface FamilyScope {
  kind: "family";
  familyId: string;
}
export interface TeacherScope {
  kind: "teacher";
  teacherId: string;
}
export type AccessScope = FamilyScope | TeacherScope;

export const MAX_PIN_FAILURES = 5;
export const PIN_LOCK_MS = 15 * 60_000;

interface ChildDoc {
  _id: string;
  familyId: string;
  displayName: string;
  birthYear: number;
  pinHash: string | null;
  pinFailures: number;
  pinLockedUntil: Date | null;
  createdAt: Date;
}

interface AssignmentDoc {
  _id: string;
  teacherId: string;
  childId: string;
  familyId: string;
  status: "active" | "revoked";
  createdAt: Date;
}

/** What leaves the repository. Never includes the PIN hash. */
export interface ChildView {
  id: string;
  displayName: string;
  birthYear: number;
  hasPin: boolean;
  createdAt: Date;
}

export interface PinState {
  pinHash: string | null;
  pinLockedUntil: Date | null;
}

const toView = (doc: ChildDoc): ChildView => ({
  id: doc._id,
  displayName: doc.displayName,
  birthYear: doc.birthYear,
  hasPin: doc.pinHash !== null,
  createdAt: doc.createdAt,
});

export function createChildrenRepository(db: Db) {
  const children = () => db.collection<ChildDoc>("children");
  const assignments = () => db.collection<AssignmentDoc>("teacherAssignments");

  /** The only place a visibility filter is built. Null means the scope can see nothing. */
  async function scopeFilter(scope: AccessScope): Promise<Filter<ChildDoc> | null> {
    if (scope.kind === "family") return { familyId: scope.familyId };
    const active = await assignments()
      .find({ teacherId: scope.teacherId, status: "active" })
      .toArray();
    if (active.length === 0) return null;
    return { $or: active.map((a) => ({ _id: a.childId, familyId: a.familyId })) };
  }

  return {
    async list(scope: AccessScope): Promise<ChildView[]> {
      const filter = await scopeFilter(scope);
      if (!filter) return [];
      const docs = await children().find(filter).sort({ createdAt: 1 }).limit(200).toArray();
      return docs.map(toView);
    },

    async find(scope: AccessScope, childId: string): Promise<ChildView | null> {
      const filter = await scopeFilter(scope);
      if (!filter) return null;
      const doc = await children().findOne({ $and: [filter, { _id: childId }] });
      return doc ? toView(doc) : null;
    },

    async create(
      scope: FamilyScope,
      input: { displayName: string; birthYear: number },
    ): Promise<ChildView> {
      const doc: ChildDoc = {
        _id: randomUUID(),
        familyId: scope.familyId,
        displayName: input.displayName,
        birthYear: input.birthYear,
        pinHash: null,
        pinFailures: 0,
        pinLockedUntil: null,
        createdAt: new Date(),
      };
      await children().insertOne(doc);
      return toView(doc);
    },

    async setPin(scope: FamilyScope, childId: string, pinHash: string): Promise<boolean> {
      const result = await children().updateOne(
        { _id: childId, familyId: scope.familyId },
        { $set: { pinHash, pinFailures: 0, pinLockedUntil: null } },
      );
      return result.matchedCount > 0;
    },

    async getPinState(scope: FamilyScope, childId: string): Promise<PinState | null> {
      const doc = await children().findOne({ _id: childId, familyId: scope.familyId });
      return doc ? { pinHash: doc.pinHash, pinLockedUntil: doc.pinLockedUntil } : null;
    },

    async recordPinSuccess(scope: FamilyScope, childId: string): Promise<void> {
      await children().updateOne(
        { _id: childId, familyId: scope.familyId },
        { $set: { pinFailures: 0, pinLockedUntil: null } },
      );
    },

    /** Counts a wrong attempt and locks the PIN after MAX_PIN_FAILURES. */
    async recordPinFailure(
      scope: FamilyScope,
      childId: string,
      now: Date,
    ): Promise<{ locked: boolean }> {
      const filter = { _id: childId, familyId: scope.familyId };
      await children().updateOne(filter, { $inc: { pinFailures: 1 } });
      const doc = await children().findOne(filter);
      if (doc && doc.pinFailures >= MAX_PIN_FAILURES) {
        await children().updateOne(filter, {
          $set: { pinLockedUntil: new Date(now.getTime() + PIN_LOCK_MS), pinFailures: 0 },
        });
        return { locked: true };
      }
      return { locked: false };
    },
  };
}

export type ChildrenRepository = ReturnType<typeof createChildrenRepository>;
