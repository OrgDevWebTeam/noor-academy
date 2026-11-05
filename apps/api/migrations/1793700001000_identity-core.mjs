// Minimal identity and family collections (starting point; owners Mohammad / Osama extend it).
// Rules (ADR-0003): ids are random UUID strings, child-owned data carries familyId, and every
// query goes through a repository that requires an access scope.

const ROLES = ["parent", "teacher", "content_admin", "platform_admin"];

export async function up(db) {
  await db.createCollection("users", {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["subject", "roles", "status", "createdAt"],
        properties: {
          _id: { bsonType: "string" },
          subject: { bsonType: "string" },
          roles: { bsonType: "array", items: { enum: ROLES } },
          familyId: { bsonType: ["string", "null"] },
          status: { enum: ["active", "disabled"] },
          createdAt: { bsonType: "date" },
        },
      },
    },
    validationLevel: "strict",
    validationAction: "error",
  });
  // One internal user per identity-provider subject; guards against duplicate first logins.
  await db.collection("users").createIndex({ subject: 1 }, { unique: true, name: "users_subject" });

  await db.createCollection("families", {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["ownerUserId", "createdAt"],
        properties: {
          _id: { bsonType: "string" },
          ownerUserId: { bsonType: "string" },
          createdAt: { bsonType: "date" },
        },
      },
    },
    validationLevel: "strict",
    validationAction: "error",
  });
  await db.collection("families").createIndex({ ownerUserId: 1 }, { name: "families_owner" });

  await db.createCollection("children", {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["familyId", "displayName", "birthYear", "pinFailures", "createdAt"],
        properties: {
          _id: { bsonType: "string" },
          familyId: { bsonType: "string" },
          displayName: { bsonType: "string" },
          birthYear: { bsonType: ["int", "long", "double"] },
          pinHash: { bsonType: ["string", "null"] },
          pinFailures: { bsonType: ["int", "long", "double"] },
          pinLockedUntil: { bsonType: ["date", "null"] },
          createdAt: { bsonType: "date" },
        },
      },
    },
    validationLevel: "strict",
    validationAction: "error",
  });
  await db
    .collection("children")
    .createIndex({ familyId: 1, createdAt: 1 }, { name: "children_family" });

  await db.createCollection("teacherAssignments", {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["teacherId", "childId", "familyId", "status", "createdAt"],
        properties: {
          _id: { bsonType: "string" },
          teacherId: { bsonType: "string" },
          childId: { bsonType: "string" },
          familyId: { bsonType: "string" },
          status: { enum: ["active", "revoked"] },
          createdAt: { bsonType: "date" },
          revokedAt: { bsonType: ["date", "null"] },
        },
      },
    },
    validationLevel: "strict",
    validationAction: "error",
  });
  const assignments = db.collection("teacherAssignments");
  // At most one ACTIVE assignment per teacher and child.
  await assignments.createIndex(
    { teacherId: 1, childId: 1 },
    {
      unique: true,
      name: "assignments_active_pair",
      partialFilterExpression: { status: "active" },
    },
  );
  await assignments.createIndex({ teacherId: 1, status: 1 }, { name: "assignments_teacher" });
}

export async function down(db) {
  for (const name of ["teacherAssignments", "children", "families", "users"]) {
    await db.collection(name).drop();
  }
}
