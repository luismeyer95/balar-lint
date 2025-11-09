#!/usr/bin/env node

import chalk from "chalk";
import ora from "ora";
import { runBalarLint } from "../src/cli-runner";

function printHelp() {
  console.log(`
${chalk.bold("balar-lint")} - linter for the balar TypeScript library

${chalk.bold("usage:")}
  npx balar-lint [options]

${chalk.bold("options:")}
  --project <path>    path to project directory (default: current directory)
  --help              show this help message
`);
}

function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  const projectIndex = args.indexOf("--project");
  const projectPath = projectIndex >= 0 && args[projectIndex + 1] ? args[projectIndex + 1] : process.cwd();

  const spinner = ora({
    text: "Analyzing project...",
    color: "cyan",
  }).start();

  try {
    const result = runBalarLint(projectPath);

    spinner.stop();

    console.log();
    console.log(chalk.bold.cyan("balar-lint report 🔎"));
    console.log(chalk.gray("─".repeat(50)));
    console.log();

    console.log(`${chalk.gray("Files checked:")} ${result.totalFiles}`);
    console.log(
      `${chalk.gray("Files with errors:")} ${result.filesWithErrors > 0 ? chalk.red(result.filesWithErrors) : chalk.green(result.filesWithErrors)}`
    );
    console.log(
      `${chalk.gray("Total errors:")} ${result.totalErrors > 0 ? chalk.red(result.totalErrors) : chalk.green(result.totalErrors)}`
    );
    console.log();

    if (result.totalErrors === 0) {
      console.log(chalk.green.bold("✓") + chalk.green(" No balar usage errors found!"));
      console.log();
      process.exit(0);
    }

    console.log(chalk.red.bold("✗ Found usage errors:"));
    console.log();

    for (const [file, diagnostics] of result.diagnostics) {
      console.log(chalk.bold.underline(file));
      for (const diag of diagnostics) {
        const location = chalk.gray(`${diag.line}:${diag.column}`);
        const code = chalk.red(`[${diag.code}]`);
        console.log(`  ${location} ${code} ${diag.message}`);
      }
    }
    process.exit(1);
  } catch (error) {
    spinner.stop();
    console.error();
    console.error(chalk.red.bold("✗ Error running balar-lint:"));
    console.error();
    console.error(chalk.red((error as Error).message));
    console.error();
    process.exit(1);
  }
}

main();
