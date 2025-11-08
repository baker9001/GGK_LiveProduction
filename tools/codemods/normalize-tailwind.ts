import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

type Replacement = {
  start: number;
  end: number;
  text: string;
};

/**
 * Codemod: normalize-tailwind
 *
 * Rewrites deprecated Tailwind classes to the new GGK design token utilities
 * across all `src/**/*.{ts,tsx}` files. The script only touches string segments
 * that are confidently identified as class lists (JSX `className` / `class`
 * attributes as well as arguments to popular class helpers like `clsx` or
 * `twMerge`). Mappings are idempotent and duplicate classes are merged while
 * preserving order.
 *
 * Usage:
 *   npx ts-node --esm tools/codemods/normalize-tailwind.ts
 *   # or transpile with `npx tsc tools/codemods/normalize-tailwind.ts --outDir dist`
 *   # and execute the emitted JavaScript with `node dist/normalize-tailwind.js`
 *
 * The script prints a short summary once it finishes processing all files.
 */
const CLASS_ATTRIBUTE_NAMES = new Set(['className', 'class']);
const CLASS_FUNCTION_NAMES = new Set([
  'clsx',
  'cn',
  'classNames',
  'classnames',
  'cva',
  'twMerge',
  'twJoin',
]);

const CLASS_REPLACEMENTS = new Map<string, string>([
  ['bg-white', 'bg-[--ggk-surface]'],
  ['bg-gray-50', 'bg-[--ggk-bg]'],
  ['bg-slate-50', 'bg-[--ggk-bg]'],
  ['rounded-lg', 'rounded-2xl'],
  ['rounded-xl', 'rounded-2xl'],
  ['shadow', 'shadow-md'],
  ['shadow-sm', 'shadow-md'],
  ['text-gray-500', 'text-muted-foreground'],
  ['p-4', 'p-6'],
  ['px-4', 'px-8'],
  ['space-y-2', 'space-y-4'],
]);

const SUPPORTED_EXTENSIONS = new Set(['.ts', '.tsx']);

async function collectSourceFiles(root: string): Promise<string[]> {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(root, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
        continue;
      }

      files.push(...(await collectSourceFiles(entryPath)));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const ext = path.extname(entry.name);
    if (!SUPPORTED_EXTENSIONS.has(ext)) {
      continue;
    }

    if (entry.name.endsWith('.d.ts')) {
      continue;
    }

    files.push(entryPath);
  }

  return files;
}

function getCalleeName(expression: ts.LeftHandSideExpression): string | null {
  if (ts.isIdentifier(expression)) {
    return expression.text;
  }

  if (ts.isPropertyAccessExpression(expression)) {
    return expression.name.text;
  }

  return null;
}

function isClassContext(node: ts.Node, sourceFile: ts.SourceFile): boolean {
  let current: ts.Node | undefined = node;

  while (current) {
    const parent = current.parent;
    if (!parent) {
      break;
    }

    if (ts.isJsxAttribute(parent)) {
      const attributeName = parent.name.getText(sourceFile);
      if (CLASS_ATTRIBUTE_NAMES.has(attributeName)) {
        return true;
      }
    }

    if (ts.isCallExpression(parent) || ts.isNewExpression(parent)) {
      const callee = parent.expression as ts.LeftHandSideExpression;
      const calleeName = getCalleeName(callee);
      if (calleeName && CLASS_FUNCTION_NAMES.has(calleeName)) {
        return true;
      }
    }

    if (ts.isTaggedTemplateExpression(parent)) {
      const calleeName = getCalleeName(parent.tag as ts.LeftHandSideExpression);
      if (calleeName && CLASS_FUNCTION_NAMES.has(calleeName)) {
        return true;
      }
    }

    if (
      ts.isParenthesizedExpression(parent) ||
      ts.isAsExpression(parent) ||
      ts.isSatisfiesExpression?.(parent) ||
      ts.isTypeAssertionExpression?.(parent) ||
      ts.isBinaryExpression(parent) ||
      ts.isConditionalExpression(parent) ||
      ts.isTemplateSpan(parent) ||
      ts.isArrayLiteralExpression(parent) ||
      ts.isPropertyAssignment(parent) ||
      ts.isSpreadAssignment?.(parent) ||
      ts.isObjectLiteralExpression(parent) ||
      ts.isJsxExpression(parent)
    ) {
      current = parent;
      continue;
    }

    break;
  }

  return false;
}

function normalizeChunk(value: string): { changed: boolean; text: string } {
  if (!value) {
    return { changed: false, text: value };
  }

  const leadingMatch = value.match(/^\s*/);
  const trailingMatch = value.match(/\s*$/);
  const leading = leadingMatch ? leadingMatch[0] : '';
  const trailing = trailingMatch ? trailingMatch[0] : '';
  const startIndex = leading.length;
  const endIndex = value.length - trailing.length;
  const core = value.slice(startIndex, endIndex);

  if (!core) {
    return { changed: false, text: value };
  }

  const tokens = core.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return { changed: false, text: value };
  }

  const seen = new Set<string>();
  const nextTokens: string[] = [];
  let changed = false;

  for (const token of tokens) {
    const replacement = CLASS_REPLACEMENTS.get(token) ?? token;
    if (replacement !== token) {
      changed = true;
    }

    if (seen.has(replacement)) {
      changed = true;
      continue;
    }

    seen.add(replacement);
    nextTokens.push(replacement);
  }

  const normalized = nextTokens.join(' ');

  if (!changed && normalized === core) {
    return { changed: false, text: value };
  }

  return { changed: true, text: `${leading}${normalized}${trailing}` };
}

function escapeQuotedText(value: string, quote: string): string {
  if (quote === '`') {
    return `\`${escapeTemplateChunk(value)}\``;
  }

  const escapeQuote = quote === '"' ? /(["\\])/g : /(['\\])/g;
  const escaped = value.replace(escapeQuote, '\\$1');
  return `${quote}${escaped}${quote}`;
}

function escapeTemplateChunk(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');
}

function processTemplateExpression(
  node: ts.TemplateExpression,
  sourceFile: ts.SourceFile,
  sourceText: string,
): { changed: boolean; text: string } {
  const headResult = normalizeChunk(node.head.text);
  const spanResults = node.templateSpans.map((span) => normalizeChunk(span.literal.text));

  const changed = headResult.changed || spanResults.some((result) => result.changed);
  if (!changed) {
    return { changed: false, text: node.getText(sourceFile) };
  }

  let rebuilt = `\`${escapeTemplateChunk(headResult.text)}`;

  node.templateSpans.forEach((span, index) => {
    const expressionText = sourceText.slice(span.expression.getStart(sourceFile), span.expression.getEnd());
    const literalText = spanResults[index].text;
    rebuilt += `\${${expressionText}}${escapeTemplateChunk(literalText)}`;
  });

  rebuilt += '`';

  return { changed: true, text: rebuilt };
}

function processStringLiteral(
  node: ts.StringLiteralLike,
  sourceFile: ts.SourceFile,
): { changed: boolean; text: string } {
  const normalized = normalizeChunk(node.text);
  if (!normalized.changed) {
    return { changed: false, text: node.getText(sourceFile) };
  }

  const literalText = node.getText(sourceFile);
  const quote = literalText[0] ?? '"';
  return { changed: true, text: escapeQuotedText(normalized.text, quote) };
}

async function transformFile(filePath: string): Promise<boolean> {
  const original = await fs.readFile(filePath, 'utf8');
  const scriptKind = filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(filePath, original, ts.ScriptTarget.Latest, true, scriptKind);

  const replacements: Replacement[] = [];

  function visit(node: ts.Node): void {
    if (ts.isTemplateExpression(node)) {
      if (isClassContext(node, sourceFile)) {
        const result = processTemplateExpression(node, sourceFile, original);
        if (result.changed) {
          replacements.push({
            start: node.getStart(sourceFile),
            end: node.getEnd(),
            text: result.text,
          });
        }
      }
      ts.forEachChild(node, visit);
      return;
    }

    if (ts.isNoSubstitutionTemplateLiteral(node) || ts.isStringLiteral(node)) {
      if (isClassContext(node, sourceFile)) {
        const result = processStringLiteral(node, sourceFile);
        if (result.changed) {
          replacements.push({
            start: node.getStart(sourceFile),
            end: node.getEnd(),
            text: result.text,
          });
        }
      }
      ts.forEachChild(node, visit);
      return;
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  if (replacements.length === 0) {
    return false;
  }

  replacements.sort((a, b) => b.start - a.start);

  let updated = original;
  for (const replacement of replacements) {
    updated = `${updated.slice(0, replacement.start)}${replacement.text}${updated.slice(replacement.end)}`;
  }

  if (updated !== original) {
    await fs.writeFile(filePath, updated, 'utf8');
    return true;
  }

  return false;
}

async function main(): Promise<void> {
  const projectRoot = process.cwd();
  const srcDirectory = path.join(projectRoot, 'src');

  try {
    await fs.access(srcDirectory);
  } catch (error) {
    console.error('Unable to locate the `src` directory from the current working directory.');
    process.exitCode = 1;
    return;
  }

  const files = await collectSourceFiles(srcDirectory);
  let touched = 0;

  for (const file of files) {
    const changed = await transformFile(file);
    if (changed) {
      touched += 1;
    }
  }

  console.log(`normalize-tailwind: processed ${files.length} file(s), updated ${touched}.`);
}

void main().catch((error) => {
  console.error('normalize-tailwind failed:', error);
  process.exitCode = 1;
});
