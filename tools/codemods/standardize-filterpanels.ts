import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as ts from 'typescript';

type Replacement = {
  start: number;
  end: number;
  text: string;
};

const TARGET_IMPORT = 'src/components/shared/FilterPanel';
const TARGET_NAME = 'FilterPanel';
const SUPPORTED_EXTENSIONS = new Set(['.ts', '.tsx']);
const HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
const FILTER_KEYWORDS = ['filters', 'filtercontrols', 'filtersection', 'filtercontainer', 'filter'];

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

function getTagName(element: ts.JsxOpeningLikeElement | ts.JsxClosingElement, sourceFile: ts.SourceFile): string {
  const tag = element.tagName;
  return tag ? tag.getText(sourceFile) : '';
}

function containsFilterKeyword(text: string): boolean {
  const normalized = text.toLowerCase();
  return FILTER_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function extractTextFromChildren(children: readonly ts.JsxChild[], sourceFile: ts.SourceFile): string {
  let buffer = '';

  for (const child of children) {
    if (ts.isJsxText(child)) {
      buffer += child.getText(sourceFile);
      continue;
    }

    if (ts.isJsxExpression(child) && child.expression) {
      if (ts.isStringLiteralLike(child.expression)) {
        buffer += child.expression.text;
        continue;
      }

      if (ts.isTemplateExpression(child.expression) && child.expression.templateSpans.length === 0) {
        buffer += child.expression.head.text;
        continue;
      }
    }
  }

  return buffer.trim();
}

function attributesContainFilter(attributes: ts.JsxAttributes, sourceFile: ts.SourceFile): boolean {
  for (const property of attributes.properties) {
    if (!ts.isJsxAttribute(property)) {
      continue;
    }

    const attributeName = property.name.getText(sourceFile).toLowerCase();
    if (containsFilterKeyword(attributeName)) {
      return true;
    }

    const initializer = property.initializer;
    if (!initializer) {
      continue;
    }

    if (ts.isStringLiteral(initializer) && containsFilterKeyword(initializer.text)) {
      return true;
    }

    if (ts.isJsxExpression(initializer) && initializer.expression) {
      const expression = initializer.expression;

      if (ts.isStringLiteralLike(expression) && containsFilterKeyword(expression.text)) {
        return true;
      }

      if (ts.isTemplateExpression(expression) && expression.templateSpans.length === 0) {
        if (containsFilterKeyword(expression.head.text)) {
          return true;
        }
      }

      if (ts.isIdentifier(expression) && containsFilterKeyword(expression.text)) {
        return true;
      }
    }
  }

  return false;
}

function jsxChildContainsFilter(child: ts.JsxChild, sourceFile: ts.SourceFile): boolean {
  if (ts.isJsxText(child)) {
    return containsFilterKeyword(child.getText(sourceFile));
  }

  if (ts.isJsxExpression(child) && child.expression) {
    const expression = child.expression;

    if (ts.isStringLiteralLike(expression)) {
      return containsFilterKeyword(expression.text);
    }

    if (ts.isTemplateExpression(expression) && expression.templateSpans.length === 0) {
      return containsFilterKeyword(expression.head.text);
    }

    if (ts.isIdentifier(expression)) {
      return containsFilterKeyword(expression.text);
    }
  }

  if (ts.isJsxElement(child)) {
    const tagName = getTagName(child.openingElement, sourceFile).toLowerCase();
    if (containsFilterKeyword(tagName)) {
      return true;
    }

    if (attributesContainFilter(child.openingElement.attributes, sourceFile)) {
      return true;
    }

    if (HEADING_TAGS.has(tagName)) {
      const headingText = extractTextFromChildren(child.children, sourceFile);
      if (containsFilterKeyword(headingText)) {
        return true;
      }
    }

    return elementContainsFilterIndicator(child, sourceFile);
  }

  if (ts.isJsxSelfClosingElement(child)) {
    const tagName = child.tagName.getText(sourceFile).toLowerCase();
    if (containsFilterKeyword(tagName)) {
      return true;
    }

    if (attributesContainFilter(child.attributes, sourceFile)) {
      return true;
    }
  }

  if (ts.isJsxFragment(child)) {
    return child.children.some((fragmentChild) => jsxChildContainsFilter(fragmentChild, sourceFile));
  }

  return false;
}

function elementContainsFilterIndicator(element: ts.JsxElement, sourceFile: ts.SourceFile): boolean {
  const tagName = getTagName(element.openingElement, sourceFile).toLowerCase();
  if (containsFilterKeyword(tagName)) {
    return true;
  }

  if (attributesContainFilter(element.openingElement.attributes, sourceFile)) {
    return true;
  }

  return element.children.some((child) => jsxChildContainsFilter(child, sourceFile));
}

function findHeadingWithFilters(
  element: ts.JsxElement,
  sourceFile: ts.SourceFile,
): { node: ts.JsxElement; text: string } | null {
  for (const child of element.children) {
    if (!ts.isJsxElement(child)) {
      continue;
    }

    const tagName = getTagName(child.openingElement, sourceFile).toLowerCase();
    if (!HEADING_TAGS.has(tagName)) {
      continue;
    }

    const headingText = extractTextFromChildren(child.children, sourceFile);
    if (!headingText) {
      continue;
    }

    if (containsFilterKeyword(headingText)) {
      return { node: child, text: headingText };
    }
  }

  return null;
}

function hasFilterPanelReference(sourceFile: ts.SourceFile): boolean {
  if (sourceFile.text.includes(TARGET_NAME)) {
    return true;
  }

  return false;
}

function hasImport(sourceFile: ts.SourceFile): boolean {
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) {
      continue;
    }

    const moduleSpecifier = statement.moduleSpecifier;
    if (!ts.isStringLiteral(moduleSpecifier)) {
      continue;
    }

    if (moduleSpecifier.text !== TARGET_IMPORT) {
      continue;
    }

    const namedBindings = statement.importClause?.namedBindings;
    if (!namedBindings) {
      continue;
    }

    if (ts.isNamedImports(namedBindings)) {
      for (const element of namedBindings.elements) {
        if (element.name.text === TARGET_NAME) {
          return true;
        }
      }
    }
  }

  return false;
}

