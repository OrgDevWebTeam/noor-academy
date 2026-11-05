import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { errorHandler } from "./error.js";

const app = express();
app.get("/boom", () => {
  throw new Error("secret detail");
});
app.get("/teapot", () => {
  throw Object.assign(new Error("short and stout"), { status: 418 });
});
app.use(errorHandler);

describe("errorHandler", () => {
  it("hides the message of unexpected errors", async () => {
    const res = await request(app).get("/boom");
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("internal_error");
    expect(res.text).not.toContain("secret");
  });

  it("passes through client error statuses without the message", async () => {
    const res = await request(app).get("/teapot");
    expect(res.status).toBe(418);
    expect(res.body.error).toBe("request_error");
    expect(res.text).not.toContain("stout");
  });
});
