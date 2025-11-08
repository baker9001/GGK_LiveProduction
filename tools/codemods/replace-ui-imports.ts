import type { API, Collection, FileInfo, ImportDeclaration, ImportSpecifier, JSCodeshift, Options } from 'jscodeshift';

/**
 * Codemod: replace-ui-imports
 *
 * Rewrites legacy component imports (e.g. shadcn/ui) so that they point to the
 * GGK shared component library under `src/components/shared/`.
 *
 * Behaviour:
 * - Moves recognised component specifiers to their canonical shared component path.
 * - Preserves local aliases and default imports.
 * - Avoids duplicate imports by merging with existing declarations for the same path.
 * - Deletes empty import declarations.
 * - Inserts new import declarations in alphabetical order by source and sorts
 *   the specifiers alphabetically by local name for consistency.
 */

const SHARED_COMPONENT_BASE_PATH = 'src/components/shared/';

const COMPONENT_TO_SOURCE: Record<string, string> = {
  Badge: `${SHARED_COMPONENT_BASE_PATH}Badge`,
  Button: `${SHARED_COMPONENT_BASE_PATH}Button`,
  Card: `${SHARED_COMPONENT_BASE_PATH}Card`,
  CardContent: `${SHARED_COMPONENT_BASE_PATH}Card`,
  CardFooter: `${SHARED_COMPONENT_BASE_PATH}Card`,
  CardHeader: `${SHARED_COMPONENT_BASE_PATH}Card`,
  FilterPanel: `${SHARED_COMPONENT_BASE_PATH}FilterPanel`,
  FormField: `${SHARED_COMPONENT_BASE_PATH}FormField`,
  Input: `${SHARED_COMPONENT_BASE_PATH}Input`,
  PageHeader: `${SHARED_COMPONENT_BASE_PATH}PageHeader`,
  Select: `${SHARED_COMPONENT_BASE_PATH}Select`,
  Switch: `${SHARED_COMPONENT_BASE_PATH}Toggle`,
  Table: `${SHARED_COMPONENT_BASE_PATH}Table`,
  Toggle: `${SHARED_COMPONENT_BASE_PATH}Toggle`,
};

interface SpecifierInfo {
  type: 'named' | 'default';
  imported: string;
  local: string;
}

const SPECIFIER_SET_KEY_SEPARATOR = '::';

type ImportSpecifierWithKind = ImportSpecifier & { importKind?: 'type' | 'value' };

type MutableImportDeclaration = ImportDeclaration & {
  specifiers: Array<ImportSpecifierWithKind | ImportDeclaration['specifiers'][number]>;
};

function getSpecifierKey(info: SpecifierInfo): string {
  return `${info.type}${SPECIFIER_SET_KEY_SEPARATOR}${info.imported}${SPECIFIER_SET_KEY_SEPARATOR}${info.local}`;
}

function sortNamedSpecifiers(specifiers: ImportDeclaration['specifiers']): ImportDeclaration['specifiers'] {
  const defaultSpecifiers: ImportDeclaration['specifiers'] = [];
  const namedSpecifiers: ImportDeclaration['specifiers'] = [];

  (specifiers || []).forEach((specifier) => {
    if (!specifier) {
      return;
    }

    if (specifier.type === 'ImportDefaultSpecifier') {
      defaultSpecifiers.push(specifier);
    } else if (specifier.type === 'ImportSpecifier') {
      namedSpecifiers.push(specifier);
    } else {
      namedSpecifiers.push(specifier);
    }
  });

  const sortKey = (specifier: ImportDeclaration['specifiers'][number]): string => {
    if (!specifier) {
      return '';
    }
    if (specifier.type === 'ImportDefaultSpecifier') {
      return specifier.local?.name ?? '';
    }
    if (specifier.type === 'ImportSpecifier') {
      const importedName = specifier.imported.type === 'Identifier' ? specifier.imported.name : String(specifier.imported.value);
      const localName = specifier.local?.name ?? importedName;
      return localName;
    }
    return '';
  };

  namedSpecifiers.sort((a, b) => {
    const aKey = sortKey(a).toLowerCase();
    const bKey = sortKey(b).toLowerCase();
    if (aKey < bKey) return -1;
    if (aKey > bKey) return 1;
    return 0;
  });

  defaultSpecifiers.sort((a, b) => {
    const aKey = sortKey(a).toLowerCase();
    const bKey = sortKey(b).toLowerCase();
    if (aKey < bKey) return -1;
    if (aKey > bKey) return 1;
    return 0;
  });

  return [...defaultSpecifiers, ...namedSpecifiers];
}

function insertImportSorted(root: Collection<any>, newImport: ImportDeclaration) {
  const program = root.get().node;
  if (program.type !== 'Program') {
    return;
  }

  const body = program.body;
  const newSource = String((newImport.source as { value: string }).value);
  const importIndices = body
    .map((node, index) => (node.type === 'ImportDeclaration' ? index : -1))
    .filter((index) => index >= 0);

  if (importIndices.length === 0) {
    body.unshift(newImport);
    return;
  }

  for (const index of importIndices) {
    const existing = body[index] as ImportDeclaration;
    const existingSource = String((existing.source as { value: string }).value);
    if (newSource.localeCompare(existingSource) < 0) {
      body.splice(index, 0, newImport);
      return;
    }
  }

  const lastIndex = importIndices[importIndices.length - 1];
  body.splice(lastIndex + 1, 0, newImport);
}

