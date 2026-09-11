import type { Rule } from "eslint";

function classPropContracts(source: string): ReadonlySet<string> {
  const contracts = new Set<string>();
  const interfacePattern = /interface\s+([A-Z][A-Za-z0-9]*Props)\b([^\{]*)\{([^}]*)\}/gu;
  const typePattern = /type\s+([A-Z][A-Za-z0-9]*Props)\b\s*=\s*([^;]+);/gu;

  for (const match of source.matchAll(interfacePattern)) {
    const [, name, heritage, body] = match;
    if (name && (/JSX\.[A-Za-z]*HTMLAttributes\b/u.test(heritage ?? "") || /(?:readonly\s+)?class\??\s*:/u.test(body ?? ""))) contracts.add(name);
  }
  for (const match of source.matchAll(typePattern)) {
    const [, name, body] = match;
    if (name && (/JSX\.[A-Za-z]*HTMLAttributes\b/u.test(body ?? "") || /(?:readonly\s+)?class\??\s*:/u.test(body ?? ""))) contracts.add(name);
  }
  return contracts;
}

function acceptsClass(text: string, contracts: ReadonlySet<string>): boolean {
  if (/JSX\.[A-Za-z]*HTMLAttributes\b/u.test(text) || /(?:readonly\s+)?class\??\s*:/u.test(text)) return true;
  return [...contracts].some(name => new RegExp(`:\\s*${name}\\b`, "u").test(text));
}

function mergesClass(text: string): boolean {
  return /\bcn\s*\([^)]*\.\s*class\b/su.test(text);
}

export const requireClassMerge: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: { description: "Require component class props to flow through the public cn helper." },
    schema: [],
    messages: { forbidden: "Components accepting native/class props must merge class through cn()." },
  },
  create(context) {
    const contracts = classPropContracts(context.sourceCode.getText());
    const inspect = (node: Rule.Node): void => {
      const source = context.sourceCode.getText(node);
      if (acceptsClass(source, contracts) && !mergesClass(source)) context.report({ node, messageId: "forbidden" });
    };
    return {
      FunctionDeclaration(node) {
        if (node.id?.name && /^[A-Z]/u.test(node.id.name)) inspect(node);
      },
      VariableDeclarator(node) {
        if (node.id.type !== "Identifier" || !/^[A-Z]/u.test(node.id.name)) return;
        if (node.init?.type === "ArrowFunctionExpression" || node.init?.type === "FunctionExpression") inspect(node);
      },
    };
  },
};
