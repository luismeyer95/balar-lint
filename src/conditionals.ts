import * as ts from "typescript/lib/tsserverlibrary";
import { findContainingFunction, getFunctionName, isNodeInside } from "./ast-utils";
import { findCallSites } from "./call-tracking";

export function findConditionalParent(
  node: ts.Node,
  balarContextNode: ts.Node,
  balarIdentifiers: string[],
  program: ts.Program
): ts.Node | null {
  const directConditional = findDirectConditionalParent(node, balarContextNode, balarIdentifiers);
  if (directConditional) {
    return directConditional;
  }

  const containingFunction = findContainingFunction(node);
  if (containingFunction && containingFunction !== balarContextNode) {
    const visited = new Set<ts.Node>();
    return isFunctionCalledConditionally(containingFunction, balarContextNode, balarIdentifiers, program, visited);
  }

  return null;
}

export function findDirectConditionalParent(
  node: ts.Node,
  balarContextNode: ts.Node,
  balarIdentifiers: string[]
): ts.Node | null {
  let current: ts.Node | undefined = node.parent;

  while (current && current !== balarContextNode) {
    if (ts.isIfStatement(current)) {
      return current;
    }

    if (ts.isSwitchStatement(current)) {
      return current;
    }

    if (ts.isConditionalExpression(current)) {
      return current;
    }

    if (ts.isBinaryExpression(current)) {
      const op = current.operatorToken.kind;
      if (op === ts.SyntaxKind.AmpersandAmpersandToken || op === ts.SyntaxKind.BarBarToken) {
        if (isNodeInside(node, current.right)) {
          return current;
        }
      }
    }

    current = current.parent;
  }

  return null;
}

export function isFunctionCalledConditionally(
  func: ts.Node,
  balarContextNode: ts.Node,
  balarIdentifiers: string[],
  program: ts.Program,
  visited: Set<ts.Node>
): ts.Node | null {
  if (visited.has(func)) {
    return null;
  }
  visited.add(func);

  const functionName = getFunctionName(func);
  if (!functionName) {
    return null;
  }

  const callSites = findCallSites(func, program);

  for (const callSite of callSites) {
    const directConditional = findDirectConditionalParent(callSite, balarContextNode, balarIdentifiers);
    if (directConditional) {
      return directConditional;
    }

    const callingFunction = findContainingFunction(callSite);
    if (callingFunction && callingFunction !== balarContextNode) {
      const conditionalInChain = isFunctionCalledConditionally(
        callingFunction,
        balarContextNode,
        balarIdentifiers,
        program,
        visited
      );
      if (conditionalInChain) {
        return conditionalInChain;
      }
    }
  }

  return null;
}
