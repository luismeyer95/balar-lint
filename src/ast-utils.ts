import * as ts from "typescript/lib/tsserverlibrary";

export function findContainingFunction(node: ts.Node): ts.Node | null {
  let current: ts.Node | undefined = node;

  while (current) {
    if (
      ts.isFunctionDeclaration(current) ||
      ts.isFunctionExpression(current) ||
      ts.isArrowFunction(current) ||
      ts.isMethodDeclaration(current)
    ) {
      return current;
    }
    current = current.parent;
  }

  return null;
}

export function getFunctionName(func: ts.Node): string | null {
  if (ts.isFunctionDeclaration(func) && func.name) {
    return func.name.text;
  }
  if ((ts.isFunctionExpression(func) || ts.isArrowFunction(func)) && ts.isVariableDeclaration(func.parent)) {
    if (ts.isIdentifier(func.parent.name)) {
      return func.parent.name.text;
    }
  }
  return null;
}

export function isNodeInside(node: ts.Node, container: ts.Node): boolean {
  let current: ts.Node | undefined = node;
  while (current) {
    if (current === container) return true;
    current = current.parent;
  }
  return false;
}