function buildSpecifierNodes(j: JSCodeshift, specs: SpecifierInfo[]) {
  return specs.map((info) => {
    if (info.type === 'default') {
      return j.importDefaultSpecifier(j.identifier(info.local));
    }
    const imported = j.identifier(info.imported);
    const local = info.local !== info.imported ? j.identifier(info.local) : undefined;
    return j.importSpecifier(imported, local);
  });
}

export default function transformer(file: FileInfo, api: API, _options: Options) {
  const j = api.jscodeshift;
  const root = j(file.source);

  const additions = new Map<string, SpecifierInfo[]>();

  root.find(j.ImportDeclaration).forEach((path) => {
    const node = path.node as MutableImportDeclaration;

    if (node.importKind === 'type') {
      return;
    }

    const sourceValue = node.source.value;
    if (typeof sourceValue !== 'string') {
      return;
    }

    const specifiers = node.specifiers ?? [];
    const updatedSpecifiers = specifiers.filter((specifier) => {
      if (!specifier) {
        return false;
      }

      if (specifier.type === 'ImportSpecifier') {
        if ((specifier as ImportSpecifierWithKind).importKind === 'type') {
          return true;
        }
        const importedName =
          specifier.imported.type === 'Identifier'
            ? specifier.imported.name
            : String(specifier.imported.value);
        const targetPath = COMPONENT_TO_SOURCE[importedName];
        if (!targetPath || targetPath === sourceValue) {
          return true;
        }

        const localName = specifier.local?.name ?? importedName;
        const specInfo: SpecifierInfo = { type: 'named', imported: importedName, local: localName };
        const bucket = additions.get(targetPath) ?? [];
        bucket.push(specInfo);
        additions.set(targetPath, bucket);
        return false;
      }

      if (specifier.type === 'ImportDefaultSpecifier') {
        const localName = specifier.local?.name;
        if (!localName) {
          return true;
        }
        const targetPath = COMPONENT_TO_SOURCE[localName];
        if (!targetPath || targetPath === sourceValue) {
          return true;
        }

        const specInfo: SpecifierInfo = { type: 'default', imported: localName, local: localName };
        const bucket = additions.get(targetPath) ?? [];
        bucket.push(specInfo);
        additions.set(targetPath, bucket);
        return false;
      }

      return true;
    });

    if (updatedSpecifiers.length === 0) {
      path.prune();
    } else if (updatedSpecifiers.length !== specifiers.length) {
      node.specifiers = updatedSpecifiers;
    }
  });

  additions.forEach((specInfos, targetPath) => {
    const uniqueSpecMap = new Map<string, SpecifierInfo>();
    specInfos.forEach((info) => {
      uniqueSpecMap.set(getSpecifierKey(info), info);
    });

    const uniqueSpecs = Array.from(uniqueSpecMap.values());

    const existingImportPath = root
      .find(j.ImportDeclaration, {
        source: { value: targetPath },
      })
      .filter((importPath) => importPath.node.importKind !== 'type')
      .paths()[0];

    if (existingImportPath) {
      const existingNode = existingImportPath.node as MutableImportDeclaration;
      const existingSpecifiers = existingNode.specifiers ?? [];
      const existingKeys = new Set<string>();

      existingSpecifiers.forEach((specifier) => {
        if (!specifier) {
          return;
        }
        if (specifier.type === 'ImportDefaultSpecifier') {
          const localName = specifier.local?.name;
          if (localName) {
            existingKeys.add(getSpecifierKey({ type: 'default', imported: localName, local: localName }));
          }
          return;
        }
        if (specifier.type === 'ImportSpecifier') {
          if ((specifier as ImportSpecifierWithKind).importKind === 'type') {
            return;
          }
          const importedName =
            specifier.imported.type === 'Identifier'
              ? specifier.imported.name
              : String(specifier.imported.value);
          const localName = specifier.local?.name ?? importedName;
          existingKeys.add(getSpecifierKey({ type: 'named', imported: importedName, local: localName }));
        }
      });

      uniqueSpecs.forEach((info) => {
        if (existingKeys.has(getSpecifierKey(info))) {
          return;
        }
        const newSpecifierNodes = buildSpecifierNodes(j, [info]);
        existingSpecifiers.push(...newSpecifierNodes);
      });

      existingNode.specifiers = sortNamedSpecifiers(existingSpecifiers);
      return;
    }

    const newSpecifierNodes = buildSpecifierNodes(j, uniqueSpecs);
    const sortedSpecifiers = sortNamedSpecifiers(newSpecifierNodes);
    const newImport = j.importDeclaration(sortedSpecifiers, j.literal(targetPath));
    insertImportSorted(root, newImport);
  });

  return root.toSource({ quote: 'single', trailingComma: true });
}
