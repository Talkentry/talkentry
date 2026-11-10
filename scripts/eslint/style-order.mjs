const isStyleName = (name) => name === 'styles' || /Styles$/.test(name);
const unwrapExport = (node) => node.declaration ?? node;

const isStyleDeclaration = (statement, containsStyleSheet) => {
  const node = unwrapExport(statement);
  if (node.type === 'FunctionDeclaration') {
    return (node.id && isStyleName(node.id.name)) || containsStyleSheet(node.body);
  }
  if (node.type !== 'VariableDeclaration') {
    return false;
  }
  return node.declarations.some(
    ({ id, init }) =>
      id.type === 'Identifier' && init && (isStyleName(id.name) || containsStyleSheet(init)),
  );
};

/** Enforces the same reading order for native StyleSheet and DOM style factories. */
export default {
  meta: {
    type: 'layout',
    docs: { description: 'Declare styles after UI, or import them from a neighboring file.' },
    fixable: 'code',
    schema: [],
    messages: {
      below: 'Move styles below the UI declarations, or into a neighboring *.styles.ts file.',
      extract:
        'Extract the style definition below the UI declarations or into a neighboring *.styles.ts file; keep only its factory call inside UI.',
    },
  },
  create(context) {
    const source = context.sourceCode;
    const uiStatements = new Set();
    const styleSheetImports = new Set();
    const inlineDefinitions = [];
    const topLevel = (node) => {
      let statement = node;
      while (statement.parent && statement.parent.type !== 'Program') {
        statement = statement.parent;
      }
      return statement;
    };
    const isStyleSheetCall = (node) =>
      node.type === 'CallExpression' &&
      node.callee.type === 'MemberExpression' &&
      node.callee.object.type === 'Identifier' &&
      styleSheetImports.has(node.callee.object.name) &&
      node.callee.property.name === 'create';
    const containsStyleSheet = (node) => {
      if (!node) {
        return false;
      }
      if (isStyleSheetCall(node)) {
        return true;
      }
      return (source.visitorKeys[node.type] ?? []).some((key) => {
        const child = node[key];
        return Array.isArray(child) ? child.some(containsStyleSheet) : containsStyleSheet(child);
      });
    };
    const rememberUi = (node) => {
      const statement = topLevel(node);
      if (statement.parent?.type === 'Program') {
        uiStatements.add(statement);
      }
    };

    return {
      CallExpression(node) {
        if (isStyleSheetCall(node)) {
          inlineDefinitions.push(node);
        }
      },
      VariableDeclarator(node) {
        if (
          node.id.type === 'Identifier' &&
          isStyleName(node.id.name) &&
          node.init?.type === 'ObjectExpression'
        ) {
          inlineDefinitions.push(node);
        }
      },
      ImportDeclaration(node) {
        if (node.source.value !== 'react-native') {
          return;
        }
        for (const specifier of node.specifiers) {
          if (specifier.type === 'ImportSpecifier' && specifier.imported.name === 'StyleSheet') {
            styleSheetImports.add(specifier.local.name);
          }
        }
      },
      JSXElement: rememberUi,
      JSXFragment: rememberUi,
      'Program:exit'(program) {
        for (const node of inlineDefinitions) {
          if (uiStatements.has(topLevel(node))) {
            context.report({ node, messageId: 'extract' });
          }
        }
        const lastUi = program.body.findLast((statement) => uiStatements.has(statement));
        if (!lastUi) {
          return;
        }
        for (const statement of program.body) {
          if (
            statement.range[0] >= lastUi.range[0] ||
            uiStatements.has(statement) ||
            !isStyleDeclaration(statement, containsStyleSheet)
          ) {
            continue;
          }
          // Only reorder declarations. Calls with observable initialization require review.
          const node = unwrapExport(statement);
          const movable =
            node.type === 'FunctionDeclaration' ||
            node.declarations.every(
              ({ init }) =>
                init && ['ArrowFunctionExpression', 'FunctionExpression'].includes(init.type),
            );
          context.report({
            node: statement,
            messageId: 'below',
            ...(movable
              ? {
                  fix(fixer) {
                    const comments = source.getCommentsBefore(statement);
                    const start = comments[0]?.range[0] ?? statement.range[0];
                    const range = [start, statement.range[1]];
                    const text = source.text.slice(...range);
                    return [fixer.removeRange(range), fixer.insertTextAfter(lastUi, `\n\n${text}`)];
                  },
                }
              : {}),
          });
        }
      },
    };
  },
};
