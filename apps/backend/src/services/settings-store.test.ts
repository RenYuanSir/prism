import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SettingsStore } from "./settings-store";

const TEST_DIR = join(process.cwd(), "data", "test-settings");
const SETTINGS_FILE = "settings.json";

describe("SettingsStore", () => {
  let store: SettingsStore;

  beforeEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
    mkdirSync(TEST_DIR, { recursive: true });
    store = new SettingsStore(TEST_DIR);
  });

  afterEach(() => {
    try {
      rmSync(TEST_DIR, { recursive: true, force: true });
    } catch {}
  });

  it("returns null when no settings file exists", async () => {
    const result = await store.load();
    expect(result).toBeNull();
  });

  it("saves and loads settings round-trip", async () => {
    const config = {
      summary: { provider: "google" as const, apiKey: "key-1", model: "gemini-flash" },
      risk: { provider: "anthropic" as const, apiKey: "key-2", model: "claude-sonnet" },
      suggestion: {
        provider: "openai-compatible" as const,
        apiKey: "key-3",
        model: "deepseek-v4",
        baseUrl: "https://api.deepseek.com/v1",
      },
    };
    store.save(config);
    const loaded = await store.load();
    expect(loaded).toEqual(config);
  });

  it("returns null when settings file is corrupted", async () => {
    writeFileSync(join(TEST_DIR, SETTINGS_FILE), "not valid json");
    const result = await store.load();
    expect(result).toBeNull();
  });

  it("overwrites existing settings on save", async () => {
    const config1 = {
      summary: { provider: "google" as const, apiKey: "old-key", model: "old-model" },
      risk: { provider: "anthropic" as const, apiKey: "old-key", model: "old-model" },
      suggestion: { provider: "anthropic" as const, apiKey: "old-key", model: "old-model" },
    };
    store.save(config1);
    const config2 = {
      summary: { provider: "openai" as const, apiKey: "new-key", model: "new-model" },
      risk: { provider: "openai" as const, apiKey: "new-key", model: "new-model" },
      suggestion: { provider: "openai" as const, apiKey: "new-key", model: "new-model" },
    };
    store.save(config2);
    const loaded = await store.load();
    expect(loaded).toEqual(config2);
  });

  it("returns null for baseUrl when config was saved without one", async () => {
    // Save a config that omits baseUrl entirely (as JSON will skip undefined keys)
    const config = {
      summary: { provider: "google" as const, apiKey: "k1", model: "m1" },
      risk: { provider: "anthropic" as const, apiKey: "k2", model: "m2" },
      suggestion: { provider: "openai" as const, apiKey: "k3", model: "m3" },
    };
    store.save(config);
    const loaded = await store.load();
    expect(loaded?.summary.baseUrl).toBeUndefined();
    expect(loaded?.risk.baseUrl).toBeUndefined();
    expect(loaded?.suggestion.baseUrl).toBeUndefined();
    // Fields that were saved must still be present
    expect(loaded?.summary.provider).toBe("google");
    expect(loaded?.suggestion.model).toBe("m3");
  });
});
