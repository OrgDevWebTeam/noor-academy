// Append-only audit store (architecture 6.2 and 13.2).
// NEVER put child names, audio, notes or other personal content in `metadata`.
// Reference records by id only.
//
// MongoDB has no triggers, so append-only is enforced by (1) the application, which only
// ever inserts, and (2) in deployed environments a database user with insert/find rights
// on this collection and no update/remove rights. See docs/adr/0003-mongodb.md.

const nullableString = { bsonType: ["string", "null"] };

export async function up(db) {
  await db.createCollection("audit_events", {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["occurredAt", "actorType", "action", "metadata"],
        additionalProperties: false,
        properties: {
          _id: {},
          occurredAt: { bsonType: "date" },
          actorType: { bsonType: "string" },
          actorId: nullableString,
          action: { bsonType: "string" },
          resourceType: nullableString,
          resourceId: nullableString,
          familyId: nullableString,
          requestId: nullableString,
          metadata: { bsonType: "object" },
        },
      },
    },
    validationLevel: "strict",
    validationAction: "error",
  });
  const events = db.collection("audit_events");
  await events.createIndex({ occurredAt: -1 }, { name: "audit_occurred_at" });
  await events.createIndex(
    { familyId: 1, occurredAt: -1 },
    { name: "audit_family", partialFilterExpression: { familyId: { $type: "string" } } },
  );
  await events.createIndex(
    { actorId: 1, occurredAt: -1 },
    { name: "audit_actor", partialFilterExpression: { actorId: { $type: "string" } } },
  );
}

export async function down(db) {
  await db.collection("audit_events").drop();
}
