import * as path from "path";
import * as fs from "fs";
import {
  Diagnostic,
  printTestResult,
  printUpdateResult,
  printDryRunResult,
  printMissingSnapshot,
} from "./display";

export function getSnapshotPath(testFile: string, snapshotDir: string): string {
  return path.join(snapshotDir, testFile.replace(/\//g, "_").replace(/\.ts$/, ".json"));
}

export function ensureSnapshotDir(snapshotDir: string): void {
  if (!fs.existsSync(snapshotDir)) {
    fs.mkdirSync(snapshotDir, { recursive: true });
  }
}

export function processSnapshots(
  results: Map<string, Diagnostic[]>,
  snapshotDir: string,
  mode: "test" | "update" | "dry-run"
): { passed: number; failed: number; wouldUpdate: number } {
  let passed = 0;
  let failed = 0;
  let wouldUpdate = 0;

  for (const [testFile, diagnostics] of results) {
    const snapshotPath = getSnapshotPath(testFile, snapshotDir);
    const snapshot = JSON.stringify(diagnostics, null, 2);

    if (mode === "update") {
      fs.writeFileSync(snapshotPath, snapshot);
      printUpdateResult(testFile);
      passed++;
    } else if (mode === "dry-run") {
      if (!fs.existsSync(snapshotPath)) {
        printDryRunResult({ testFile, status: "would-create" }, undefined, snapshot);
        wouldUpdate++;
      } else {
        const expected = fs.readFileSync(snapshotPath, "utf-8");
        if (snapshot === expected) {
          printDryRunResult({ testFile, status: "passed" });
          passed++;
        } else {
          printDryRunResult({ testFile, status: "would-update" }, expected, snapshot);
          wouldUpdate++;
        }
      }
    } else {
      if (!fs.existsSync(snapshotPath)) {
        printMissingSnapshot(testFile);
        failed++;
        continue;
      }

      const expected = fs.readFileSync(snapshotPath, "utf-8");
      if (snapshot === expected) {
        printTestResult({ testFile, status: "passed" });
        passed++;
      } else {
        printTestResult({ testFile, status: "failed", expected, received: snapshot });
        failed++;
      }
    }
  }

  return { passed, failed, wouldUpdate };
}
