import mongoose from "mongoose";
import { AGE_BANDS, DOMAINS, LANGUAGES } from "../constants/index.js";

const contentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },

    type: {
      type: String,
      enum: ["lesson", "story", "activity", "quran_task"],
      required: true,
    },

    description: { type: String, trim: true },

    ageBand: { type: String, enum: AGE_BANDS, required: true },

    language: {
      type: String,
      enum: LANGUAGES,
      default: "ar",
      required: true,
    },

    domain: {
      type: String,
      enum: DOMAINS,
      required: true,
    },

    level: { type: Number, min: 1, max: 5, required: true },

    estimatedMinutes: { type: Number, min: 1, required: true },

    competencies: [{ type: mongoose.Schema.Types.ObjectId, ref: "Competency" }],

    status: {
      type: String,
      enum: ["draft", "in_review", "published", "archived"],
      default: "draft",
    },

    reviewRequired: { type: Boolean, default: false },

    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    approvedAt: { type: Date },

    version: { type: Number, default: 1, min: 1 },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
    },
  },
  { timestamps: true },
);

contentSchema.pre("validate", function () {
  if (this.status === "published") {
    if (!this.competencies || this.competencies.length === 0) {
      this.invalidate(
        "competencies",
        "Published content must map to at least one competency",
      );
    }
    if (this.reviewRequired && (!this.reviewedBy || !this.approvedAt)) {
      this.invalidate(
        "reviewedBy",
        "Review-required content needs an approved reviewer before publishing",
      );
    }
  }
});

contentSchema.index({
  status: 1,
  ageBand: 1,
  language: 1,
  domain: 1,
  level: 1,
});
contentSchema.index({ competencies: 1 });

const Content = mongoose.model("Content", contentSchema);
export default Content;
