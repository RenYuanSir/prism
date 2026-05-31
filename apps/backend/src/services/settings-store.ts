import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { LLMPipelineConfig } from "./llm-config.js";

const SETTINGS_FILE = "settings.json";

export class SettingsStore {
  private filePath: string;

  constructor(baseDir?: string) {
    const dir = baseDir ?? join(process.cwd(), "data", "settings");
    this.filePath = join(dir, SETTINGS_FILE);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  async save(config: LLMPipelineConfig): Promise<void> {
    const json = JSON.stringify(config, null, 2);
    writeFileSync(this.filePath, json, "utf-8");
  }

  async load(): Promise<LLMPipelineConfig | null> {
    if (!existsSync(this.filePath)) return null;
    try {
      const raw = readFileSync(this.filePath, "utf-8");
      return JSON.parse(raw) as LLMPipelineConfig;
    } catch {
      return null;
    }
  }

  /** Synchronous load — for use during startup before async is available */
  loadSync(): LLMPipelineConfig | null {
    if (!existsSync(this.filePath)) return null;
    try {
      const raw = readFileSync(this.filePath, "utf-8");
      return JSON.parse(raw) as LLMPipelineConfig;
    } catch {
      return null;
    }
  }
}
