import { RuleTester } from "eslint";
import { afterAll, describe, it } from "vitest";
import rule from "./no-physical-classes.mjs";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

tester.run("no-physical-classes", rule, {
  valid: [
    '<div className="ms-4 pe-2 text-start" />',
    '<div className="mx-auto px-6 rounded-lg border-s-2" />',
    '<div className="placeholder:text-zinc-500 prose" />',
    "<div className={`ms-2 ${active ? 'font-bold' : ''}`} />",
    '<div title="ml-4" />',
  ],
  invalid: [
    {
      code: '<div className="ml-4" />',
      errors: [{ messageId: "physical", data: { found: "ml", hint: " 'ms'" } }],
    },
    {
      code: '<div className="p-2 md:text-left" />',
      errors: [{ messageId: "physical", data: { found: "text-left", hint: " 'text-start'" } }],
    },
    {
      code: "<div className={`ms-2 -mr-1`} />",
      errors: [{ messageId: "physical", data: { found: "mr", hint: " 'me'" } }],
    },
    {
      code: '<div className={cn("flex", "border-r")} />',
      errors: [{ messageId: "physical", data: { found: "border-r", hint: "" } }],
    },
    {
      code: '<div className="absolute right-0" />',
      errors: [{ messageId: "physical", data: { found: "right", hint: " 'end'" } }],
    },
  ],
});
