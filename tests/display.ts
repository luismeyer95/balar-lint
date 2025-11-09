export interface Diagnostic {
  file: string;
  line: number;
  column: number;
  code: number;
  message: string;
  category: string;
}

export interface TestResult {
  testFile: string;
  status: "passed" | "failed" | "would-update" | "would-create";
  expected?: string;
  received?: string;
}

export function indent(text: string, spaces: number): string {
  const prefix = " ".repeat(spaces);
  return text
    .split("\n")
    .map((line) => prefix + line)
    .join("\n");
}

export function printTestResult(result: TestResult): void {
  if (result.status === "passed") {
    console.log(`✓ ${result.testFile}`);
  } else if (result.status === "failed") {
    console.log(`✗ ${result.testFile}`);
    if (result.expected !== undefined && result.received !== undefined) {
      console.log(`  Expected:`);
      console.log(`    ${result.expected}`);
      console.log(`  Received:`);
      console.log(`    ${result.received}`);
    }
  }
}

export function printUpdateResult(testFile: string): void {
  console.log(`✓ Updated snapshot: ${testFile}`);
}

export function printDryRunResult(result: TestResult, expected?: string, received?: string): void {
  if (result.status === "passed") {
    console.log(`✓ ${result.testFile} (no changes)`);
  } else if (result.status === "would-create") {
    console.log(`✓ Would create snapshot: ${result.testFile}`);
    console.log(`  New content:`);
    if (received) {
      console.log(indent(received, 4));
    }
  } else if (result.status === "would-update") {
    console.log(`✓ Would update snapshot: ${result.testFile}`);
    console.log(`  Current:`);
    if (expected) {
      console.log(indent(expected, 4));
    }
    console.log(`  New:`);
    if (received) {
      console.log(indent(received, 4));
    }
  }
}

export function printMissingSnapshot(testFile: string): void {
  console.log(`✗ Missing snapshot: ${testFile}`);
  console.log(`  Run with --update to create it`);
}

export function printTestSummary(passed: number, failed: number): void {
  console.log(`\n${passed} passed, ${failed} failed`);
}

export function printDryRunSummary(unchanged: number, wouldUpdate: number): void {
  console.log(`\n${unchanged} unchanged, ${wouldUpdate} would update`);
}
