// Blocks Tailwind classes that pin a physical side (ml-4, text-left, border-r...).
// Arabic is RTL, so layout must use the logical classes that follow `dir`.

const PHYSICAL =
  /(?:^|[\s:!])-?(ml|mr|pl|pr|left|right|rounded-[tb]?[lr]|border-[lr]|scroll-m[lr]|scroll-p[lr]|text-left|text-right)(?=-|\s|$)/;

const LOGICAL = {
  ml: "ms",
  mr: "me",
  pl: "ps",
  pr: "pe",
  left: "start",
  right: "end",
  "text-left": "text-start",
  "text-right": "text-end",
};

/** @type {import("eslint").Rule.RuleModule} */
const rule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow physical-direction Tailwind classes; use logical ones for RTL.",
    },
    messages: {
      physical: "'{{found}}' breaks RTL. Use the logical class{{hint}} instead.",
    },
    schema: [],
  },
  create(context) {
    function check(node, text) {
      const match = PHYSICAL.exec(text);
      if (!match) return;
      const found = match[1];
      const logical = LOGICAL[found];
      context.report({
        node,
        messageId: "physical",
        data: { found, hint: logical ? ` '${logical}'` : "" },
      });
    }

    return {
      'JSXAttribute[name.name="className"] Literal'(node) {
        if (typeof node.value === "string") check(node, node.value);
      },
      'JSXAttribute[name.name="className"] TemplateElement'(node) {
        check(node, node.value.raw);
      },
    };
  },
};

export default rule;
