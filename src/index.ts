import type * as ts from "typescript/lib/tsserverlibrary";
import { findBalarIdentifiers, isBalarWrappedCall, findBalarContext } from "./core";
import { findConditionalParent } from "./conditionals";
import { BALAR_WRAPPED_OUTSIDE_CONTEXT, BALAR_WRAPPED_CONDITIONAL_CALL } from "./constants";

function init(modules: { typescript: typeof import("typescript/lib/tsserverlibrary") }) {
  const ts = modules.typescript;

  function create(info: ts.server.PluginCreateInfo) {
    const proxy: ts.LanguageService = Object.create(null);
    for (let k of Object.keys(info.languageService) as Array<keyof ts.LanguageService>) {
      const x = info.languageService[k]!;
      // @ts-ignore
      proxy[k] = (...args: Array<{}>) => x.apply(info.languageService, args);
    }

    proxy.getSemanticDiagnostics = (fileName) => {
      const prior = info.languageService.getSemanticDiagnostics(fileName);
      const maybeProgram = info.languageService.getProgram();
      if (!maybeProgram) return prior;

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
                  code: BALAR_WRAPPED_OUTSIDE_CONTEXT,
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
                    code: BALAR_WRAPPED_CONDITIONAL_CALL,
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

  return { create };
}

export = init;
