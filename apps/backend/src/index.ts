import type {
  AIConsensusResult,
  AIFixSuggestion,
  AIReviewResult,
  EmbeddingVector,
  LLMEmbeddingConfig,
  SavedReview,
  SimilarPR,
} from "@prism/shared";
import type { StreamEvent } from "@prism/shared";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import type { Request, Response } from "express";
import { AIReviewPipeline } from "./services/ai-review-pipeline.js";
import { analyzeDiff } from "./services/diff-analyzer.js";
import { buildReviewText, generateEmbedding } from "./services/embedding-service.js";
import { GitHubService } from "./services/github.js";
import { HistoryStore } from "./services/history-store.js";
import { analyzeImpact } from "./services/impact-analyzer.js";
import { IncrementalReviewService } from "./services/incremental-review-service.js";
import {
  clearLLMConfigCache,
  createPipelineClients,
  loadLLMConfig,
} from "./services/llm-config.js";
import type { LLMPipelineConfig } from "./services/llm-config.js";
import { formatReviewBody } from "./services/pr-comment-service.js";
import { computeScore, computeTrend } from "./services/review-scorer.js";
import { SettingsStore } from "./services/settings-store.js";
import { findSimilarPRs } from "./services/similarity-service.js";

dotenv.config({ path: "../../.env" });

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/history", async (_req: Request, res: Response) => {
  try {
    const store = new HistoryStore();
    const entries = await store.list();
    res.json({ success: true, data: entries });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
  }
});

app.get("/api/history/:id", async (req: Request, res: Response) => {
  try {
    const store = new HistoryStore();
    const review = await store.get(req.params.id);
    if (!review) {
      res.status(404).json({ success: false, error: "Review not found" });
      return;
    }
    res.json({ success: true, data: review });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
  }
});

