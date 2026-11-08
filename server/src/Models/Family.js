import mongoose from "mongoose";
import { LANGUAGES } from "../constants/index.js";

const familySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
    },

    locale: { type: String, enum: LANGUAGES, default: "ar" },

    status: { type: String, enum: ["active", "suspended"], default: "active" },
  },
  { timestamps: true },
);

familySchema.index({ parentId: 1 }, { unique: true });

const Family = mongoose.model("Family", familySchema);
export default Family;
