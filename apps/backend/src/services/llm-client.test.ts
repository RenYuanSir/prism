import { describe, expect, it, vi } from "vitest";
import {
  AnthropicClient,
  GoogleClient,
  OpenAICompatibleClient,
  createLLMClient,
} from "./llm-client.js";

// Mock the external SDKs
vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: "text", text: "Anthropic response" }],
        }),
      },
    })),
  };
});

vi.mock("@google/generative-ai", () => {
  return {
    GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
      getGenerativeModel: vi.fn().mockReturnValue({
        generateContent: vi.fn().mockResolvedValue({
          response: { text: () => "Google response" },
        }),
      }),
    })),
  };
});

vi.mock("openai", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{ message: { content: "OpenAI response" } }],
          }),
        },
      },
    })),
  };
});

describe("LLM Client Factory", () => {
  it("should create Anthropic client", () => {
    const client = createLLMClient({
      provider: "anthropic",
      apiKey: "test-key",
      model: "claude-3-sonnet",
    });
    expect(client).toBeInstanceOf(AnthropicClient);
  });

  it("should create Google client", () => {
    const client = createLLMClient({
      provider: "google",
      apiKey: "test-key",
      model: "gemini-pro",
    });
    expect(client).toBeInstanceOf(GoogleClient);
  });

  it("should create OpenAI client", () => {
    const client = createLLMClient({
      provider: "openai",
      apiKey: "test-key",
      model: "gpt-4",
    });
    expect(client).toBeInstanceOf(OpenAICompatibleClient);
  });

  it("should create OpenAI-compatible client with custom base URL", () => {
    const client = createLLMClient({
      provider: "openai-compatible",
      apiKey: "test-key",
      baseUrl: "https://api.deepseek.com/v1",
      model: "deepseek-chat",
    });
    expect(client).toBeInstanceOf(OpenAICompatibleClient);
  });

  it("should throw on unknown provider", () => {
    expect(() =>
      createLLMClient({
        provider: "unknown" as never,
        apiKey: "test-key",
        model: "test-model",
      }),
    ).toThrow("Unknown LLM provider");
  });
});

describe("AnthropicClient", () => {
  it("should generate text", async () => {
    const client = new AnthropicClient({
      provider: "anthropic",
      apiKey: "test-key",
      model: "claude-3-sonnet",
    });
    const response = await client.generateText("Hello");
    expect(response).toBe("Anthropic response");
  });
});

describe("GoogleClient", () => {
  it("should generate text", async () => {
    const client = new GoogleClient({
      provider: "google",
      apiKey: "test-key",
      model: "gemini-pro",
    });
    const response = await client.generateText("Hello");
    expect(response).toBe("Google response");
  });
});

describe("OpenAICompatibleClient", () => {
  it("should generate text", async () => {
    const client = new OpenAICompatibleClient({
      provider: "openai-compatible",
      apiKey: "test-key",
      model: "deepseek-chat",
    });
    const response = await client.generateText("Hello");
    expect(response).toBe("OpenAI response");
  });
});
