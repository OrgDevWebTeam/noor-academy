import mongoose from "mongoose";

const auditEventSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      immutable: true,
    },

    actorRole: { type: String, trim: true, immutable: true },

    targetType: { type: String, trim: true, immutable: true },

    targetId: { type: mongoose.Schema.Types.ObjectId, immutable: true },

    action: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      immutable: true,
    },

    result: {
      type: String,
      enum: ["success", "failure", "denied"],
      required: true,
      immutable: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditEventSchema.pre(
  [
    "updateOne",
    "updateMany",
    "findOneAndUpdate",
    "findOneAndReplace",
    "replaceOne",
  ],
  function () {
    throw new Error("Audit events are append-only and cannot be updated");
  },
);

auditEventSchema.pre("bulkWrite", function (ops) {
  for (const op of ops || []) {
    if (op.updateOne || op.updateMany || op.replaceOne) {
      throw new Error("Audit events are append-only and cannot be updated");
    }
  }
});

auditEventSchema.pre("save", function () {
  if (!this.isNew)
    throw new Error("Audit events are append-only and cannot be updated");
});

auditEventSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
auditEventSchema.index({ actorId: 1, createdAt: -1 });

const AuditEvent = mongoose.model("AuditEvent", auditEventSchema);
export default AuditEvent;
