import type { LLMEmbeddingConfig } from "@prism/shared";
import type { LLMClient, LLMProviderConfig } from "./llm-client.js";
import { createLLMClient } from "./llm-client.js";
import { SettingsStore } from "./settings-store.js";

export interface LLMPipelineConfig {
  summary: LLMProviderConfig;
  risk: LLMProviderConfig;
  gemini: LLMProviderConfig;
  suggestion: LLMProviderConfig;
  embedding: LLMEmbeddingConfig;
}

function getEnvConfig(
  prefix: string,
  defaults: { provider: string; model: string; baseUrl?: string },
): LLMProviderConfig {
  const provider = (process.env[`${prefix}_PROVIDER`] ||
    defaults.provider) as LLMProviderConfig["provider"];
  const apiKey = process.env[`${prefix}_API_KEY`];
  const model = process.env[`${prefix}_MODEL`] || defaults.model;
  const baseUrl = process.env[`${prefix}_BASE_URL`] || defaults.baseUrl;

  if (!apiKey) {
    throw new Error(`${prefix}_API_KEY environment variable is not set`);
  }

  return { provider, apiKey, model, baseUrl };
}

function getEnvDefaults(): LLMPipelineConfig {
  return {
    summary: getEnvConfig("LLM_SUMMARY", {
      provider: "google",
      model: "gemini-2.0-flash",
    }),
    risk: getEnvConfig("LLM_RISK", {
      provider: "anthropic",
      model: "claude-3-5-sonnet-20241022",
    }),
    gemini: getEnvConfig("LLM_GEMINI", {
      provider: "google",
      model: "gemini-2.0-flash",
    }),
    suggestion: getEnvConfig("LLM_SUGGESTION", {
      provider: "anthropic",
      model: "claude-3-5-sonnet-20241022",
    }),
    embedding: {
      provider: (process.env.EMBEDDING_PROVIDER as string) || "openai",
      model: process.env.EMBEDDING_MODEL || "text-embedding-3-small",
      apiKey: process.env.EMBEDDING_API_KEY || "",
      baseUrl: process.env.EMBEDDING_BASE_URL || "https://api.openai.com/v1",
    },
  };
}

let cachedConfig: LLMPipelineConfig | null = null;

/** Load config from settings.json if available, otherwise fall back to env vars */
export function loadLLMConfig(): LLMPipelineConfig {
  if (cachedConfig) return cachedConfig;

  const store = new SettingsStore();
  const saved = store.loadSync();
  if (saved) {
    cachedConfig = saved;
    return cachedConfig;
  }

  cachedConfig = getEnvDefaults();
  return cachedConfig;
}

/** Clear the cached config (called after saving new settings) */
export function clearLLMConfigCache(): void {
  cachedConfig = null;
}

/** Load config strictly from env vars (used by tests) */
export function loadLLMConfigFromEnv(): LLMPipelineConfig {
  return getEnvDefaults();
}

export function createPipelineClients(config: LLMPipelineConfig): {
  summaryClient: LLMClient;
  riskClient: LLMClient;
  geminiClient: LLMClient;
  suggestionClient: LLMClient;
} {
  return {
    summaryClient: createLLMClient(config.summary),
    riskClient: createLLMClient(config.risk),
    geminiClient: createLLMClient(config.gemini),
    suggestionClient: createLLMClient(config.suggestion),
  };
}
