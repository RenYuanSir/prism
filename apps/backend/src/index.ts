import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import type { Request, Response } from "express";
import { createDefaultPipeline } from "./services/ai-review-pipeline.js";
import { analyzeDiff } from "./services/diff-analyzer.js";
import { GitHubService } from "./services/github.js";
import { analyzeImpact } from "./services/impact-analyzer.js";

dotenv.config({ path: "../../.env" });

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
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

    res.json({
      success: true,
      data: { ...pr, diff },
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
