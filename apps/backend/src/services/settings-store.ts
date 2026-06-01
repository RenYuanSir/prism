import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { LLMPipelineConfig } from "./llm-config.js";

const SETTINGS_FILE = "settings.json";

export class SettingsStore {
  private filePath: string;

  constructor(baseDir?: string) {
    const dir = baseDir ?? join(process.cwd(), "data");
    this.filePath = join(dir, SETTINGS_FILE);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  save(config: LLMPipelineConfig): void {
    this.ensureDir();
    const json = JSON.stringify(config, null, 2);
    writeFileSync(this.filePath, json, "utf-8");
  }

  private _load(): LLMPipelineConfig | null {
    if (!existsSync(this.filePath)) return null;
    try {
      const raw = readFileSync(this.filePath, "utf-8");
      return JSON.parse(raw) as LLMPipelineConfig;
    } catch {
      return null;
    }
  }

  async load(): Promise<LLMPipelineConfig | null> {
    return this._load();
  }

  /** Synchronous load — for use during startup before async is available */
  loadSync(): LLMPipelineConfig | null {
    return this._load();
  }

  private ensureDir(): void {
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
}
