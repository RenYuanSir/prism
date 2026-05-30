import type { AIConsensusResult, AIFixSuggestion, SavedReview } from "@prism/shared";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import type { Request, Response } from "express";
import { createDefaultPipeline } from "./services/ai-review-pipeline.js";
import { analyzeDiff } from "./services/diff-analyzer.js";
import { GitHubService } from "./services/github.js";
import { HistoryStore } from "./services/history-store.js";
import { analyzeImpact } from "./services/impact-analyzer.js";

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

    const pipeline = createDefaultPipeline();
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
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  // Track client disconnect
  let aborted = false;
  req.on("close", () => {
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

    const pipeline = createDefaultPipeline();
    await pipeline.runStream(pr, diff, semanticDiff, fileContents, (event) => {
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
    });

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
        },
        review: {
          summary: { summary: collectedSummary, stage: "summary" },
          risk: {
            issues: consensus.consensusIssues.map((i) => i.issue),
            stage: "risk",
          },
          consensus,
          raceConditions: [],
          suggestion: { suggestions: collectedSuggestions, stage: "suggestion" },
        },
        semanticDiff,
        createdAt: new Date().toISOString(),
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

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
