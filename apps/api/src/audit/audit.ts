import type { Db } from "mongodb";

export interface AuditEventInput {
  actorType: string;
  actorId: string | null;
  action: string;
  resourceType?: string;
  resourceId?: string;
  familyId?: string | null;
  requestId?: string;
  /** Primitive values only, and never personal content (names, notes, audio). Ids only. */
  metadata?: Record<string, string | number | boolean | null>;
}

export interface AuditLog {
  record(event: AuditEventInput): Promise<void>;
}

/** Insert-only. There is deliberately no update or delete (see ADR-0003). */
export function createAuditLog(db: Db): AuditLog {
  return {
    async record(event) {
      await db.collection("audit_events").insertOne({
        occurredAt: new Date(),
        actorType: event.actorType,
        actorId: event.actorId,
        action: event.action,
        resourceType: event.resourceType ?? null,
        resourceId: event.resourceId ?? null,
        familyId: event.familyId ?? null,
        requestId: event.requestId ?? null,
        metadata: event.metadata ?? {},
      });
    },
  };
}
