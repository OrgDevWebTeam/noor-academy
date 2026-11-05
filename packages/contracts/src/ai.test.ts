import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AI_CATEGORIES, AI_DECISIONS, AI_ERROR_CODES, AI_QUALITIES, aiFallbackResult } from "./ai";

const schemasDir = join(__dirname, "..", "schemas");
const readJson = (file: string) => JSON.parse(readFileSync(join(schemasDir, file), "utf8"));

const schema = readJson("recitation_result.schema.json");
const finding = schema.$defs.finding.properties;

describe("AI contract types match the JSON schema", () => {
  it("has the same decisions, qualities, categories and codes", () => {
    expect([...AI_DECISIONS]).toEqual(schema.properties.decision.enum);
    expect([...AI_QUALITIES]).toEqual(schema.properties.quality.enum);
    expect([...AI_CATEGORIES]).toEqual(finding.category.enum);
    expect([...AI_ERROR_CODES]).toEqual(finding.code.enum);
  });

  it("numbers words from 1", () => {
    expect(finding.wordIndex.minimum).toBe(1);
  });

  it("builds a fallback result that is uncertain with no findings", () => {
    const result = aiFallbackResult("attempt-1", 20004);
    expect(result).toMatchObject({ model: "none", decision: "uncertain", quality: "ok" });
    expect(result.findings).toEqual([]);
    expect(Object.keys(result).sort()).toEqual([...schema.required].sort());
  });
});

describe("message keys used in the schema examples exist in safe_messages", () => {
  it("has every example messageKey", () => {
    const messages = readJson("safe_messages_v1_1.json");
    const keys = schema.examples.flatMap((example: { findings: { messageKey: string }[] }) =>
      example.findings.map((f) => f.messageKey),
    );
    for (const key of keys) {
      expect(messages[key], key).toBeDefined();
    }
  });
});
