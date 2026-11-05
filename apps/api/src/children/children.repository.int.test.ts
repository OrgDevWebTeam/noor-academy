import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type TestDatabase, createTestDatabase } from "../testing/mongo.js";
import {
  type FamilyScope,
  type TeacherScope,
  createChildrenRepository,
} from "./children.repository.js";

let t: TestDatabase | undefined;
const repo = () => createChildrenRepository(t!.db);
const family = (): FamilyScope => ({ kind: "family", familyId: randomUUID() });
const teacher = (): TeacherScope => ({ kind: "teacher", teacherId: randomUUID() });

async function assign(teacherId: string, childId: string, familyId: string, status = "active") {
  await t!.db.collection("teacherAssignments").insertOne({
    _id: randomUUID() as never,
    teacherId,
    childId,
    familyId,
    status,
    createdAt: new Date(),
  });
}

beforeAll(async () => {
  t = await createTestDatabase();
});
afterAll(async () => {
  await t?.cleanup();
});

describe("family isolation", () => {
  it("lets a family read its own child", async () => {
    const a = family();
    const child = await repo().create(a, { displayName: "Aya", birthYear: 2018 });
    expect(await repo().find(a, child.id)).toMatchObject({ id: child.id });
    expect(await repo().list(a)).toHaveLength(1);
  });

  it("never lets another family read, list or change that child", async () => {
    const a = family();
    const b = family();
    const child = await repo().create(a, { displayName: "Aya", birthYear: 2018 });
    expect(await repo().find(b, child.id)).toBeNull();
    expect(await repo().list(b)).toEqual([]);
    expect(await repo().setPin(b, child.id, "hash")).toBe(false);
    expect(await repo().getPinState(b, child.id)).toBeNull();
  });

  it("never exposes the PIN hash", async () => {
    const a = family();
    const child = await repo().create(a, { displayName: "Aya", birthYear: 2018 });
    await repo().setPin(a, child.id, "secret-hash");
    const found = await repo().find(a, child.id);
    expect(found).toMatchObject({ hasPin: true });
    expect(JSON.stringify(found)).not.toContain("secret-hash");
  });
});

describe("teacher access", () => {
  it("shows an unassigned teacher nothing", async () => {
    const a = family();
    const child = await repo().create(a, { displayName: "Aya", birthYear: 2018 });
    const tch = teacher();
    expect(await repo().find(tch, child.id)).toBeNull();
    expect(await repo().list(tch)).toEqual([]);
  });

  it("shows an assigned teacher only the assigned child", async () => {
    const a = family();
    const assigned = await repo().create(a, { displayName: "Aya", birthYear: 2018 });
    const sibling = await repo().create(a, { displayName: "Omar", birthYear: 2016 });
    const tch = teacher();
    await assign(tch.teacherId, assigned.id, a.familyId);
    expect(await repo().find(tch, assigned.id)).toMatchObject({ id: assigned.id });
    expect(await repo().find(tch, sibling.id)).toBeNull();
    expect((await repo().list(tch)).map((c) => c.id)).toEqual([assigned.id]);
  });

  it("stops showing a child once the assignment is revoked", async () => {
    const a = family();
    const child = await repo().create(a, { displayName: "Aya", birthYear: 2018 });
    const tch = teacher();
    await assign(tch.teacherId, child.id, a.familyId, "revoked");
    expect(await repo().find(tch, child.id)).toBeNull();
  });

  it("ignores an assignment whose family does not match the child", async () => {
    const a = family();
    const child = await repo().create(a, { displayName: "Aya", birthYear: 2018 });
    const tch = teacher();
    await assign(tch.teacherId, child.id, randomUUID());
    expect(await repo().find(tch, child.id)).toBeNull();
  });
});
