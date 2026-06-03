import type { AIReviewResult, LLMEmbeddingConfig } from "@prism/shared";
import { describe, expect, it, vi } from "vitest";
import { buildReviewText, generateEmbedding } from "./embedding-service.js";

function makeReview(overrides?: Partial<AIReviewResult>): AIReviewResult {
  return {
    summary: { summary: "This PR adds a new auth module.", stage: "summary" },
    risk: {
      issues: [
        {
          severity: "critical",
          message: "Hardcoded secret in config.ts",
          file: "src/config.ts",
          line: 12,
          explanation: "The API key is hardcoded instead of using env vars.",
        },
        {
          severity: "warning",
          message: "Missing rate limit on login endpoint",
          file: "src/auth.ts",
          line: 45,
          explanation: "No rate limiting is applied to the login handler.",
        },
      ],
      stage: "risk",
    },
    consensus: {
      consensusIssues: [],
      claudeOnly: [],
      geminiOnly: [],
      allAgreeCount: 0,
      claudeTotal: 0,
      geminiTotal: 0,
    },
    raceConditions: [],
    suggestion: { suggestions: [], stage: "suggestion" },
    ...overrides,
  };
}

describe("buildReviewText", () => {
  it("concatenates summary and all risk issues with file/line context", () => {
    const review = makeReview();
    const text = buildReviewText(review);
    expect(text).toContain("This PR adds a new auth module.");
    expect(text).toContain("[critical] src/config.ts:12 Hardcoded secret in config.ts");
    expect(text).toContain("[warning] src/auth.ts:45 Missing rate limit on login endpoint");
  });

  it("handles empty issues", () => {
    const review = makeReview({ risk: { issues: [], stage: "risk" } });
    const text = buildReviewText(review);
    expect(text).toContain("This PR adds a new auth module.");
    expect(text.split("\n").length).toBe(1);
  });

  it("handles empty summary", () => {
    const review = makeReview({ summary: { summary: "", stage: "summary" } });
    const text = buildReviewText(review);
    expect(text).toContain("[critical]");
  });
});

describe("generateEmbedding", () => {
  it("calls OpenAI embeddings endpoint with correct payload", async () => {
    const fakeFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ embedding: new Array(10).fill(0.1) }] }),
    });
    vi.stubGlobal("fetch", fakeFetch);

    const config: LLMEmbeddingConfig = {
      provider: "openai",
      model: "text-embedding-3-small",
      apiKey: "sk-test",
      baseUrl: "https://api.openai.com/v1",
    };

    const result = await generateEmbedding("test text", config);

    expect(fakeFetch).toHaveBeenCalledWith(
      "https://api.openai.com/v1/embeddings",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer sk-test",
        }),
        body: expect.stringContaining("text-embedding-3-small"),
      }),
    );
    expect(result).toHaveLength(10);
    vi.unstubAllGlobals();
  });

  it("uses custom baseUrl for openai-compatible providers", async () => {
    const fakeFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ embedding: [0.5] }] }),
    });
    vi.stubGlobal("fetch", fakeFetch);

    const config: LLMEmbeddingConfig = {
      provider: "openai-compatible",
      model: "custom-embed",
      apiKey: "sk-custom",
      baseUrl: "https://custom.api.com/v1",
    };

    await generateEmbedding("text", config);

    expect(fakeFetch).toHaveBeenCalledWith(
      "https://custom.api.com/v1/embeddings",
      expect.any(Object),
    );
    vi.unstubAllGlobals();
  });

  it("throws on API error response", async () => {
    const fakeFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
    });
    vi.stubGlobal("fetch", fakeFetch);

    const config: LLMEmbeddingConfig = {
      provider: "openai",
      model: "text-embedding-3-small",
      apiKey: "bad-key",
    };

    await expect(generateEmbedding("text", config)).rejects.toThrow(
      "Embedding API error: 401 Unauthorized",
    );
    vi.unstubAllGlobals();
  });
});
