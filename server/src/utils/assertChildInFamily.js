import Child from "../Models/Child.js";

export async function assertChildInFamily(doc, { requireActive = false } = {}) {
  // Ids are immutable, so this only needs to run when the record is first created.
  if (!doc.isNew) return;

  // If an id is missing, the "required" validators already report it.
  if (!doc.childId || !doc.familyId) return;

  const child = await Child.findById(doc.childId).select("familyId status");

  if (!child) {
    doc.invalidate("childId", "Child does not exist");
    return;
  }

  if (!child.familyId.equals(doc.familyId)) {
    doc.invalidate("familyId", "Child does not belong to this family");
    return;
  }

  if (requireActive && child.status !== "active") {
    doc.invalidate("childId", "Child is not active (consent pending or archived)");
  }
}
