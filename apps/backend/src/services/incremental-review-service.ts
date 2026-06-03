import type { AIRiskIssue, PullRequest, SemanticDiff, StreamEvent } from "@prism/shared";
import { AIReviewPipeline } from "./ai-review-pipeline.js";
import { filterDiffByFiles } from "./diff-analyzer.js";
import { GitHubService } from "./github.js";
import { HistoryStore } from "./history-store.js";
import type { LLMClient } from "./llm-client.js";
import { createPipelineClients, loadLLMConfig } from "./llm-config.js";

export interface IncrementalReviewConfig {
  githubToken: string;
  pipelineConfig?: {
    summaryClient: LLMClient;
    riskClient: LLMClient;
    geminiClient: LLMClient;
    suggestionClient: LLMClient;
  };
}

export class IncrementalReviewService {
  private github: GitHubService;
  private history: HistoryStore;
  private pipeline: AIReviewPipeline;

  constructor(config: IncrementalReviewConfig) {
    this.github = new GitHubService(config.githubToken);
    this.history = new HistoryStore();
    const pc = config.pipelineConfig ?? createPipelineClients(loadLLMConfig());
    this.pipeline = new AIReviewPipeline(pc);
  }

  async runIncremental(
    owner: string,
    repo: string,
    pr: PullRequest,
    diff: string,
    semanticDiff: SemanticDiff,
    fileContents: Record<string, string>,
    onEvent: (event: StreamEvent) => void,
  ): Promise<void> {
    const currentHeadSha = pr.commits[0]?.sha ?? "";

    const previousReview = await this.history.findByPr(owner, repo, pr.id);
    if (!previousReview) {
      await this.pipeline.runStream(pr, diff, semanticDiff, fileContents, onEvent);
      return;
    }

    const previousHeadSha = previousReview.pr.headSha;

    if (previousHeadSha === currentHeadSha) {
      onEvent({
        type: "incremental:delta",
        delta: {
          changedFiles: [],
          unchangedFiles: [],
          previousReviewId: previousReview.id,
          previousHeadSha,
          currentHeadSha,
        },
      });
      onEvent({ type: "done" });
      return;
    }

    let changedFileSet: Set<string>;
    try {
      const comparison = await this.github.compareCommits(
        owner,
        repo,
        previousHeadSha,
        currentHeadSha,
      );
      changedFileSet = new Set(comparison.files.map((f) => f.filename));
    } catch {
      await this.pipeline.runStream(pr, diff, semanticDiff, fileContents, onEvent);
      return;
    }

    const allFiles = pr.files.map((f) => f.filename);
    const changedFiles = allFiles.filter((f) => changedFileSet.has(f));
    const unchangedFiles = allFiles.filter((f) => !changedFileSet.has(f));

    onEvent({
      type: "incremental:delta",
      delta: {
        changedFiles,
        unchangedFiles,
        previousReviewId: previousReview.id,
        previousHeadSha,
        currentHeadSha,
      },
    });

    const preservedIssues = this.preserveFindings(previousReview, unchangedFiles);
    if (preservedIssues.length > 0) {
      onEvent({
        type: "incremental:preserved",
        issues: preservedIssues,
        raceConditions: [],
      });
    }

    if (changedFiles.length === 0) {
      onEvent({ type: "done" });
      return;
    }

    const filteredDiff = filterDiffByFiles(diff, changedFiles);
    const filteredSemanticDiff: SemanticDiff = {
      ...semanticDiff,
      fileChanges: semanticDiff.fileChanges.filter((fc) => changedFileSet.has(fc.filename)),
    };
    const filteredFileContents: Record<string, string> = {};
    for (const f of changedFiles) {
      if (fileContents[f] !== undefined) filteredFileContents[f] = fileContents[f];
    }

    await this.pipeline.runStream(
      pr,
      filteredDiff,
      filteredSemanticDiff,
      filteredFileContents,
      onEvent,
    );
  }

  private preserveFindings(
    previousReview: { review: { risk: { issues: AIRiskIssue[] } } },
    unchangedFiles: string[],
  ): AIRiskIssue[] {
    const unchangedSet = new Set(unchangedFiles);
    return previousReview.review.risk.issues.filter((i) => unchangedSet.has(i.file));
  }
}