function addImport(code: string, sourceFile: ts.SourceFile): { code: string; added: boolean } {
  if (hasImport(sourceFile)) {
    return { code, added: false };
  }

  const importStatement = `import { ${TARGET_NAME} } from "${TARGET_IMPORT}";\n`;
  const statements = sourceFile.statements;

  let insertPosition = 0;
  let afterDirectives = false;

  for (const statement of statements) {
    if (!afterDirectives) {
      if (
        ts.isExpressionStatement(statement) &&
        ts.isStringLiteral(statement.expression) &&
        /^use\s+/.test(statement.expression.text)
      ) {
        insertPosition = statement.end;
        continue;
      }

      afterDirectives = true;
    }

    if (ts.isImportDeclaration(statement)) {
      insertPosition = statement.end;
      continue;
    }

    break;
  }

  const prefix = code.slice(0, insertPosition);
  const suffix = code.slice(insertPosition);
  const needsLeadingNewline = insertPosition > 0 && !prefix.endsWith('\n');
  const needsTrailingNewline = suffix.length > 0 && !suffix.startsWith('\n');
  const leading = needsLeadingNewline ? '\n' : '';
  const trailing = needsTrailingNewline ? '\n' : '';
  const updatedCode = `${prefix}${leading}${importStatement}${trailing}${suffix}`;

  return { code: updatedCode, added: true };
}

function applyReplacements(code: string, replacements: Replacement[]): string {
  if (replacements.length === 0) {
    return code;
  }

  let updated = code;
  const sorted = [...replacements].sort((a, b) => b.start - a.start);

  for (const replacement of sorted) {
    updated = `${updated.slice(0, replacement.start)}${replacement.text}${updated.slice(replacement.end)}`;
  }

  return updated;
}

function transformElement(
  element: ts.JsxElement,
  sourceFile: ts.SourceFile,
  fileText: string,
): { replacement: Replacement; title: string } | null {
  if (!elementContainsFilterIndicator(element, sourceFile)) {
    return null;
  }

  const tagName = getTagName(element.openingElement, sourceFile);
  if (tagName === TARGET_NAME) {
    return null;
  }

  const heading = findHeadingWithFilters(element, sourceFile);
  const title = heading?.text || 'Filters';

  const innerStart = element.openingElement.end;
  const innerEnd = element.closingElement.pos;
  let innerContent = fileText.slice(innerStart, innerEnd);

  if (heading) {
    const headingStart = Math.max(heading.node.getFullStart(), innerStart);
    const headingEnd = Math.min(heading.node.getEnd(), innerEnd);
    innerContent = `${fileText.slice(innerStart, headingStart)}${fileText.slice(headingEnd, innerEnd)}`;
  }

  const titleLiteral = JSON.stringify(title.trim() || 'Filters');
  const replacementText = `<${TARGET_NAME} title=${titleLiteral}>${innerContent}</${TARGET_NAME}>`;

  return {
    replacement: {
      start: element.getStart(sourceFile),
      end: element.getEnd(),
      text: replacementText,
    },
    title,
  };
}

async function transformFile(filePath: string): Promise<boolean> {
  const original = await fs.readFile(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    filePath,
    original,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  if (hasFilterPanelReference(sourceFile)) {
    return false;
  }

  const replacements: Replacement[] = [];
  const visited = new Set<ts.Node>();

  function visit(node: ts.Node): void {
    if (visited.has(node)) {
      return;
    }

    if (ts.isJsxElement(node)) {
      const result = transformElement(node, sourceFile, original);
      if (result) {
        replacements.push(result.replacement);
        visited.add(node);
        return;
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  if (replacements.length === 0) {
    return false;
  }

  let updated = applyReplacements(original, replacements);
  const updatedSourceFile = ts.createSourceFile(
    filePath,
    updated,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  const { code: withImport } = addImport(updated, updatedSourceFile);
  updated = withImport;

  if (updated !== original) {
    await fs.writeFile(filePath, updated, 'utf8');
    return true;
  }

  return false;
}

async function main(): Promise<void> {
  const root = process.cwd();
  const files = await collectSourceFiles(root);

  let updatedCount = 0;
  for (const file of files) {
    try {
      const changed = await transformFile(file);
      if (changed) {
        console.log(`Updated ${path.relative(root, file)}`);
        updatedCount += 1;
      }
    } catch (error) {
      console.error(`Failed to transform ${file}:`, error);
    }
  }

  console.log(`\nstandardize-filterpanels: updated ${updatedCount} file(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
