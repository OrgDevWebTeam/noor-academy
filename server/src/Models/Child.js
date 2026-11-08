import mongoose from "mongoose";
import { LANGUAGES } from "../constants/index.js";

const getAgeBand = (dob) => {
  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const m = now.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < dob.getUTCDate())) age -= 1;

  if (age >= 6 && age <= 8) return "6-8";
  if (age >= 9 && age <= 11) return "9-11";
  if (age >= 12 && age <= 14) return "12-14";
  return null;
};

const childSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 40 },

    dateOfBirth: { type: Date, required: true },

    familyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Family",
      required: true,
      immutable: true,
    },

    country: { type: String, trim: true, maxlength: 60 },

    homeLanguage: { type: String, enum: LANGUAGES, default: "ar" },

    interests: [{ type: String, trim: true }],

    learningGoals: [{ type: String, trim: true }],

    arabicLevel: { type: Number, min: 0, max: 5 },

    quranLevel: { type: Number, min: 0, max: 5 },

    preferredSchedule: { type: String, trim: true },

    status: {
      type: String,
      enum: ["pending_consent", "active", "archived"],
      default: "pending_consent",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

childSchema.virtual("ageBand").get(function () {
  return this.dateOfBirth ? getAgeBand(this.dateOfBirth) : undefined;
});

childSchema.pre("validate", function () {
  if ((this.isNew || this.isModified("dateOfBirth")) && this.dateOfBirth) {
    if (!getAgeBand(this.dateOfBirth)) {
      this.invalidate("dateOfBirth", "Child age must be between 6 and 14");
    }
  }
});

childSchema.index({ familyId: 1, status: 1 });

const Child = mongoose.model("Child", childSchema);
export default Child;
