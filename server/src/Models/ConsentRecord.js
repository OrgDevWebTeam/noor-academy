import mongoose from "mongoose";
import { assertChildInFamily } from "../utils/assertChildInFamily";

const consentRecordSchema = new mongoose.Schema(
  {
    guardianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
    },

    childId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Child",
      required: true,
      immutable: true,
    },

    familyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Family",
      required: true,
      immutable: true,
    },

    status: {
      type: String,
      enum: ["granted", "withdrawn"],
      required: true,
      immutable: true,
    },

    policyVersion: {
      type: String,
      required: true,
      trim: true,
      immutable: true,
    },

    method: {
      type: String,
      enum: ["web_form", "email_link", "admin_recorded"],
      required: true,
      immutable: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

consentRecordSchema.pre("validate", async function () {
  await assertChildInFamily(this);
});

// Newest record first, per child. Makes "what is the latest consent for this child?" fast.
consentRecordSchema.index({ childId: 1, createdAt: -1 });

// Does this child currently have consent? Looks only at the newest record.
consentRecordSchema.statics.hasActiveConsent = async function (childId) {
  const latest = await this.findOne({ childId }).sort({
    createdAt: -1,
    _id: -1,
  });
  if (latest && latest.status === "granted") return true;
  return false;
};

const ConsentRecord = mongoose.model("ConsentRecord", consentRecordSchema);
export default ConsentRecord;
