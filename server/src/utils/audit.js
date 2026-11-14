import AuditEvent from "../Models/AuditEvent.js";

export const AUDIT_ACTIONS = Object.freeze([
  "consent.granted",
  "consent.withdrawn",
  "role.changed",
  "user.suspended",
  "content.published",
  "child.data_accessed",
  "access.denied",
]);

export async function recordAudit({ actor, action, target, result = "success", meta }) {
  if (!AUDIT_ACTIONS.includes(action)) {
    throw new Error(`Unknown audit action: ${action}`);
  }

  return AuditEvent.create({
    actorId: actor?._id,
    actorRole: actor?.role,
    targetType: target?.type,
    targetId: target?.id,
    action,
    result,
    meta,
  });
}
