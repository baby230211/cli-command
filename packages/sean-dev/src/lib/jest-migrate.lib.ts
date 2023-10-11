import ts from 'typescript';

// Creating a printer here, so we can print an TS node
const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

export function migrateToVitest(content: string) {
  const sourceFile = ts.createSourceFile(
    '',
    content,
    ts.ScriptTarget.Latest,
    true
  );
  const renameAllAddIdentifiersToVi =
    (context: ts.TransformationContext) => (rootNode: ts.Node) => {
      const visit = (node: ts.Node): ts.Node => {
        const newNode = ts.visitEachChild(node, visit, context);
        if (
          ts.isObjectLiteralExpression(node) &&
          (ts.isReturnStatement(node.parent) ||
            ts.isParenthesizedExpression(node.parent)) &&
          node.parent.parent.parent.parent.getText().includes('jest.mock') &&
          node?.getChildAt(0)?.getChildAt(0)?.getChildAt(0)?.getText() !==
            'default'
        ) {
          let shouldSkip = false;
          let dummyNode: ts.Node;
          node.forEachChild(node => {
            node.forEachChild(node => {
              if (ts.isIdentifier(node) && node.text === 'default') {
                shouldSkip = true;
                dummyNode = node.parent;
              }
            });
          });
          if (shouldSkip) {
            // @ts-ignore
            return context.factory.createObjectLiteralExpression([dummyNode]);
          }

          return context.factory.createObjectLiteralExpression([
            context.factory.createPropertyAssignment('default', node)
          ]);
        }

        // change require to import

        if (ts.isVariableStatement(node)) {
          let hasRequire = false;
          let nameOfRequireConst: string = '';
          let stringLiteral: string = '';
          node.forEachChild(parentNode => {
            parentNode.forEachChild(cbNode => {
              cbNode.forEachChild(cbNode2 => {
                if (ts.isIdentifier(cbNode2)) {
                  nameOfRequireConst = cbNode2.getText();
                }
                if (ts.isCallExpression(cbNode2)) {
                  hasRequire = cbNode2.getChildAt(0).getText() === 'require';
                  stringLiteral = cbNode2.getChildAt(2).getText();
                }
              });
            });
          });
          if (hasRequire && nameOfRequireConst && stringLiteral) {
            return context.factory.createImportDeclaration(
              undefined,
              context.factory.createImportClause(
                false,
                context.factory.createIdentifier(nameOfRequireConst),
                undefined
              ),
              context.factory.createStringLiteral(
                stringLiteral.replaceAll('"', '')
              )
            );
          }
        }

        if (ts.isIdentifier(newNode) && newNode.text === 'jest') {
          return context.factory.createIdentifier('vi');
        }
        return newNode;
      };

      return ts.visitNode(rootNode, visit);
    };
  const transformationResult = ts.transform(sourceFile, [
    renameAllAddIdentifiersToVi
  ]);

  return printer.printNode(
    ts.EmitHint.Unspecified,
    transformationResult.transformed[0],
    ts.createSourceFile('', '', ts.ScriptTarget.Latest)
  );
}

// function addImport(
//   toImport: { name: string; path: string },
//   sourceFile: ts.SourceFile
// ): Replacement {
//   const allImports = findNodes(sourceFile, ts.SyntaxKind.ImportDeclaration);

//   const toInsert = `\nimport { ${toImport.name} } from '${toImport.path}';`;
//   return insertToTheEnd(allImports, toInsert);
// }

// function insertToTheEnd(nodes: any[], toInsert: string): Replacement {
//   const lastItem = nodes
//     .sort(
//       (first: ts.Node, second: ts.Node): number =>
//         first.getStart() - second.getStart()
//     )
//     .pop();
//   const atPosition: number = lastItem.getEnd();

//   return { atPosition, toInsert };
// }

export function findNodes(node: ts.Node, kind: ts.SyntaxKind): any[] {
  const arr: any[] = [];
  if (node.kind === kind) {
    arr.push(node);
  }

  for (const child of node.getChildren()) {
    findNodes(child, kind).forEach(node => {
      arr.push(node);
    });
  }

  return arr;
}
