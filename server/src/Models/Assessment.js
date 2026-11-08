import mongoose from "mongoose";
import { DOMAINS } from "../constants/index.js";

const itemSchema = new mongoose.Schema(
  {
    itemCode: { type: String, required: true, trim: true, maxlength: 50 },

    response: { type: String, trim: true, maxlength: 500 },

    correct: { type: Boolean, default: null },

    audioRef: { type: String, trim: true, maxlength: 300 },

    answeredAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const assessmentSchema = new mongoose.Schema(
  {
    familyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Family",
      required: true,
      immutable: true,
    },

    childId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Child",
      required: true,
      immutable: true,
    },

    kind: {
      type: String,
      enum: ["baseline", "follow_up"],
      default: "baseline",
      immutable: true,
    },

    domain: {
      type: String,
      enum: DOMAINS,
      required: true,
      immutable: true,
    },

    status: {
      type: String,
      enum: ["in_progress", "completed", "abandoned"],
      default: "in_progress",
    },

    items: [itemSchema],

    score: { type: Number, min: 0, max: 100, default: null },

    level: { type: Number, min: 0, max: 5, default: null },

    startedAt: { type: Date, default: Date.now },

    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

assessmentSchema.pre("validate", function () {
  if (this.status === "completed") {
    if (!this.completedAt) this.completedAt = new Date();
    if (this.level == null) this.invalidate("level", "A completed assessment needs a level");
  }
  if (this.status !== "completed" && this.completedAt) {
    this.invalidate("status", "Only a completed assessment can have completedAt");
  }
});

assessmentSchema.index(
  { childId: 1, domain: 1, kind: 1 },
  { unique: true, partialFilterExpression: { status: "in_progress" } },
);
assessmentSchema.index({ familyId: 1, childId: 1, status: 1 });

const Assessment = mongoose.model("Assessment", assessmentSchema);
export default Assessment;
