import * as ts from "typescript";
import * as path from "path";
import * as fs from "fs";

export interface PluginSetup {
  proxy: ts.LanguageService;
  exampleDir: string;
}

export function setupPlugin(exampleDir: string, pluginPath: string): PluginSetup {
  const configPath = path.join(exampleDir, "tsconfig.json");
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);

  if (configFile.error) {
    throw new Error(`Error reading tsconfig.json: ${configFile.error.messageText}`);
  }

  const parsedConfig = ts.parseJsonConfigFileContent(configFile.config, ts.sys, exampleDir);

  const servicesHost: ts.LanguageServiceHost = {
    getScriptFileNames: () => parsedConfig.fileNames,
    getScriptVersion: () => "0",
    getScriptSnapshot: (fileName) => {
      if (!fs.existsSync(fileName)) {
        return undefined;
      }
      return ts.ScriptSnapshot.fromString(fs.readFileSync(fileName, "utf-8"));
    },
    getCurrentDirectory: () => exampleDir,
    getCompilationSettings: () => parsedConfig.options,
    getDefaultLibFileName: ts.getDefaultLibFilePath,
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
    directoryExists: ts.sys.directoryExists,
    getDirectories: ts.sys.getDirectories,
  };

  const languageService = ts.createLanguageService(servicesHost, ts.createDocumentRegistry());

  const pluginModule = require(pluginPath);

  const mockLogger: ts.server.Logger = createMockLogger();

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

  return { proxy, exampleDir };
}

function createMockLogger(): ts.server.Logger {
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
