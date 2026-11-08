import mongoose from "mongoose";
import { DOMAINS } from "../constants/index.js";

const competencySchema = new mongoose.Schema(
  {
    domain: {
      type: String,
      enum: DOMAINS,
      required: true,
    },

    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      immutable: true,
    },

    name: {
      ar: { type: String, required: true, trim: true },
      en: { type: String, required: true, trim: true },
    },

    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

competencySchema.index({ code: 1 }, { unique: true });
competencySchema.index({ domain: 1, active: 1 });

const Competency = mongoose.model("Competency", competencySchema);
export default Competency;
