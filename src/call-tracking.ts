import * as ts from "typescript/lib/tsserverlibrary";
import { getFunctionName } from "./ast-utils";

export function findCallSites(functionDecl: ts.Node, program: ts.Program): ts.CallExpression[] {
  const callSites: ts.CallExpression[] = [];
  const checker = program.getTypeChecker();
  const functionName = getFunctionName(functionDecl);

  if (!functionName) {
    return callSites;
  }

  for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.isDeclarationFile) {
      continue;
    }

    function visit(node: ts.Node) {
      if (ts.isCallExpression(node)) {
        if (ts.isIdentifier(node.expression) && node.expression.text === functionName) {
          let symbol = checker.getSymbolAtLocation(node.expression);
          if (symbol) {
            if (symbol.flags & ts.SymbolFlags.Alias) {
              symbol = checker.getAliasedSymbol(symbol);
            }

            const declarations = symbol.declarations;
            if (declarations) {
              for (const decl of declarations) {
                if (decl === functionDecl) {
                  callSites.push(node);
                  break;
                }
              }
            }
          }
        }
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
  }

  return callSites;
}

export function findFunctionReferences(functionDecl: ts.Node, program: ts.Program): ts.Identifier[] {
  const references: ts.Identifier[] = [];
  const checker = program.getTypeChecker();
  const functionName = getFunctionName(functionDecl);

  if (!functionName) {
    return references;
  }

  for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.isDeclarationFile) {
      continue;
    }

    function visit(node: ts.Node) {
      if (ts.isIdentifier(node) && node.text === functionName) {
        if (node.parent === functionDecl || node === functionDecl) {
          ts.forEachChild(node, visit);
          return;
        }

        if (ts.isCallExpression(node.parent) && node.parent.expression === node) {
          ts.forEachChild(node, visit);
          return;
        }

        let symbol = checker.getSymbolAtLocation(node);
        if (symbol) {
          if (symbol.flags & ts.SymbolFlags.Alias) {
            symbol = checker.getAliasedSymbol(symbol);
          }

          const declarations = symbol.declarations;
          if (declarations) {
            for (const decl of declarations) {
              if (decl === functionDecl) {
                references.push(node);
                break;
              }
            }
          }
        }
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
  }

  return references;
}

export function findMethodCallSites(methodDecl: ts.MethodDeclaration, program: ts.Program): ts.CallExpression[] {
  const callSites: ts.CallExpression[] = [];
  const checker = program.getTypeChecker();

  if (!methodDecl.name || !ts.isIdentifier(methodDecl.name)) {
    return callSites;
  }

  const methodName = methodDecl.name.text;

  const methodSymbolOrUndefined = checker.getSymbolAtLocation(methodDecl.name);
  if (!methodSymbolOrUndefined) {
    return callSites;
  }
  const methodSymbol: ts.Symbol = methodSymbolOrUndefined;

  for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.isDeclarationFile) {
      continue;
    }

    function visit(node: ts.Node) {
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
        const propAccess = node.expression;
        if (ts.isIdentifier(propAccess.name) && propAccess.name.text === methodName) {
          const calledSymbol = checker.getSymbolAtLocation(propAccess.name);
          if (calledSymbol) {
            if (isMethodMatch(methodSymbol, calledSymbol, checker)) {
              callSites.push(node);
            }
          }
        }
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
  }

  return callSites;
}

export function isMethodMatch(targetSymbol: ts.Symbol, calledSymbol: ts.Symbol | undefined, checker: ts.TypeChecker): boolean {
  if (!calledSymbol) {
    return false;
  }
  if (targetSymbol === calledSymbol) {
    return true;
  }

  const targetDecls = targetSymbol.declarations || [];
  const calledDecls = calledSymbol.declarations || [];

  for (const targetDecl of targetDecls) {
    for (const calledDecl of calledDecls) {
      if (targetDecl === calledDecl) {
        return true;
      }
    }
  }

  for (const targetDecl of targetDecls) {
    if (ts.isMethodSignature(targetDecl) || ts.isMethodDeclaration(targetDecl)) {
      for (const calledDecl of calledDecls) {
        if (ts.isMethodSignature(calledDecl) || ts.isMethodDeclaration(calledDecl)) {
          if (areMethodsRelated(targetDecl, calledDecl, checker)) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

export function areMethodsRelated(
  method1: ts.MethodSignature | ts.MethodDeclaration,
  method2: ts.MethodSignature | ts.MethodDeclaration,
  checker: ts.TypeChecker
): boolean {
  const type1 = method1.parent;
  const type2 = method2.parent;

  if (!type1 || !type2) {
    return false;
  }

  if (ts.isInterfaceDeclaration(type1) && ts.isClassDeclaration(type2)) {
    return classImplementsInterface(type2, type1, checker);
  }

  if (ts.isClassDeclaration(type1) && ts.isInterfaceDeclaration(type2)) {
    return classImplementsInterface(type1, type2, checker);
  }

  return false;
}

export function classImplementsInterface(
  classDecl: ts.ClassDeclaration,
  interfaceDecl: ts.InterfaceDeclaration,
  checker: ts.TypeChecker
): boolean {
  if (!classDecl.heritageClauses) {
    return false;
  }

  for (const heritage of classDecl.heritageClauses) {
    if (heritage.token === ts.SyntaxKind.ImplementsKeyword) {
      for (const type of heritage.types) {
        const symbol = checker.getSymbolAtLocation(type.expression);
        if (symbol) {
          const declarations = symbol.declarations || [];
          for (const decl of declarations) {
            if (decl === interfaceDecl) {
              return true;
            }
          }
        }
      }
    }
  }

  return false;
}
