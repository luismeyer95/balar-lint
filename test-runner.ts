#!/usr/bin/env node

/**
 * Test runner for the Balar TypeScript Language Service Plugin
 * Emulates VSCode's TypeScript setup to capture diagnostics exactly as they appear in the IDE
 */

import * as ts from "typescript";
import * as path from "path";
import * as fs from "fs";

const EXAMPLE_DIR = path.join(__dirname, "example");
const SNAPSHOT_DIR = path.join(__dirname, "__snapshots__");

interface Diagnostic {
  file: string;
  line: number;
  column: number;
  code: number;
  message: string;
  category: string;
}

/**
 * Recursively find all .ts files in a directory
 */
function findTestFiles(dir: string, baseDir: string = dir): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Recursively search subdirectories
      files.push(...findTestFiles(fullPath, baseDir));
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      // Add relative path from base directory
      files.push(path.relative(baseDir, fullPath));
    }
  }

  return files;
}

function runTests(updateSnapshots: boolean = false) {
  // Read tsconfig from example directory
  const configPath = path.join(EXAMPLE_DIR, "tsconfig.json");
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);

  if (configFile.error) {
    console.error("Error reading tsconfig.json:", configFile.error.messageText);
    process.exit(1);
  }

  const parsedConfig = ts.parseJsonConfigFileContent(configFile.config, ts.sys, EXAMPLE_DIR);

  // Create a language service host
  const servicesHost: ts.LanguageServiceHost = {
    getScriptFileNames: () => parsedConfig.fileNames,
    getScriptVersion: () => "0",
    getScriptSnapshot: (fileName) => {
      if (!fs.existsSync(fileName)) {
        return undefined;
      }
      return ts.ScriptSnapshot.fromString(fs.readFileSync(fileName, "utf-8"));
    },
    getCurrentDirectory: () => EXAMPLE_DIR,
    getCompilationSettings: () => parsedConfig.options,
    getDefaultLibFileName: ts.getDefaultLibFilePath,
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
    directoryExists: ts.sys.directoryExists,
    getDirectories: ts.sys.getDirectories,
  };

  // Create the language service
  const languageService = ts.createLanguageService(servicesHost, ts.createDocumentRegistry());

  // Load and initialize the plugin
  const pluginModule = require(path.join(__dirname, "dist/index.js"));

  // Create mock plugin info similar to what tsserver provides
  const mockLogger: ts.server.Logger = {
    close: () => {},
    hasLevel: () => false,
    loggingEnabled: () => false,
    perftrc: () => {},
    info: () => {},
    msg: () => {},
    startGroup: () => {},
    endGroup: () => {},
    getLogFileName: () => undefined,
  };

  const pluginInfo: ts.server.PluginCreateInfo = {
    languageService: languageService,
    languageServiceHost: servicesHost,
    project: {
      projectService: {
        logger: mockLogger,
      },
    } as any,
    serverHost: {} as any,
    config: {},
  };

  // Initialize the plugin
  const proxy = pluginModule({ typescript: ts }).create(pluginInfo);

  // Discover test files from rule directories
  const testDirs = ["rule-1-must-be-in-context", "rule-2-no-conditionals"];
  const testFiles: string[] = [];

  for (const dir of testDirs) {
    const dirPath = path.join(EXAMPLE_DIR, dir);
    if (fs.existsSync(dirPath)) {
      testFiles.push(...findTestFiles(dirPath, EXAMPLE_DIR));
    }
  }

  // Sort for consistent ordering
  testFiles.sort();

  // Collect results
  const results = new Map<string, Diagnostic[]>();

  for (const testFile of testFiles) {
    const fullPath = path.join(EXAMPLE_DIR, testFile);

    if (!fs.existsSync(fullPath)) {
      console.warn(`Warning: Test file not found: ${testFile}`);
      continue;
    }

    // Get semantic diagnostics through the plugin
    const diagnostics = proxy.getSemanticDiagnostics(fullPath);

    // Format diagnostics for snapshot
    const formatted = diagnostics
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

    results.set(testFile, formatted);
  }

  // Create snapshot directory if needed
  if (!fs.existsSync(SNAPSHOT_DIR)) {
    fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  }

  // Compare or update snapshots
  let passed = 0;
  let failed = 0;

  for (const [testFile, diagnostics] of results) {
    const snapshotPath = path.join(SNAPSHOT_DIR, testFile.replace(/\//g, "_").replace(/\.ts$/, ".json"));

    const snapshot = JSON.stringify(diagnostics, null, 2);

    if (updateSnapshots) {
      fs.writeFileSync(snapshotPath, snapshot);
      console.log(`✓ Updated snapshot: ${testFile}`);
      passed++;
    } else {
      if (!fs.existsSync(snapshotPath)) {
        console.log(`✗ Missing snapshot: ${testFile}`);
        console.log(`  Run with --update to create it`);
        failed++;
        continue;
      }

      const expected = fs.readFileSync(snapshotPath, "utf-8");
      if (snapshot === expected) {
        console.log(`✓ ${testFile}`);
        passed++;
      } else {
        console.log(`✗ ${testFile}`);
        console.log(`  Expected:`);
        console.log(`    ${expected}`);
        console.log(`  Received:`);
        console.log(`    ${snapshot}`);
        failed++;
      }
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

// Parse command line args
const updateSnapshots = process.argv.includes("--update");
runTests(updateSnapshots);
