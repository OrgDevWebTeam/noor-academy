import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { validateBody } from "./validate.js";

const schema = z.object({ name: z.string().min(1) }).strict();
const app = express();
app.use(express.json());
app.post("/x", validateBody(schema), (req, res) => {
  res.json(req.body);
});

describe("validateBody", () => {
  it("passes valid bodies through", async () => {
    const res = await request(app).post("/x").send({ name: "Noor" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ name: "Noor" });
  });

  it("rejects unknown fields", async () => {
    const res = await request(app).post("/x").send({ name: "Noor", role: "admin" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("validation_failed");
  });

  it("does not echo submitted values", async () => {
    const res = await request(app).post("/x").send({ name: "", extra: "hunter2" });
    expect(res.status).toBe(400);
    expect(res.text).not.toContain("hunter2");
  });
});
