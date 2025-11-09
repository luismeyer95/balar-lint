import * as ts from "typescript/lib/tsserverlibrary";
import { findContainingFunction } from "./ast-utils";
import { findCallSites, findFunctionReferences, findMethodCallSites } from "./call-tracking";

export interface BalarContext {
  node: ts.Node;
  type: "run";
}

export function findBalarIdentifiers(sourceFile: ts.SourceFile): string[] {
  const identifiers: string[] = [];

  function visit(node: ts.Node) {
    if (ts.isImportDeclaration(node)) {
      const moduleSpecifier = node.moduleSpecifier;
      if (ts.isStringLiteral(moduleSpecifier) && moduleSpecifier.text === "balar") {
        const importClause = node.importClause;
        if (importClause && importClause.namedBindings) {
          if (ts.isNamedImports(importClause.namedBindings)) {
            for (const element of importClause.namedBindings.elements) {
              if (element.name.text === "balar" || element.propertyName?.text === "balar") {
                identifiers.push(element.name.text);
              }
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return identifiers;
}

export function isBalarWrappedCall(typeString: string): boolean {
  return (
    typeString.indexOf("Facade<") === 0 ||
    typeString.indexOf("ObjectFacade<") === 0 ||
    typeString === "Facade" ||
    typeString === "ObjectFacade"
  );
}

export function findBalarContext(node: ts.Node, balarIdentifiers: string[], program: ts.Program): BalarContext | null {
  const containingFunction = findContainingFunction(node);
  if (!containingFunction) {
    return null;
  }

  const visited = new Set<ts.Node>();
  return isFunctionInBalarContext(containingFunction, balarIdentifiers, program, visited);
}

export function isFunctionInBalarContext(
  func: ts.Node,
  balarIdentifiers: string[],
  program: ts.Program,
  visited: Set<ts.Node>
): BalarContext | null {
  if (visited.has(func)) {
    return null;
  }
  visited.add(func);

  const functionParent: ts.Node = func.parent;
  if (ts.isCallExpression(functionParent)) {
    const expr = functionParent.expression;

    if (ts.isPropertyAccessExpression(expr)) {
      const obj = expr.expression;
      const prop = expr.name.text;

      if (prop === "run" && ts.isIdentifier(obj)) {
        const funcSourceFile = func.getSourceFile();
        const localBalarIds = findBalarIdentifiers(funcSourceFile);

        if (
          localBalarIds.indexOf(obj.text) >= 0 &&
          functionParent.arguments.length >= 2 &&
          functionParent.arguments[1] === func
        ) {
          return { node: func, type: "run" };
        }
      }
    }

    const containingFunctionOfCall = findContainingFunction(functionParent);
    if (containingFunctionOfCall) {
      const context = isFunctionInBalarContext(containingFunctionOfCall, balarIdentifiers, program, visited);
      if (context) {
        return context;
      }
    }
  }

  let current: ts.Node | undefined = func.parent;
  while (current && !ts.isSourceFile(current)) {
    if (ts.isFunctionLike(current)) {
      break;
    }

    if (current.parent && ts.isCallExpression(current.parent)) {
      const callExpr = current.parent;
      if (callExpr.arguments.some((arg) => arg === current)) {
        const containingFunction = findContainingFunction(callExpr);
        if (containingFunction && containingFunction !== func) {
          const context = isFunctionInBalarContext(containingFunction, balarIdentifiers, program, visited);
          if (context) {
            return context;
          }
        }
        break;
      }
    }

    current = current.parent;
  }

  if (ts.isMethodDeclaration(func)) {
    const methodCallSites = findMethodCallSites(func, program);
    for (const callSite of methodCallSites) {
      const callingFunction = findContainingFunction(callSite);
      if (callingFunction) {
        const context = isFunctionInBalarContext(callingFunction, balarIdentifiers, program, visited);
        if (context) {
          return context;
        }
      }
    }
    return null;
  }

  const callSites = findCallSites(func, program);
  for (const callSite of callSites) {
    const callingFunction = findContainingFunction(callSite);
    if (callingFunction) {
      const context = isFunctionInBalarContext(callingFunction, balarIdentifiers, program, visited);
      if (context) {
        return context;
      }
    }
  }

  const references = findFunctionReferences(func, program);
  for (const ref of references) {
    if (ts.isCallExpression(ref.parent)) {
      const containingFunctionOfCall = findContainingFunction(ref.parent);
      if (containingFunctionOfCall) {
        const context = isFunctionInBalarContext(containingFunctionOfCall, balarIdentifiers, program, visited);
        if (context) {
          return context;
        }
      }
    }
  }

  return null;
}
