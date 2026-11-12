import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Family from "../../src/Models/Family.js";
import Child from "../../src/Models/Child.js";
import Progress from "../../src/Models/Progress.js";
import ConsentRecord from "../../src/Models/ConsentRecord.js";
import { connectTestDb, clearTestDb, disconnectTestDb } from "../helpers/db.js";

const newId = () => new mongoose.Types.ObjectId();

async function makeFamily(name = "Test family") {
  return Family.create({ name, parentId: newId() });
}

async function makeChild(family, status = "active") {
  return Child.create({
    name: "Ahmad",
    dateOfBirth: new Date(Date.UTC(new Date().getUTCFullYear() - 8, 0, 1)),
    familyId: family._id,
    status,
  });
}

function progressFor(child, familyId = child.familyId) {
  return { familyId, childId: child._id, contentId: newId() };
}

describe("child-linked record checks", () => {
  before(connectTestDb);
  after(disconnectTestDb);
  beforeEach(clearTestDb);

  it("saves Progress for an active child in the right family", async () => {
    const family = await makeFamily();
    const child = await makeChild(family, "active");
    const saved = await Progress.create(progressFor(child));
    assert.ok(saved._id);
  });

  it("rejects Progress when the child belongs to another family", async () => {
    const familyA = await makeFamily("A");
    const familyB = await makeFamily("B");
    const child = await makeChild(familyA);
    await assert.rejects(
      Progress.create(progressFor(child, familyB._id)),
      (err) => err.name === "ValidationError" && Boolean(err.errors.familyId),
    );
  });

  it("rejects Progress when the child is still pending consent", async () => {
    const family = await makeFamily();
    const child = await makeChild(family, "pending_consent");
    await assert.rejects(
      Progress.create(progressFor(child)),
      (err) => err.name === "ValidationError" && Boolean(err.errors.childId),
    );
  });

  it("rejects Progress when the child does not exist", async () => {
    const family = await makeFamily();
    await assert.rejects(
      Progress.create({
        familyId: family._id,
        childId: newId(),
        contentId: newId(),
      }),
      (err) => err.name === "ValidationError" && Boolean(err.errors.childId),
    );
  });

  it("allows a ConsentRecord for a child that is still pending consent", async () => {
    const family = await makeFamily();
    const child = await makeChild(family, "pending_consent");
    const saved = await ConsentRecord.create({
      guardianId: family.parentId,
      childId: child._id,
      familyId: family._id,
      status: "granted",
      policyVersion: "v1",
      method: "web_form",
    });
    assert.ok(saved._id);
  });
});
