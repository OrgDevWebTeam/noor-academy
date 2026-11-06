// Quran recitation attempts and their AI result (Architecture 8.1, contract v3.0).
// Child-owned data: every document carries familyId and is only reached through the
// attempts repository with a family scope (ADR-0003).

const DECISIONS = ["accepted", "error", "uncertain"];
const QUALITIES = ["ok", "silent", "too_short", "too_noisy"];
const LEVELS = ["beginner", "intermediate", "advanced"];

export async function up(db) {
  await db.createCollection("attempts", {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: [
          "familyId",
          "childId",
          "surah",
          "ayah",
          "level",
          "counted",
          "result",
          "createdAt",
        ],
        properties: {
          _id: { bsonType: "string" },
          familyId: { bsonType: "string" },
          childId: { bsonType: "string" },
          surah: { bsonType: ["int", "long", "double"], minimum: 1, maximum: 114 },
          ayah: { bsonType: ["int", "long", "double"], minimum: 1 },
          level: { enum: LEVELS },
          // false for quality rejections: they are not attempts (VAL-014).
          counted: { bsonType: "bool" },
          aiFailure: { bsonType: ["string", "null"] },
          result: {
            bsonType: "object",
            required: ["attemptId", "model", "modelVersion", "decision", "quality", "findings"],
            properties: {
              attemptId: { bsonType: "string" },
              model: { bsonType: "string" },
              modelVersion: { bsonType: "string" },
              decision: { enum: DECISIONS },
              quality: { enum: QUALITIES },
              findings: { bsonType: "array" },
              processingMs: { bsonType: ["int", "long", "double"] },
            },
          },
          createdAt: { bsonType: "date" },
        },
      },
    },
    validationLevel: "strict",
    validationAction: "error",
  });
  await db
    .collection("attempts")
    .createIndex({ familyId: 1, childId: 1, createdAt: -1 }, { name: "attempts_child" });
}

export async function down(db) {
  await db.collection("attempts").drop();
}
