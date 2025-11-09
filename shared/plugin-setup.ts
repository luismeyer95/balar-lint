import * as ts from "typescript/lib/tsserverlibrary";
import * as path from "path";
import * as fs from "fs";

export interface PluginSetupResult {
  proxy: ts.LanguageService;
  projectDir: string;
  fileNames: string[];
}

export function setupBalarPlugin(projectDir: string, pluginPath: string): PluginSetupResult {
  const configPath = path.join(projectDir, "tsconfig.json");
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);

  if (configFile.error) {
    throw new Error(`Error reading tsconfig.json: ${configFile.error.messageText}`);
  }

  const parsedConfig = ts.parseJsonConfigFileContent(configFile.config, ts.sys, projectDir);

  const servicesHost = createLanguageServiceHost(projectDir, parsedConfig.fileNames, parsedConfig.options);
  const languageService = ts.createLanguageService(servicesHost, ts.createDocumentRegistry());

  const pluginModule = require(pluginPath);
  const mockLogger = createMockLogger();

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

  const proxy = pluginModule({ typescript: ts }).create(pluginInfo);

  return {
    proxy,
    projectDir,
    fileNames: parsedConfig.fileNames,
  };
}

export function createLanguageServiceHost(
  projectDir: string,
  fileNames: string[],
  compilerOptions: ts.CompilerOptions
): ts.LanguageServiceHost {
  return {
    getScriptFileNames: () => fileNames,
    getScriptVersion: () => "0",
    getScriptSnapshot: (fileName) => {
      if (!fs.existsSync(fileName)) {
        return undefined;
      }
      return ts.ScriptSnapshot.fromString(fs.readFileSync(fileName, "utf-8"));
    },
    getCurrentDirectory: () => projectDir,
    getCompilationSettings: () => compilerOptions,
    getDefaultLibFileName: ts.getDefaultLibFilePath,
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
    directoryExists: ts.sys.directoryExists,
    getDirectories: ts.sys.getDirectories,
  };
}

export function createMockLogger(): ts.server.Logger {
  return {
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
}

export function findTsConfig(startPath: string): string | null {
  let currentPath = path.resolve(startPath);

  while (true) {
    const configPath = path.join(currentPath, "tsconfig.json");
    if (fs.existsSync(configPath)) {
      return configPath;
    }

    const parentPath = path.dirname(currentPath);
    if (parentPath === currentPath) {
      return null;
    }
    currentPath = parentPath;
  }
}
