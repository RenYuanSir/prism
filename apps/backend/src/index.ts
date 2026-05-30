import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import type { Request, Response } from "express";
import { GitHubService } from "./services/github.js";

dotenv.config();

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

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
