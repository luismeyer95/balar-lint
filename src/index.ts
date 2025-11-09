import type * as ts from "typescript/lib/tsserverlibrary";

function init(modules: { typescript: typeof import("typescript/lib/tsserverlibrary") }) {
  const ts = modules.typescript;

  function create(info: ts.server.PluginCreateInfo) {
    const proxy: ts.LanguageService = Object.create(null);
    for (let k of Object.keys(info.languageService) as Array<keyof ts.LanguageService>) {
      const x = info.languageService[k]!;
      // @ts-ignore - JS runtime trickery for creating a proxy object
      proxy[k] = (...args: Array<{}>) => x.apply(info.languageService, args);
    }

    proxy.getSemanticDiagnostics = (fileName) => {
      const prior = info.languageService.getSemanticDiagnostics(fileName);
      const maybeProgram = info.languageService.getProgram();
      if (!maybeProgram) return prior;

      // TypeScript control flow analysis doesn't work through closures
      const program: ts.Program = maybeProgram;

      const maybeSourceFile = program.getSourceFile(fileName);
      if (!maybeSourceFile) return prior;
      const sourceFile: ts.SourceFile = maybeSourceFile;

      const checker = program.getTypeChecker();
      const newDiagnostics: ts.Diagnostic[] = [];

      const balarIdentifiers = findBalarIdentifiers(sourceFile);
      if (balarIdentifiers.length === 0) {
        return prior;
      }

      function visit(node: ts.Node) {
        if (ts.isCallExpression(node)) {
          if (ts.isPropertyAccessExpression(node.expression)) {
            const objType = checker.getTypeAtLocation(node.expression.expression);
            const objTypeString = checker.typeToString(objType);

            if (isBalarWrappedCall(objTypeString)) {
              const balarContext = findBalarContext(node, balarIdentifiers, program);

              if (!balarContext) {
                newDiagnostics.push({
                  file: sourceFile,
                  start: node.getStart(),
                  length: node.getWidth(),
                  messageText: "Balar-wrapped function must be called inside a balar.run() context",
                  category: ts.DiagnosticCategory.Error,
                  code: 9001,
                });
              } else {
                const conditionalParent = findConditionalParent(node, balarContext.node, balarIdentifiers, program);
                if (conditionalParent) {
                  newDiagnostics.push({
                    file: sourceFile,
                    start: node.getStart(),
                    length: node.getWidth(),
                    messageText:
                      "Balar-wrapped function must not be called conditionally inside balar.run(). Use balar.if() or balar.switch() instead.",
                    category: ts.DiagnosticCategory.Error,
                    code: 9002,
                  });
                }
              }
            }
          }
        }

        ts.forEachChild(node, visit);
      }

      visit(sourceFile);

      return [...prior, ...newDiagnostics];
    };

    return proxy;
  }

  // Handles import aliasing like: import { balar as b } from 'balar'
  function findBalarIdentifiers(sourceFile: ts.SourceFile): string[] {
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

  // Detects types returned by balar.wrap.fns() and balar.wrap.object()
  function isBalarWrappedCall(typeString: string): boolean {
    return (
      typeString.indexOf("Facade<") === 0 ||
      typeString.indexOf("ObjectFacade<") === 0 ||
      typeString === "Facade" ||
      typeString === "ObjectFacade"
    );
  }

  interface BalarContext {
    node: ts.Node;
    type: "run";
  }

  function findBalarContext(node: ts.Node, balarIdentifiers: string[], program: ts.Program): BalarContext | null {
    const containingFunction = findContainingFunction(node);
    if (!containingFunction) {
      return null;
    }

    const visited = new Set<ts.Node>();
    return isFunctionInBalarContext(containingFunction, balarIdentifiers, program, visited);
  }

  function findContainingFunction(node: ts.Node): ts.Node | null {
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

  function isFunctionInBalarContext(
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

      // Check if directly passed to balar.run()
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

      // For any other call (balar.if/switch, helper functions, etc.),
      // recursively check if the call itself is in context
      const containingFunctionOfCall = findContainingFunction(functionParent);
      if (containingFunctionOfCall) {
        const context = isFunctionInBalarContext(containingFunctionOfCall, balarIdentifiers, program, visited);
        if (context) {
          return context;
        }
      }
    }

    const functionName = getFunctionName(func);
    if (!functionName) {
      return null;
    }

    // Check if function is called from within a balar context
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

    // Check if function is passed as argument (e.g., helperA(helperB))
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

  function getFunctionName(func: ts.Node): string | null {
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

  function findCallSites(functionDecl: ts.Node, program: ts.Program): ts.CallExpression[] {
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
              // Resolve through import aliases to match the exact declaration
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

  function findFunctionReferences(functionDecl: ts.Node, program: ts.Program): ts.Identifier[] {
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

          // Skip call positions (handled by findCallSites)
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

  function isNodeInside(node: ts.Node, container: ts.Node): boolean {
    let current: ts.Node | undefined = node;
    while (current) {
      if (current === container) return true;
      current = current.parent;
    }
    return false;
  }

  function findConditionalParent(
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

  function findDirectConditionalParent(
    node: ts.Node,
    balarContextNode: ts.Node,
    balarIdentifiers: string[]
  ): ts.Node | null {
    let current: ts.Node | undefined = node.parent;

    while (current && current !== balarContextNode) {
      // Exception: balar.if() and balar.switch() are allowed for conditional logic
      if (ts.isCallExpression(current)) {
        const expr = current.expression;
        if (ts.isPropertyAccessExpression(expr)) {
          const obj = expr.expression;
          const prop = expr.name.text;

          if ((prop === "if" || prop === "switch") && ts.isIdentifier(obj) && balarIdentifiers.indexOf(obj.text) >= 0) {
            return null;
          }
        }
      }

      if (ts.isIfStatement(current)) {
        return current;
      }

      if (ts.isSwitchStatement(current)) {
        return current;
      }

      if (ts.isConditionalExpression(current)) {
        return current;
      }

      // Logical AND/OR can short-circuit, making the right side conditional
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

  function isFunctionCalledConditionally(
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

  return { create };
}

export = init;
