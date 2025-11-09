import * as ts from "typescript";
import * as path from "path";
import * as fs from "fs";
import { Diagnostic } from "./display";

function findTestFiles(dir: string, baseDir: string = dir): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...findTestFiles(fullPath, baseDir));
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      files.push(path.relative(baseDir, fullPath));
    }
  }

  return files;
}

export function discoverTestFiles(exampleDir: string): string[] {
  const testDirs = ["rule-1-must-be-in-context", "rule-2-no-conditionals"];
  const testFiles: string[] = [];

  for (const dir of testDirs) {
    const dirPath = path.join(exampleDir, dir);
    if (fs.existsSync(dirPath)) {
      testFiles.push(...findTestFiles(dirPath, exampleDir));
    }
  }

  return testFiles.sort();
}

function formatDiagnostics(diagnostics: ts.Diagnostic[], testFile: string, fullPath: string): Diagnostic[] {
  return diagnostics
    .filter((d: ts.Diagnostic) => d.file?.fileName === fullPath)
    .map((d: ts.Diagnostic) => {
      const lineAndChar = d.file!.getLineAndCharacterOfPosition(d.start!);
      return {
        file: testFile,
        line: lineAndChar.line + 1,
        column: lineAndChar.character + 1,
        code: d.code,
        message: ts.flattenDiagnosticMessageText(d.messageText, "\n"),
        category: ts.DiagnosticCategory[d.category],
      };
    });
}

export function collectDiagnostics(
  proxy: ts.LanguageService,
  testFiles: string[],
  exampleDir: string
): Map<string, Diagnostic[]> {
  const results = new Map<string, Diagnostic[]>();

  for (const testFile of testFiles) {
    const fullPath = path.join(exampleDir, testFile);

    if (!fs.existsSync(fullPath)) {
      console.warn(`Warning: Test file not found: ${testFile}`);
      continue;
    }

    const diagnostics = proxy.getSemanticDiagnostics(fullPath);
    const formatted = formatDiagnostics(diagnostics, testFile, fullPath);
    results.set(testFile, formatted);
  }

  return results;
}
