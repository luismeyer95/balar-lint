import * as ts from "typescript";
import { setupBalarPlugin } from "../shared/plugin-setup";

export interface PluginSetup {
  proxy: ts.LanguageService;
  exampleDir: string;
}

export function setupPluginForSnapshotTests(exampleDir: string, pluginPath: string): PluginSetup {
  const result = setupBalarPlugin(exampleDir, pluginPath);
  return {
    proxy: result.proxy,
    exampleDir: result.projectDir,
  };
}
