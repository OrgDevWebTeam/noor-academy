import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// WCAG 2.2 AA (NFR-A11Y-001): text needs 4.5:1; control borders and the focus ring need 3:1.

const css = readFileSync(fileURLToPath(new URL("./styles.css", import.meta.url)), "utf8");

function colourTokens(source: string): Record<string, string> {
  const tokens: Record<string, string> = {};
  for (const [, name, value] of source.matchAll(/--noor-([a-z-]+):\s*(#[0-9a-f]{6})/gi)) {
    if (name && value) tokens[name] = value;
  }
  return tokens;
}

const colours = colourTokens(css);

function channel(hex: string, start: number): number {
  const value = parseInt(hex.slice(start, start + 2), 16) / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  return 0.2126 * channel(hex, 1) + 0.7152 * channel(hex, 3) + 0.0722 * channel(hex, 5);
}

function contrast(a: string, b: string): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (lighter + 0.05) / (darker + 0.05);
}

const TEXT_PAIRS: Array<[string, string]> = [
  ["ink", "surface"],
  ["ink", "surface-muted"],
  ["ink-muted", "surface"],
  ["ink-muted", "surface-muted"],
  ["primary", "surface"],
  ["on-primary", "primary"],
  ["on-primary", "danger"],
  ["danger", "surface"],
  ["danger", "surface-muted"],
  ["success", "surface"],
  ["success", "surface-muted"],
  ["warning", "surface"],
  ["warning", "surface-muted"],
  ["info", "surface"],
  ["info", "surface-muted"],
];

const NON_TEXT_PAIRS: Array<[string, string]> = [
  ["control", "surface"],
  ["focus", "surface"],
];

describe("token colours", () => {
  it("define every colour the checks need", () => {
    for (const name of [...TEXT_PAIRS, ...NON_TEXT_PAIRS].flat()) {
      expect(colours[name], `--noor-${name}`).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it.each(TEXT_PAIRS)("%s text on %s reaches 4.5:1", (text, background) => {
    expect(contrast(colours[text]!, colours[background]!)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(NON_TEXT_PAIRS)("%s on %s reaches 3:1", (part, background) => {
    expect(contrast(colours[part]!, colours[background]!)).toBeGreaterThanOrEqual(3);
  });
});
