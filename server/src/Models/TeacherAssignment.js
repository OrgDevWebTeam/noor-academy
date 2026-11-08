import mongoose from "mongoose";

const teacherAssignmentSchema = new mongoose.Schema(
  {
    teacherId: {
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

    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
    },

    status: { type: String, enum: ["active", "ended"], default: "active" },

    startedAt: { type: Date, default: Date.now },

    endedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

teacherAssignmentSchema.pre("validate", function () {
  if (this.status === "ended" && !this.endedAt) {
    this.endedAt = new Date();
  }
  if (this.status === "active" && this.endedAt) {
    this.invalidate("endedAt", "Active assignment cannot have endedAt");
  }
});

// One ACTIVE assignment per teacher+child. Ended ones are ignored by this index.
teacherAssignmentSchema.index(
  { teacherId: 1, childId: 1 },
  { unique: true, partialFilterExpression: { status: "active" } },
);

// Fast lookup: which children does this teacher have?
teacherAssignmentSchema.index({ teacherId: 1, status: 1 });

// Fast lookup: which teachers does this child have?
teacherAssignmentSchema.index({ childId: 1, status: 1 });

// Answers yes/no: is this teacher currently assigned to this child?
teacherAssignmentSchema.statics.isAssigned = async function (
  teacherId,
  childId,
) {
  // Look for one active assignment card; returns its id, or null if none. !! means return true or false
  return !!(await this.exists({ teacherId, childId, status: "active" }));
};

const TeacherAssignment = mongoose.model(
  "TeacherAssignment",
  teacherAssignmentSchema,
);
export default TeacherAssignment;
