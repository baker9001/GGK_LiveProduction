import path from 'node:path';
import type {
  API,
  Collection,
  FileInfo,
  Identifier,
  JSCodeshift,
  JSXElement,
  JSXFragment,
  JSXExpressionContainer,
  JSXText,
  JSXSpreadChild,
  Options,
} from 'jscodeshift';

/**
 * Codemod: insert-pageheader
 *
 * Adds the shared <PageHeader /> component to page-level React components that
 * live underneath `src/app/**/page.tsx` when the header is missing.
 *
 * Behaviour overview:
 * - Detects the default-exported page component and locates the JSX returned
 *   from the component (covering function declarations, arrow functions, and
 *   identifier exports).
 * - Inserts `<PageHeader title="…" subtitle="" />` as the first meaningful
 *   child in the returned JSX tree.
 * - Derives the title from the immediate directory name of the page file while
 *   gracefully handling route groups and dynamic segments.
 * - Adds `import { PageHeader } from "src/components/shared/PageHeader"` when
 *   necessary and augments existing imports without introducing duplicates.
 * - Leaves files unchanged if a PageHeader is already rendered or if no suitable
 *   JSX return can be found.
 */

const PAGE_HEADER_NAME = 'PageHeader';
const PAGE_HEADER_SOURCE = 'src/components/shared/PageHeader';
const DEFAULT_INDENT = '\n    ';

interface UnwrappedJSX {
  jsx: JSXElement | JSXFragment;
}

function buildFunctionWrapper(j: JSCodeshift, root: Collection<any>) {
  const defaultExport = root.find(j.ExportDefaultDeclaration).paths()[0];
  if (!defaultExport) {
    return null;
  }

  const { node } = defaultExport;
  const declaration = node.declaration;

  if (!declaration) {
    return null;
  }

  if (declaration.type === 'FunctionDeclaration' || declaration.type === 'FunctionExpression') {
    return {
      type: 'function' as const,
      node: declaration,
    };
  }

  if (declaration.type === 'ArrowFunctionExpression') {
    return {
      type: 'arrow' as const,
      node: declaration,
    };
  }

  if (declaration.type === 'Identifier') {
    const identifierName = declaration.name;

    const functionDeclaration = root
      .find(j.FunctionDeclaration, {
        id: { type: 'Identifier', name: identifierName },
      })
      .paths()[0];

    if (functionDeclaration) {
      return {
        type: 'function' as const,
        node: functionDeclaration.node,
      };
    }

    const variableDeclarator = root
      .find(j.VariableDeclarator, {
        id: { type: 'Identifier', name: identifierName } as Identifier,
      })
      .paths()[0];

    if (!variableDeclarator) {
      return null;
    }

    const init = variableDeclarator.node.init;
    if (!init) {
      return null;
    }

    if (init.type === 'ArrowFunctionExpression') {
      return {
        type: 'arrow' as const,
        node: init,
      };
    }

    if (init.type === 'FunctionExpression') {
      return {
        type: 'function' as const,
        node: init,
      };
    }

    return null;
  }

  return null;
}

type FunctionWrapper = Exclude<ReturnType<typeof buildFunctionWrapper>, null>;

function isJSXLike(value: any): value is JSXElement | JSXFragment {
  return value && (value.type === 'JSXElement' || value.type === 'JSXFragment');
}

function unwrapJSX(expression: any): UnwrappedJSX | null {
  let current = expression;
  while (current && current.type === 'ParenthesizedExpression') {
    current = current.expression;
  }

  if (isJSXLike(current)) {
    return { jsx: current };
  }

  return null;
}

function deriveTitleFromPath(filePath: string): string {
  const normalized = path.normalize(filePath);
  const segments = normalized.split(path.sep).filter(Boolean);

  let appSegmentIndex = -1;
  let fallbackAppIndex = -1;
  for (let index = 0; index < segments.length; index += 1) {
    if (segments[index] !== 'app') {
      continue;
    }

    if (index > 0 && segments[index - 1] === 'src') {
      appSegmentIndex = index;
      break;
    }

    if (fallbackAppIndex < 0) {
      fallbackAppIndex = index;
    }
  }

  if (appSegmentIndex < 0) {
    appSegmentIndex = fallbackAppIndex;
  }

  if (appSegmentIndex < 0) {
    return 'Page';
  }

  const routeSegments = segments.slice(appSegmentIndex + 1);
  if (routeSegments.length === 0) {
    return 'Page';
  }

  const fileName = routeSegments[routeSegments.length - 1];
  if (!/page\.tsx$/i.test(fileName)) {
    return 'Page';
  }

  routeSegments.pop();

  const relevantSegments = routeSegments.filter(
    (segment) => segment && !segment.startsWith('(') && !segment.startsWith('@'),
  );

  const lastSegment = relevantSegments[relevantSegments.length - 1];
  if (!lastSegment) {
    return 'Page';
  }

  const cleaned = lastSegment.replace(/\[|\]|\./g, '').replace(/%5B|%5D/g, '');
  const words = cleaned
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());

  const title = words.join(' ');
  return title || 'Page';
}

function hasExistingPageHeader(j: JSCodeshift, root: Collection<any>): boolean {
  return (
    root
      .find(j.JSXOpeningElement, {
        name: {
          type: 'JSXIdentifier',
          name: PAGE_HEADER_NAME,
        },
      })
      .size() > 0
  );
}

function ensurePageHeaderImport(j: JSCodeshift, root: Collection<any>) {
  const program = root.get().node;
  if (!program || program.type !== 'Program') {
    return;
  }

  const body = program.body;

  const existingImport = root
    .find(j.ImportDeclaration, {
      source: { value: PAGE_HEADER_SOURCE },
    })
    .paths()[0];

  if (existingImport) {
    const specifiers = existingImport.node.specifiers ?? [];
    const hasSpecifier = specifiers.some(
      (specifier) =>
        specifier.type === 'ImportSpecifier' &&
        specifier.imported.type === 'Identifier' &&
        specifier.imported.name === PAGE_HEADER_NAME,
    );

    if (!hasSpecifier) {
      specifiers.push(j.importSpecifier(j.identifier(PAGE_HEADER_NAME)));
      existingImport.node.specifiers = specifiers;
    }

    return;
  }

  const importDeclaration = j.importDeclaration(
    [j.importSpecifier(j.identifier(PAGE_HEADER_NAME))],
    j.literal(PAGE_HEADER_SOURCE),
  );

  let lastImportIndex = -1;
  for (let index = 0; index < body.length; index += 1) {
    if (body[index].type === 'ImportDeclaration') {
      lastImportIndex = index;
    }
  }

  if (lastImportIndex >= 0) {
    body.splice(lastImportIndex + 1, 0, importDeclaration);
  } else {
    body.unshift(importDeclaration);
  }
}

function createPageHeaderElement(j: JSCodeshift, title: string) {
  return j.jsxElement(
    j.jsxOpeningElement(
      j.jsxIdentifier(PAGE_HEADER_NAME),
      [
        j.jsxAttribute(j.jsxIdentifier('title'), j.stringLiteral(title)),
        j.jsxAttribute(j.jsxIdentifier('subtitle'), j.stringLiteral('')),
      ],
      true,
    ),
    null,
    [],
  );
}

type JSXChild = JSXElement | JSXFragment | JSXText | JSXExpressionContainer | JSXSpreadChild;

function insertPageHeaderIntoJSX(j: JSCodeshift, target: JSXElement | JSXFragment, title: string): boolean {
  const headerElement = createPageHeaderElement(j, title);

  const children = Array.from((target.children ?? []) as JSXChild[]);
  const newChildren: JSXChild[] = [];

  let insertPosition = 0;
  while (insertPosition < children.length) {
    const child = children[insertPosition];
    if (child.type === 'JSXText' && child.value.trim() === '') {
      newChildren.push(child);
      insertPosition += 1;
    } else {
      break;
    }
  }

  if (insertPosition === 0) {
    newChildren.push(j.jsxText(DEFAULT_INDENT));
  }

  newChildren.push(headerElement);

  const indentSource =
    insertPosition > 0 && children[insertPosition - 1].type === 'JSXText'
      ? (children[insertPosition - 1] as JSXText).value || DEFAULT_INDENT
      : DEFAULT_INDENT;

  newChildren.push(j.jsxText(indentSource));

  for (let index = insertPosition; index < children.length; index += 1) {
    newChildren.push(children[index]);
  }

  target.children = newChildren;
  return true;
}

function transformFunctionLike(j: JSCodeshift, wrapper: FunctionWrapper, title: string): boolean {
  if (wrapper.type === 'function') {
    const returnStatements = j(wrapper.node.body).find(j.ReturnStatement).nodes();

    for (const returnNode of returnStatements) {
      const candidate = unwrapJSX(returnNode.argument);
      if (candidate) {
        return insertPageHeaderIntoJSX(j, candidate.jsx, title);
      }
    }

    return false;
  }

  if (wrapper.type === 'arrow') {
    if (wrapper.node.body.type === 'BlockStatement') {
      const returnStatements = j(wrapper.node.body).find(j.ReturnStatement).nodes();

      for (const returnNode of returnStatements) {
        const candidate = unwrapJSX(returnNode.argument);
        if (candidate) {
          return insertPageHeaderIntoJSX(j, candidate.jsx, title);
        }
      }

      return false;
    }

    const candidate = unwrapJSX(wrapper.node.body);
    if (candidate) {
      return insertPageHeaderIntoJSX(j, candidate.jsx, title);
    }

    return false;
  }

  return false;
}

function isTargetFile(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  return /src\/app\/(?:.*\/)?page\.tsx$/.test(normalized);
}

export default function transformer(file: FileInfo, api: API, _options: Options) {
  if (!isTargetFile(file.path)) {
    return file.source;
  }

  const j = api.jscodeshift;
  const root = j(file.source);

  if (hasExistingPageHeader(j, root)) {
    return file.source;
  }

  const wrapper = buildFunctionWrapper(j, root);
  if (!wrapper) {
    return file.source;
  }

  const title = deriveTitleFromPath(file.path);

  const inserted = transformFunctionLike(j, wrapper, title);
  if (!inserted) {
    return file.source;
  }

  ensurePageHeaderImport(j, root);

  return root.toSource();
}
