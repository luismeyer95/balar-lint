import * as ts from "typescript/lib/tsserverlibrary";
import * as path from "path";
import { setupBalarPlugin, findTsConfig } from "../shared/plugin-setup";
import { BalarDiagnostic } from "../shared/types";
import { BALAR_WRAPPED_OUTSIDE_CONTEXT, BALAR_WRAPPED_CONDITIONAL_CALL } from "./constants";

export interface CliResult {
  totalFiles: number;
  filesWithErrors: number;
  totalErrors: number;
  diagnostics: Map<string, BalarDiagnostic[]>;
}

export function runBalarLint(projectPath: string, pluginPath?: string): CliResult {
  const configPath = findTsConfig(projectPath);
  if (!configPath) {
    throw new Error(`Could not find tsconfig.json in ${projectPath}`);
  }

  const resolvedPluginPath = pluginPath || path.join(__dirname, "index.js");
  const { proxy, projectDir, fileNames } = setupBalarPlugin(path.dirname(configPath), resolvedPluginPath);

  const diagnosticsMap = new Map<string, BalarDiagnostic[]>();
  const sourceFiles = fileNames.filter((fileName) => {
    return !fileName.includes("node_modules") && fileName.endsWith(".ts") && !fileName.endsWith(".d.ts");
  });

  for (const fileName of sourceFiles) {
    const diagnostics = proxy.getSemanticDiagnostics(fileName);
    const balarDiagnostics = diagnostics
      .filter((d: ts.Diagnostic) => d.code === BALAR_WRAPPED_OUTSIDE_CONTEXT || d.code === BALAR_WRAPPED_CONDITIONAL_CALL)
      .map((d: ts.Diagnostic) => {
        const lineAndChar = d.file!.getLineAndCharacterOfPosition(d.start!);
        return {
          file: path.relative(projectDir, d.file!.fileName),
          line: lineAndChar.line + 1,
          column: lineAndChar.character + 1,
          code: d.code,
          message: typeof d.messageText === "string" ? d.messageText : d.messageText.messageText,
          category: ts.DiagnosticCategory[d.category],
        };
      });

    if (balarDiagnostics.length > 0) {
      diagnosticsMap.set(path.relative(projectDir, fileName), balarDiagnostics);
    }
  }

  const filesWithErrors = diagnosticsMap.size;
  const totalErrors = Array.from(diagnosticsMap.values()).reduce((sum, diags) => sum + diags.length, 0);

  return {
    totalFiles: sourceFiles.length,
    filesWithErrors,
    totalErrors,
    diagnostics: diagnosticsMap,
  };
}
