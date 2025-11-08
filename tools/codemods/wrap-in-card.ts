import type {
  API,
  Collection,
  FileInfo,
  JSCodeshift,
  JSXAttribute,
  JSXElement,
  JSXExpressionContainer,
  JSXFragment,
  JSXIdentifier,
  JSXMemberExpression,
  JSXSpreadChild,
  JSXText,
  Options,
  ReturnStatement,
} from 'jscodeshift';

/**
 * Codemod: wrap-in-card
 *
 * Wraps top-level JSX blocks within page components in the shared <Card />
 * container so that unstyled sections align with the updated GGK design
 * system. The codemod targets files matching `src/app/**/page.tsx` and keeps
 * the transformation idempotent by avoiding double wrapping and duplicate
 * imports.
 */

const CARD_NAME = 'Card';
const CARD_CONTENT_NAME = 'CardContent';
const CARD_SOURCE = 'src/components/shared/Card';

interface FunctionWrapper {
  type: 'function' | 'arrow';
  node: any;
}

interface UnwrappedJSX {
  jsx: JSXElement | JSXFragment;
  replace(newExpression: JSXElement | JSXFragment): void;
}

type JSXChild = JSXElement | JSXFragment | JSXExpressionContainer | JSXSpreadChild | JSXText | any;

function findDefaultExportedComponent(j: JSCodeshift, root: Collection<any>): FunctionWrapper | null {
  const defaultExport = root.find(j.ExportDefaultDeclaration).paths()[0];
  if (!defaultExport) {
    return null;
  }

  const declaration = defaultExport.node.declaration;
  if (!declaration) {
    return null;
  }

  if (declaration.type === 'FunctionDeclaration' || declaration.type === 'FunctionExpression') {
    return { type: 'function', node: declaration };
  }

  if (declaration.type === 'ArrowFunctionExpression') {
    return { type: 'arrow', node: declaration };
  }

  if (declaration.type === 'Identifier') {
    const identifierName = declaration.name;

    const functionDeclaration = root
      .find(j.FunctionDeclaration, {
        id: { type: 'Identifier', name: identifierName },
      })
      .paths()[0];

    if (functionDeclaration) {
      return { type: 'function', node: functionDeclaration.node };
    }

    const variableDeclarator = root
      .find(j.VariableDeclarator, {
        id: { type: 'Identifier', name: identifierName },
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
      return { type: 'arrow', node: init };
    }

    if (init.type === 'FunctionExpression') {
      return { type: 'function', node: init };
    }

    return null;
  }

  return null;
}

function unwrapJSX(value: any): JSXElement | JSXFragment | null {
  let current = value;
  while (current && current.type === 'ParenthesizedExpression') {
    current = current.expression;
  }

  if (current && (current.type === 'JSXElement' || current.type === 'JSXFragment')) {
    return current;
  }

  return null;
}

function extractReturnedJSX(wrapper: FunctionWrapper): UnwrappedJSX | null {
  if (wrapper.type === 'arrow') {
    const body = wrapper.node.body;
    const unwrapped = unwrapJSX(body);

    if (unwrapped) {
      return {
        jsx: unwrapped,
        replace(newExpression) {
          wrapper.node.body = newExpression;
        },
      };
    }

    if (body.type === 'BlockStatement') {
      const returnStmt = body.body.find((statement: any) => statement.type === 'ReturnStatement');
      if (!returnStmt) {
        return null;
      }

      const unwrappedReturn = unwrapJSX(returnStmt.argument);
      if (!unwrappedReturn) {
        return null;
      }

      return {
        jsx: unwrappedReturn,
        replace(newExpression) {
          returnStmt.argument = newExpression;
        },
      };
    }

    return null;
  }

  if (!wrapper.node.body) {
    return null;
  }

  const returnStatement: ReturnStatement | undefined = wrapper.node.body.body.find(
    (statement: any) => statement.type === 'ReturnStatement',
  );

  if (!returnStatement || !returnStatement.argument) {
    return null;
  }

  const unwrapped = unwrapJSX(returnStatement.argument);
  if (!unwrapped) {
    return null;
  }

  return {
    jsx: unwrapped,
    replace(newExpression) {
      returnStatement.argument = newExpression;
    },
  };
}

function getElementName(name: JSXElement['openingElement']['name']): string | null {
  if (!name) {
    return null;
  }

  if (name.type === 'JSXIdentifier') {
    return name.name;
  }

  if (name.type === 'JSXMemberExpression') {
    const parts: string[] = [];
    let current: JSXMemberExpression | JSXIdentifier = name;
    while (current.type === 'JSXMemberExpression') {
      if (current.property.type === 'JSXIdentifier') {
        parts.unshift(current.property.name);
      }
      if (current.object.type === 'JSXIdentifier') {
        parts.unshift(current.object.name);
        break;
      }
      current = current.object;
    }
    return parts.join('.');
  }

  return null;
}

function hasLayoutClassName(attribute: JSXAttribute | undefined): boolean {
  if (!attribute || attribute.value == null) {
    return false;
  }

  if (attribute.value.type === 'StringLiteral') {
    return /(grid|flex|space-|gap-|container)/.test(attribute.value.value);
  }

  if (attribute.value.type === 'Literal' && typeof attribute.value.value === 'string') {
    return /(grid|flex|space-|gap-|container)/.test(attribute.value.value);
  }

  if (attribute.value.type === 'JSXExpressionContainer') {
    const expression = attribute.value.expression;
    if (expression.type === 'StringLiteral' || expression.type === 'Literal') {
      const literalValue = expression.value;
      if (typeof literalValue === 'string') {
        return /(grid|flex|space-|gap-|container)/.test(literalValue);
      }
    }
  }

  return false;
}

function isLayoutElement(element: JSXElement): boolean {
  const name = getElementName(element.openingElement.name);
  if (!name) {
    return false;
  }

  if (name === 'main') {
    return true;
  }

  if (name === 'section') {
    const classNameAttr = element.openingElement.attributes?.find(
      (attr): attr is JSXAttribute => attr.type === 'JSXAttribute' && attr.name.name === 'className',
    );
    return hasLayoutClassName(classNameAttr);
  }

  return false;
}

function isCardElement(element: JSXElement): boolean {
  const name = getElementName(element.openingElement.name);
  return name === CARD_NAME;
}

function isPageHeader(element: JSXElement): boolean {
  const name = getElementName(element.openingElement.name);
  return name === 'PageHeader';
}

function createCardWrapper(j: JSCodeshift, child: JSXElement | JSXFragment): JSXElement {
  const cardOpening = j.jsxOpeningElement(j.jsxIdentifier(CARD_NAME), [
    j.jsxAttribute(j.jsxIdentifier('className'), j.stringLiteral('mb-6')),
  ]);
  const cardClosing = j.jsxClosingElement(j.jsxIdentifier(CARD_NAME));

  const contentOpening = j.jsxOpeningElement(j.jsxIdentifier(CARD_CONTENT_NAME), []);
  const contentClosing = j.jsxClosingElement(j.jsxIdentifier(CARD_CONTENT_NAME));

  const cardContent = j.jsxElement(contentOpening, contentClosing, [child as any]);

  return j.jsxElement(cardOpening, cardClosing, [cardContent]);
}

function processChildren(
  j: JSCodeshift,
  children: JSXChild[] = [],
): { children: JSXChild[]; changed: boolean } {
  let changed = false;
  const newChildren = children.map((child) => {
    if (!child) {
      return child;
    }

    if (child.type === 'JSXElement') {
      if (isCardElement(child) || isPageHeader(child)) {
        return child;
      }

      if (isLayoutElement(child)) {
        const nested = processChildren(j, child.children as JSXChild[]);
        if (nested.changed) {
          child.children = nested.children as any;
          changed = true;
        }
        return child;
      }

      changed = true;
      return createCardWrapper(j, child);
    }

    if (child.type === 'JSXFragment') {
      const nested = processChildren(j, child.children as JSXChild[]);
      if (nested.changed) {
        child.children = nested.children as any;
        changed = true;
      }
      return child;
    }

    return child;
  });

  return { children: newChildren, changed };
}

function applyWraps(j: JSCodeshift, rootJSX: JSXElement | JSXFragment): { expression: any; changed: boolean } {
  if (rootJSX.type === 'JSXFragment') {
    const processed = processChildren(j, rootJSX.children as JSXChild[]);
    if (processed.changed) {
      rootJSX.children = processed.children as any;
    }
    return { expression: rootJSX, changed: processed.changed };
  }

  if (isCardElement(rootJSX) || isPageHeader(rootJSX)) {
    return { expression: rootJSX, changed: false };
  }

  if (isLayoutElement(rootJSX)) {
    const processed = processChildren(j, rootJSX.children as JSXChild[]);
    if (processed.changed) {
      rootJSX.children = processed.children as any;
    }
    return { expression: rootJSX, changed: processed.changed };
  }

  return { expression: createCardWrapper(j, rootJSX), changed: true };
}

function ensureCardImports(j: JSCodeshift, root: Collection<any>): boolean {
  const importDeclarations = root.find(j.ImportDeclaration);
  const existing = importDeclarations.filter(
    (path) => path.node.source.value === CARD_SOURCE,
  );

  if (existing.size() > 0) {
    let updated = false;
    existing.forEach((path) => {
      const specifiers = path.node.specifiers ?? [];
      const hasCard = specifiers.some(
        (specifier) => specifier.type === 'ImportSpecifier' && specifier.imported.name === CARD_NAME,
      );
      const hasCardContent = specifiers.some(
        (specifier) =>
          specifier.type === 'ImportSpecifier' && specifier.imported.name === CARD_CONTENT_NAME,
      );

      const additions = [] as any[];
      if (!hasCard) {
        additions.push(j.importSpecifier(j.identifier(CARD_NAME)));
      }
      if (!hasCardContent) {
        additions.push(j.importSpecifier(j.identifier(CARD_CONTENT_NAME)));
      }

      if (additions.length > 0) {
        path.node.specifiers = [...specifiers, ...additions];
        updated = true;
      }
    });

    return updated;
  }

  const newImport = j.importDeclaration(
    [
      j.importSpecifier(j.identifier(CARD_NAME)),
      j.importSpecifier(j.identifier(CARD_CONTENT_NAME)),
    ],
    j.literal(CARD_SOURCE),
  );

  if (importDeclarations.size() > 0) {
    importDeclarations.at(importDeclarations.size() - 1).insertAfter(newImport);
  } else {
    root.get().node.program.body.unshift(newImport);
  }

  return true;
}

export default function transformer(file: FileInfo, api: API, options: Options) {
  const j = api.jscodeshift;
  const root = j(file.source);

  const isPageComponent = /\bsrc\/app\/.+\/page\.tsx$/.test(file.path);
  if (!isPageComponent) {
    return file.source;
  }

  const wrapper = findDefaultExportedComponent(j, root);
  if (!wrapper) {
    return file.source;
  }

  const returned = extractReturnedJSX(wrapper);
  if (!returned) {
    return file.source;
  }

  const { expression, changed } = applyWraps(j, returned.jsx);
  if (!changed) {
    return file.source;
  }

  returned.replace(expression);

  ensureCardImports(j, root);
  const result = root.toSource(options.printOptions || { quote: 'single' });

  return result;
}

