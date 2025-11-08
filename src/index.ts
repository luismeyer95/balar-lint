function init(modules: { typescript: typeof import("typescript/lib/tsserverlibrary") }) {
    const ts = modules.typescript;

    function create(info: ts.server.PluginCreateInfo) {
      // Diagnostic logging
      info.project.projectService.logger.info(
        "Balar linter plugin is now active!"
      );

      // Set up decorator object
      const proxy: ts.LanguageService = Object.create(null);
      for (let k of Object.keys(info.languageService) as Array<keyof ts.LanguageService>) {
        const x = info.languageService[k]!;
        // @ts-ignore - JS runtime trickery for creating a proxy object
        proxy[k] = (...args: Array<{}>) => x.apply(info.languageService, args);
      }

      // Override getSemanticDiagnostics to add balar-specific checks
      proxy.getSemanticDiagnostics = (fileName) => {
        const prior = info.languageService.getSemanticDiagnostics(fileName);
        const program = info.languageService.getProgram();
        if (!program) return prior;

        const sourceFile = program.getSourceFile(fileName);
        if (!sourceFile) return prior;

        const checker = program.getTypeChecker();
        const newDiagnostics: ts.Diagnostic[] = [];

        // Find the balar import to track its identifier
        const balarIdentifiers = findBalarIdentifiers(sourceFile);
        if (balarIdentifiers.length === 0) {
          // No balar import, skip this file
          return prior;
        }

        // Visit all nodes in the source file
        function visit(node: ts.Node) {
          // Check if this is a call expression
          if (ts.isCallExpression(node)) {
            // Check if this is a property access (e.g., wrap.fetch())
            if (ts.isPropertyAccessExpression(node.expression)) {
              // Get the type of the object (e.g., 'wrap' in wrap.fetch())
              const objType = checker.getTypeAtLocation(node.expression.expression);
              const objTypeString = checker.typeToString(objType);

              // Log for debugging
              info.project.projectService.logger.info(`[Balar] Checking property call: ${node.getText(sourceFile).substring(0, 50)} | Object type: ${objTypeString}`);

              // Check if this is a call to a property on a Facade or ObjectFacade
              if (isBalarWrappedCall(objTypeString)) {
                info.project.projectService.logger.info(`[Balar] Found balar-wrapped function call!`);
                const balarContext = findBalarContext(node, balarIdentifiers, sourceFile!);

                if (!balarContext) {
                  info.project.projectService.logger.info(`[Balar] Called outside context - reporting error`);
                  // Error: BalarFn called outside balar.run()
                  newDiagnostics.push({
                    file: sourceFile,
                    start: node.getStart(),
                    length: node.getWidth(),
                    messageText: "Balar-wrapped function must be called inside a balar.run() context",
                    category: ts.DiagnosticCategory.Error,
                    code: 9001,
                  });
                } else {
                  info.project.projectService.logger.info(`[Balar] Called inside context - checking for conditionals`);
                  // Inside balar.run(), check for conditional calls
                  const conditionalParent = findConditionalParent(node, balarContext.node, balarIdentifiers, sourceFile!);
                  if (conditionalParent) {
                    info.project.projectService.logger.info(`[Balar] Found conditional call - reporting error`);
                    newDiagnostics.push({
                      file: sourceFile,
                      start: node.getStart(),
                      length: node.getWidth(),
                      messageText: "Balar-wrapped function must not be called conditionally inside balar.run(). Use balar.if() or balar.switch() instead.",
                      category: ts.DiagnosticCategory.Error,
                      code: 9002,
                    });
                  } else {
                    info.project.projectService.logger.info(`[Balar] No conditional - OK`);
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

    // Helper: Find all balar identifiers in the file (handles aliasing)
    function findBalarIdentifiers(sourceFile: ts.SourceFile): string[] {
      const identifiers: string[] = [];

      function visit(node: ts.Node) {
        // Look for import declarations from 'balar'
        if (ts.isImportDeclaration(node)) {
          const moduleSpecifier = node.moduleSpecifier;
          if (ts.isStringLiteral(moduleSpecifier) && moduleSpecifier.text === 'balar') {
            const importClause = node.importClause;
            if (importClause && importClause.namedBindings) {
              if (ts.isNamedImports(importClause.namedBindings)) {
                for (const element of importClause.namedBindings.elements) {
                  if (element.name.text === 'balar' || element.propertyName?.text === 'balar') {
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

    // Helper: Check if a type string represents a Facade or ObjectFacade
    // These are the types returned by balar.wrap.fns() and balar.wrap.object()
    function isBalarWrappedCall(typeString: string): boolean {
      // Check if the type starts with Facade< or ObjectFacade<
      // This avoids matching other types that just contain the word "Facade"
      return typeString.indexOf('Facade<') === 0 ||
             typeString.indexOf('ObjectFacade<') === 0 ||
             typeString === 'Facade' ||
             typeString === 'ObjectFacade';
    }

    // Helper: Find if a node is inside a balar.run() context
    interface BalarContext {
      node: ts.Node;
      type: 'run';
    }

    function findBalarContext(node: ts.Node, balarIdentifiers: string[], sourceFile: ts.SourceFile): BalarContext | null {
      // Strategy:
      // 1. Find the containing function
      // 2. Check if it's passed to balar.run()
      // 3. If not, find where this function is called from and check recursively

      const containingFunction = findContainingFunction(node);
      if (!containingFunction) {
        return null;
      }

      const visited = new Set<ts.Node>();
      return isFunctionInBalarContext(containingFunction, balarIdentifiers, sourceFile, visited);
    }

    // Helper: Find the closest containing function
    function findContainingFunction(node: ts.Node): ts.Node | null {
      let current: ts.Node | undefined = node;

      while (current) {
        if (ts.isFunctionDeclaration(current) ||
            ts.isFunctionExpression(current) ||
            ts.isArrowFunction(current) ||
            ts.isMethodDeclaration(current)) {
          return current;
        }
        current = current.parent;
      }

      return null;
    }

    // Helper: Check if a function is in a balar context (recursively through call chain)
    function isFunctionInBalarContext(
      func: ts.Node,
      balarIdentifiers: string[],
      sourceFile: ts.SourceFile,
      visited: Set<ts.Node>
    ): BalarContext | null {
      // Prevent infinite loops in recursive calls
      if (visited.has(func)) {
        return null;
      }
      visited.add(func);

      // Check if this function is directly passed to balar.run()
      const functionParent: ts.Node = func.parent;
      if (ts.isCallExpression(functionParent)) {
        const expr = functionParent.expression;

        if (ts.isPropertyAccessExpression(expr)) {
          const obj = expr.expression;
          const prop = expr.name.text;

          if (prop === 'run' && ts.isIdentifier(obj) && balarIdentifiers.indexOf(obj.text) >= 0) {
            // This function is passed to balar.run()
            if (functionParent.arguments.length >= 2 && functionParent.arguments[1] === func) {
              return { node: func, type: 'run' };
            }
          }
        }
      }

      // Not directly passed to balar.run(), so find where this function is called from
      const functionName = getFunctionName(func);
      if (!functionName) {
        // Anonymous function not passed to balar.run() - not in context
        return null;
      }

      // Find all call sites of this function
      const callSites = findCallSites(functionName, sourceFile);

      // Check if any call site is in a balar context
      for (const callSite of callSites) {
        const callingFunction = findContainingFunction(callSite);
        if (callingFunction) {
          const context = isFunctionInBalarContext(callingFunction, balarIdentifiers, sourceFile, visited);
          if (context) {
            return context;
          }
        }
      }

      return null;
    }

    // Helper: Get the name of a function (if it has one)
    function getFunctionName(func: ts.Node): string | null {
      if (ts.isFunctionDeclaration(func) && func.name) {
        return func.name.text;
      }
      // For arrow functions and expressions assigned to variables
      if ((ts.isFunctionExpression(func) || ts.isArrowFunction(func)) && ts.isVariableDeclaration(func.parent)) {
        if (ts.isIdentifier(func.parent.name)) {
          return func.parent.name.text;
        }
      }
      return null;
    }

    // Helper: Find all call sites of a function by name
    function findCallSites(functionName: string, sourceFile: ts.SourceFile): ts.CallExpression[] {
      const callSites: ts.CallExpression[] = [];

      function visit(node: ts.Node) {
        if (ts.isCallExpression(node)) {
          // Check for direct function call (e.g., helperA(...))
          if (ts.isIdentifier(node.expression) && node.expression.text === functionName) {
            callSites.push(node);
          }
        }

        ts.forEachChild(node, visit);
      }

      visit(sourceFile);
      return callSites;
    }

    // Helper: Check if a node is inside another node
    function isNodeInside(node: ts.Node, container: ts.Node): boolean {
      let current: ts.Node | undefined = node;
      while (current) {
        if (current === container) return true;
        current = current.parent;
      }
      return false;
    }

    // Helper: Find if a call is inside a conditional (if/switch/ternary) but not inside balar.if/balar.switch
    // This checks both direct conditionals AND conditionals through the call chain
    function findConditionalParent(
      node: ts.Node,
      balarContextNode: ts.Node,
      balarIdentifiers: string[],
      sourceFile: ts.SourceFile
    ): ts.Node | null {
      // First, check for direct conditionals in the current function
      const directConditional = findDirectConditionalParent(node, balarContextNode, balarIdentifiers);
      if (directConditional) {
        return directConditional;
      }

      // Then, check if the containing function is called conditionally through the call chain
      const containingFunction = findContainingFunction(node);
      if (containingFunction && containingFunction !== balarContextNode) {
        const visited = new Set<ts.Node>();
        return isFunctionCalledConditionally(containingFunction, balarContextNode, balarIdentifiers, sourceFile, visited);
      }

      return null;
    }

    // Helper: Find direct conditional parents in the AST
    function findDirectConditionalParent(
      node: ts.Node,
      balarContextNode: ts.Node,
      balarIdentifiers: string[]
    ): ts.Node | null {
      let current: ts.Node | undefined = node.parent;

      while (current && current !== balarContextNode) {
        // Exception: if we're inside a balar.if() or balar.switch() call, that's allowed
        // Check this FIRST before checking for conditionals
        if (ts.isCallExpression(current)) {
          const expr = current.expression;
          if (ts.isPropertyAccessExpression(expr)) {
            const obj = expr.expression;
            const prop = expr.name.text;

            if ((prop === 'if' || prop === 'switch') &&
                ts.isIdentifier(obj) &&
                balarIdentifiers.indexOf(obj.text) >= 0) {
              // This is balar.if() or balar.switch(), which is allowed
              // Don't report this as an error
              return null;
            }
          }
        }

        // Check for if statement
        if (ts.isIfStatement(current)) {
          return current;
        }

        // Check for switch statement
        if (ts.isSwitchStatement(current)) {
          return current;
        }

        // Check for conditional expression (ternary)
        if (ts.isConditionalExpression(current)) {
          return current;
        }

        // Check for logical AND/OR expressions that could short-circuit
        if (ts.isBinaryExpression(current)) {
          const op = current.operatorToken.kind;
          if (op === ts.SyntaxKind.AmpersandAmpersandToken || op === ts.SyntaxKind.BarBarToken) {
            // Check if our node is on the right side (conditional side)
            if (isNodeInside(node, current.right)) {
              return current;
            }
          }
        }

        current = current.parent;
      }

      return null;
    }

    // Helper: Check if a function is called conditionally (through call chain)
    function isFunctionCalledConditionally(
      func: ts.Node,
      balarContextNode: ts.Node,
      balarIdentifiers: string[],
      sourceFile: ts.SourceFile,
      visited: Set<ts.Node>
    ): ts.Node | null {
      // Prevent infinite loops
      if (visited.has(func)) {
        return null;
      }
      visited.add(func);

      // Get the function name
      const functionName = getFunctionName(func);
      if (!functionName) {
        return null;
      }

      // Find all call sites of this function
      const callSites = findCallSites(functionName, sourceFile);

      // Check each call site
      for (const callSite of callSites) {
        // Check if this call site has a direct conditional parent
        const directConditional = findDirectConditionalParent(callSite, balarContextNode, balarIdentifiers);
        if (directConditional) {
          return directConditional;
        }

        // Check if the function containing this call site is itself called conditionally
        const callingFunction = findContainingFunction(callSite);
        if (callingFunction && callingFunction !== balarContextNode) {
          const conditionalInChain = isFunctionCalledConditionally(callingFunction, balarContextNode, balarIdentifiers, sourceFile, visited);
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
  
