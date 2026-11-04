import { BadRequestException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ZodValidationPipe } from "./zod-validation.pipe.js";

const schema = z.object({ name: z.string().min(1) }).strict();
const pipe = new ZodValidationPipe(schema);

describe("ZodValidationPipe", () => {
  it("returns parsed data for valid input", () => {
    expect(pipe.transform({ name: "Noor" })).toEqual({ name: "Noor" });
  });

  it("rejects unknown fields", () => {
    expect(() => pipe.transform({ name: "Noor", role: "admin" })).toThrow(BadRequestException);
  });

  it("rejects invalid fields", () => {
    expect(() => pipe.transform({ name: "" })).toThrow(BadRequestException);
  });
});
