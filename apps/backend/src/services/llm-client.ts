import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

export interface LLMClient {
  generateText(prompt: string): Promise<string>;
}

export interface LLMProviderConfig {
  provider: "anthropic" | "google" | "openai" | "openai-compatible";
  apiKey: string;
  baseUrl?: string;
  model: string;
}

export class AnthropicClient implements LLMClient {
  private client: Anthropic;
  private model: string;

  constructor(config: LLMProviderConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey, baseURL: config.baseUrl });
    this.model = config.model;
  }

  async generateText(prompt: string): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from Anthropic");
    }
    return textBlock.text;
  }
}

export class GoogleClient implements LLMClient {
  private model;

  constructor(config: LLMProviderConfig) {
    const genAI = new GoogleGenerativeAI(config.apiKey);
    this.model = genAI.getGenerativeModel({ model: config.model });
  }

  async generateText(prompt: string): Promise<string> {
    const result = await this.model.generateContent(prompt);
    return result.response.text();
  }
}

export class OpenAICompatibleClient implements LLMClient {
  private client: OpenAI;
  private model: string;

  constructor(config: LLMProviderConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
    this.model = config.model;
  }

  async generateText(prompt: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 4096,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No text response from OpenAI-compatible API");
    }
    return content;
  }
}

export function createLLMClient(config: LLMProviderConfig): LLMClient {
  switch (config.provider) {
    case "anthropic":
      return new AnthropicClient(config);
    case "google":
      return new GoogleClient(config);
    case "openai":
    case "openai-compatible":
      return new OpenAICompatibleClient(config);
    default:
      throw new Error(`Unknown LLM provider: ${config.provider}`);
  }
}