app.get("/api/pr/:owner/:repo/:pullNumber", async (req: Request, res: Response) => {
  const { owner, repo, pullNumber } = req.params;
  const prNumber = Number(pullNumber);

  if (!Number.isInteger(prNumber) || prNumber <= 0) {
    res.status(400).json({
      success: false,
      error: "pullNumber must be a positive integer",
    });
    return;
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    res.status(500).json({
      success: false,
      error: "GITHUB_TOKEN environment variable is not set",
    });
    return;
  }

  try {
    const github = new GitHubService(token);
    const [pr, diff] = await Promise.all([
      github.getPullRequest(owner, repo, prNumber),
      github.getPullRequestDiff(owner, repo, prNumber),
    ]);

    const semanticDiff = await analyzeDiff(pr.files, diff);

    res.json({
      success: true,
      data: { ...pr, diff, semanticDiff },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({
      success: false,
      error: `Failed to fetch PR: ${message}`,
    });
  }
});

app.post("/api/review/:owner/:repo/:pullNumber", async (req: Request, res: Response) => {
  const { owner, repo, pullNumber } = req.params;
  const prNumber = Number(pullNumber);

  if (!Number.isInteger(prNumber) || prNumber <= 0) {
    res.status(400).json({
      success: false,
      error: "pullNumber must be a positive integer",
    });
    return;
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    res.status(500).json({
      success: false,
      error: "GITHUB_TOKEN environment variable is not set",
    });
    return;
  }

  try {
    const github = new GitHubService(token);
    const [pr, diff] = await Promise.all([
      github.getPullRequest(owner, repo, prNumber),
      github.getPullRequestDiff(owner, repo, prNumber),
    ]);

    const semanticDiff = await analyzeDiff(pr.files, diff);

    // Fetch file contents for race condition analysis
    const fileContentEntries = await Promise.all(
      pr.files.map(async (file) => {
        try {
          const content = await github.getFileContent(owner, repo, file.filename, pr.branch);
          return [file.filename, content] as const;
        } catch {
          return [file.filename, ""] as const;
        }
      }),
    );
    const fileContents = Object.fromEntries(fileContentEntries);

    const pipeline = new AIReviewPipeline(createPipelineClients(loadLLMConfig()));
    const reviewResult = await pipeline.run(pr, diff, semanticDiff, fileContents);

    res.json({
      success: true,
      data: {
        pr: {
          id: pr.id,
          title: pr.title,
          description: pr.description,
          author: pr.author,
          branch: pr.branch,
          baseBranch: pr.baseBranch,
        },
        semanticDiff,
        review: reviewResult,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({
      success: false,
      error: `Failed to review PR: ${message}`,
    });
  }
});

async function findSimilarPRsIfHistoryExists(
  reviewText: string,
  owner: string,
  repo: string,
  prNumber: number,
  embeddingConfig: LLMEmbeddingConfig | undefined,
): Promise<SimilarPR[]> {
  if (!embeddingConfig?.apiKey) return [];
  const store = new HistoryStore();
  const allEntries = await store.list();
  const repoWithEmbeddings = allEntries.filter(
    (e) => e.owner === owner && e.repo === repo && e.hasEmbedding,
  );
  if (repoWithEmbeddings.length < 2) return [];
  try {
    const embedding = await generateEmbedding(reviewText, embeddingConfig);
    return await findSimilarPRs(embedding, owner, repo, prNumber, store, 3);
  } catch (err) {
    console.warn("Similar PR search failed:", err);
    return [];
  }
}

app.post("/api/review/:owner/:repo/:pullNumber/stream", async (req: Request, res: Response) => {
  const { owner, repo, pullNumber } = req.params;
  const prNumber = Number(pullNumber);

  if (!Number.isInteger(prNumber) || prNumber <= 0) {
    res.status(400).json({ success: false, error: "pullNumber must be a positive integer" });
    return;
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    res.status(500).json({ success: false, error: "GITHUB_TOKEN is not set" });
    return;
  }

  // SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  // Disable Nagle's algorithm — ensures each write() flushes immediately
  // under chunked transfer encoding on Windows+Node 22.
  res.socket?.setNoDelay(true);
  // Write an SSE comment to establish the connection (some proxies/protocols
  // expect the first byte within ~15s).
  res.write(":ok\n\n");

  // Track client disconnect via response close — res.on("close") correctly
  // fires only when the underlying connection is actually closed by the client.
  // req.on("close") fires prematurely on Windows+Node 22 when the request body
  // is consumed, which would drop all SSE events.
  let aborted = false;
  res.on("close", () => {
    aborted = true;
  });

  try {
    const github = new GitHubService(token);
    const [pr, diff] = await Promise.all([
      github.getPullRequest(owner, repo, prNumber),
      github.getPullRequestDiff(owner, repo, prNumber),
    ]);

    const semanticDiff = await analyzeDiff(pr.files, diff);

    const fileContentEntries = await Promise.all(
      pr.files.map(async (file) => {
        try {
          const content = await github.getFileContent(owner, repo, file.filename, pr.branch);
          return [file.filename, content] as const;
        } catch {
          return [file.filename, ""] as const;
        }
      }),
    );
    const fileContents = Object.fromEntries(fileContentEntries);

    // Collect review data during streaming for history
    let collectedSummary = "";
    let collectedConsensus: AIConsensusResult | null = null;
    let collectedSuggestions: AIFixSuggestion[] = [];

    const handleEvent = (event: StreamEvent) => {
      if (aborted) return;
      if (event.type === "summary" && event.summary) {
        collectedSummary = event.summary;
      }
      if (event.type === "consensus" && event.consensus) {
        collectedConsensus = event.consensus;
      }
      if (event.type === "suggestion" && event.suggestions) {
        collectedSuggestions = event.suggestions;
      }
      const data = JSON.stringify(event);
      res.write(`event: ${event.type}\ndata: ${data}\n\n`);
    };

    const pipelineConfig = createPipelineClients(loadLLMConfig());

    if (req.body?.incremental === true) {
      const incrementalService = new IncrementalReviewService({
        githubToken: token,
        pipelineConfig,
      });
      await incrementalService.runIncremental(
        owner,
        repo,
        pr,
        diff,
        semanticDiff,
        fileContents,
        handleEvent,
      );
    } else {
      const pipeline = new AIReviewPipeline(pipelineConfig);
      await pipeline.runStream(pr, diff, semanticDiff, fileContents, handleEvent);
    }

    // Auto-save review history (non-blocking)
    if (!aborted) {
      const date = new Date().toISOString().split("T")[0];
      const id = `${date}-${owner}-${repo}-${prNumber}`;
      const consensus: AIConsensusResult = collectedConsensus ?? {
        consensusIssues: [],
        claudeOnly: [],
        geminiOnly: [],
        allAgreeCount: 0,
        claudeTotal: 0,
        geminiTotal: 0,
      };
      const reviewResult: AIReviewResult = {
        summary: { summary: collectedSummary, stage: "summary" },
        risk: { issues: consensus.consensusIssues.map((i) => i.issue), stage: "risk" },
        consensus,
        raceConditions: [],
        suggestion: { suggestions: collectedSuggestions, stage: "suggestion" },
      };

      // Compute quality score and trend
      let scoreData = computeScore(reviewResult, semanticDiff);
      try {
        const historyStore = new HistoryStore();
        const recentScores = (await historyStore.list())
          .filter((e) => e.score)
          .map((e) => e.score!.total);
        const trend = computeTrend(scoreData.total, recentScores);
        scoreData = { ...scoreData, trend };
      } catch {
        // Trend unavailable, use null
      }

      if (!aborted) {
        const data = JSON.stringify({ type: "score", score: scoreData });
        res.write(`event: score\ndata: ${data}\n\n`);
      }

      // Generate embedding for similarity search
      const embeddingConfig = loadLLMConfig().embedding;
      let embedding: EmbeddingVector | undefined;
      let similarPRs: SimilarPR[] = [];

      if (embeddingConfig?.apiKey) {
        const reviewText = buildReviewText(reviewResult);
        try {
          const [emb, similars] = await Promise.all([
            generateEmbedding(reviewText, embeddingConfig),
            findSimilarPRsIfHistoryExists(reviewText, owner, repo, prNumber, embeddingConfig),
          ]);
          embedding = emb;
          similarPRs = similars;
        } catch (err) {
          console.warn("Embedding/similarity search failed:", err);
        }
      }

      // Send similar-prs event if found
      if (!aborted && similarPRs.length > 0) {
        const similarData = JSON.stringify({ type: "similar-prs", similarPRs });
        res.write(`event: similar-prs\ndata: ${similarData}\n\n`);
      }

      const savedReview: SavedReview = {
        id,
        pr: {
          owner,
          repo,
          prNumber,
          title: pr.title,
          description: pr.description,
          author: pr.author,
          branch: pr.branch,
          baseBranch: pr.baseBranch,
          headSha: pr.headSha,
        },
        review: reviewResult,
        semanticDiff,
        createdAt: new Date().toISOString(),
        score: scoreData,
        embedding,
      };
      try {
        await new HistoryStore().save(savedReview);
      } catch (err) {
        console.error("Failed to save review history:", err);
      }
    }

    if (!aborted) {
      res.end();
    }
  } catch (error) {
    if (!aborted) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.write(`event: error\ndata: ${JSON.stringify({ type: "error", message })}\n\n`);
      res.end();
    }
  }
});

app.post("/api/impact/:owner/:repo/:pullNumber", async (req: Request, res: Response) => {
  const { owner, repo, pullNumber } = req.params;
  const prNumber = Number(pullNumber);

  if (!Number.isInteger(prNumber) || prNumber <= 0) {
    res.status(400).json({
      success: false,
      error: "pullNumber must be a positive integer",
    });
    return;
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    res.status(500).json({
      success: false,
      error: "GITHUB_TOKEN environment variable is not set",
    });
    return;
  }

  try {
    const github = new GitHubService(token);
    const [pr, diff] = await Promise.all([
      github.getPullRequest(owner, repo, prNumber),
      github.getPullRequestDiff(owner, repo, prNumber),
    ]);

    const semanticDiff = await analyzeDiff(pr.files, diff);
    const impactGraph = analyzeImpact(semanticDiff);

    res.json({
      success: true,
      data: { impactGraph },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({
      success: false,
      error: `Failed to analyze impact: ${message}`,
    });
  }
});

// 鈹€鈹€ Post Comment to GitHub 鈹€鈹€

app.post("/api/review/:owner/:repo/:pullNumber/comment", async (req: Request, res: Response) => {
  const { owner, repo, pullNumber } = req.params;
  const prNumber = Number(pullNumber);

  if (!Number.isInteger(prNumber) || prNumber <= 0) {
    res.status(400).json({ success: false, error: "pullNumber must be a positive integer" });
    return;
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    res.status(500).json({ success: false, error: "GITHUB_TOKEN is not set" });
    return;
  }

  try {
    const { summary, consensus, suggestions } = req.body as {
      summary: string;
      consensus: import("@prism/shared").AIConsensusResult;
      suggestions: import("@prism/shared").AIFixSuggestion[];
    };

    if (!summary || !consensus || !suggestions) {
      res.status(400).json({
        success: false,
        error: "Missing required fields: summary, consensus, suggestions",
      });
      return;
    }

    const github = new GitHubService(token);
    const body = formatReviewBody(summary, consensus, suggestions, owner, repo, prNumber);
    const review = await github.createReview(owner, repo, prNumber, body);

    res.json({ success: true, data: review });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: `Failed to post review: ${message}` });
  }
});

// 鈹€鈹€ Settings 鈹€鈹€

app.get("/api/settings", async (_req: Request, res: Response) => {
  try {
    const store = new SettingsStore();
    const config = await store.load();
    if (config) {
      // Strip apiKey for security
      const safe = {
        summary: {
          provider: config.summary.provider,
          model: config.summary.model,
          baseUrl: config.summary.baseUrl,
        },
        risk: {
          provider: config.risk.provider,
          model: config.risk.model,
          baseUrl: config.risk.baseUrl,
        },
        gemini: {
          provider: config.gemini.provider,
          model: config.gemini.model,
          baseUrl: config.gemini.baseUrl,
        },
        suggestion: {
          provider: config.suggestion.provider,
          model: config.suggestion.model,
          baseUrl: config.suggestion.baseUrl,
        },
        embedding: {
          provider: config.embedding?.provider ?? "openai",
          model: config.embedding?.model ?? "text-embedding-3-small",
          baseUrl: config.embedding?.baseUrl ?? "https://api.openai.com/v1",
        },
      };
      res.json({ success: true, data: safe });
    } else {
      res.json({ success: true, data: null });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
  }
});

app.post("/api/settings", async (req: Request, res: Response) => {
  try {
    const store = new SettingsStore();
    const config = req.body as LLMPipelineConfig;
    // Basic validation
    const stages = ["summary", "risk", "gemini", "suggestion"] as const;
    for (const stage of stages) {
      if (!config[stage]?.provider || !config[stage]?.apiKey || !config[stage]?.model) {
        res
          .status(400)
          .json({ success: false, error: `Missing required fields for ${stage} stage` });
        return;
      }
    }
    await store.save(config);
    clearLLMConfigCache();
    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
