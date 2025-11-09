#!/usr/bin/env node

import * as path from "path";
import { setupPluginForSnapshotTests } from "./setup";
import { discoverTestFiles, collectDiagnostics } from "./discovery";
import { ensureSnapshotDir, processSnapshots } from "./snapshots";
import { printTestSummary, printDryRunSummary } from "./display";

const EXAMPLE_DIR = path.join(__dirname, "..", "examples");
const SNAPSHOT_DIR = path.join(__dirname, "__snapshots__");
const PLUGIN_PATH = path.join(__dirname, "..", "dist/index.js");

function runTests(updateSnapshots: boolean = false, dryRun: boolean = false): void {
  const { proxy, exampleDir } = setupPluginForSnapshotTests(EXAMPLE_DIR, PLUGIN_PATH);

  const testFiles = discoverTestFiles(exampleDir);
  const results = collectDiagnostics(proxy, testFiles, exampleDir);
  ensureSnapshotDir(SNAPSHOT_DIR);

  const mode = updateSnapshots ? "update" : dryRun ? "dry-run" : "test";

  const { passed, failed, wouldUpdate } = processSnapshots(results, SNAPSHOT_DIR, mode);

  if (mode === "dry-run") {
    printDryRunSummary(passed, wouldUpdate);
    process.exit(0);
  } else {
    printTestSummary(passed, failed);
    process.exit(failed > 0 ? 1 : 0);
  }
}

const updateSnapshots = process.argv.includes("--update");
const dryRun = process.argv.includes("--dry-run");
runTests(updateSnapshots, dryRun);
