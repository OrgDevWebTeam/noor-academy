import { randomUUID } from "node:crypto";
import type { Role } from "@noor/contracts";
import type { Db } from "mongodb";
import type { UserLookup, UserRecord } from "../auth/middleware.js";

interface UserDoc {
  _id: string;
  subject: string;
  roles: Role[];
  familyId: string | null;
  status: "active" | "disabled";
  createdAt: Date;
}

interface FamilyDoc {
  _id: string;
  ownerUserId: string;
  createdAt: Date;
}

export function isDuplicateKey(error: unknown): boolean {
  return (
    typeof error === "object" && error !== null && (error as { code?: unknown }).code === 11000
  );
}

const toRecord = (doc: UserDoc): UserRecord => ({
  id: doc._id,
  roles: doc.roles,
  familyId: doc.familyId,
  status: doc.status,
});

export function createUsersRepository(db: Db): UserLookup {
  const users = () => db.collection<UserDoc>("users");
  const families = () => db.collection<FamilyDoc>("families");

  return {
    async findOrProvisionParent(subject) {
      const existing = await users().findOne({ subject });
      if (existing) return toRecord(existing);

      // Only parents self-provision. Staff accounts are created by an administrator.
      const userId = randomUUID();
      const familyId = randomUUID();
      const now = new Date();
      await families().insertOne({ _id: familyId, ownerUserId: userId, createdAt: now });
      try {
        await users().insertOne({
          _id: userId,
          subject,
          roles: ["parent"],
          familyId,
          status: "active",
          createdAt: now,
        });
        return { id: userId, roles: ["parent"], familyId, status: "active" };
      } catch (error) {
        // Lost a race with a concurrent first login: discard our family, use the winner's user.
        await families().deleteOne({ _id: familyId });
        if (isDuplicateKey(error)) {
          const winner = await users().findOne({ subject });
          if (winner) return toRecord(winner);
        }
        throw error;
      }
    },
  };
}
