#!/usr/bin/env node

import * as path from "path";
import * as fs from "fs";
import { spawnSync } from "child_process";

const EXAMPLE_DIR = path.join(__dirname, "..", "..", "examples");
const SNAPSHOT_DIR = path.join(__dirname, "__snapshots__");
const SNAPSHOT_FILE = path.join(SNAPSHOT_DIR, "cli-output.txt");
const CLI_PATH = path.join(__dirname, "..", "..", "dist/bin/balar-lint.js");

interface CliSnapshot {
  exitCode: number;
  stdout: string;
  stderr: string;
}

function stripAnsiCodes(text: string): string {
  // Remove ANSI escape codes (colors, etc.)
  return text.replace(/\x1b\[[0-9;]*m/g, "");
}

function runCli(): CliSnapshot {
  const result = spawnSync("node", [CLI_PATH, "--project", EXAMPLE_DIR], {
    encoding: "utf-8",
  });

  return {
    exitCode: result.status || 0,
    stdout: stripAnsiCodes(result.stdout),
    stderr: stripAnsiCodes(result.stderr),
  };
}

function formatSnapshot(snapshot: CliSnapshot): string {
  let output = `Exit Code: ${snapshot.exitCode}\n\n`;
  output += `=== STDOUT ===\n${snapshot.stdout}\n`;
  if (snapshot.stderr) {
    output += `\n=== STDERR ===\n${snapshot.stderr}\n`;
  }
  return output;
}

function runTest(updateSnapshot: boolean = false): void {
  try {
    const result = runCli();
    const formattedOutput = formatSnapshot(result);

    if (!fs.existsSync(SNAPSHOT_DIR)) {
      fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
    }

    if (updateSnapshot) {
      fs.writeFileSync(SNAPSHOT_FILE, formattedOutput);
      console.log("✓ Updated CLI snapshot");
      process.exit(0);
    } else {
      if (!fs.existsSync(SNAPSHOT_FILE)) {
        console.error("✗ Snapshot file does not exist. Run with --update to create it.");
        process.exit(1);
      }

      const existingSnapshot = fs.readFileSync(SNAPSHOT_FILE, "utf-8");

      if (formattedOutput === existingSnapshot) {
        console.log("✓ CLI snapshot test passed");
        process.exit(0);
      } else {
        console.error("✗ CLI snapshot test failed");
        console.error("\n=== EXPECTED ===");
        console.error(existingSnapshot);
        console.error("\n=== ACTUAL ===");
        console.error(formattedOutput);
        process.exit(1);
      }
    }
  } catch (error) {
    console.error("✗ Error running CLI test:");
    console.error((error as Error).message);
    process.exit(1);
  }
}

const updateSnapshot = process.argv.includes("--update");
runTest(updateSnapshot);
