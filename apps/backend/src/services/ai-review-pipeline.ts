import type {
  AIFixSuggestion,
  AIReviewResult,
  AIRiskIssue,
  AIRiskResult,
  AIRiskSeverity,
  AISuggestionResult,
  AISummaryResult,
  ModelFinding,
  SemanticDiff,
} from "@ai-pr-review/shared";
import type { PullRequest } from "@ai-pr-review/shared";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { mergeConsensus } from "./consensus-merger.js";

export interface LLMClient {
  generateText(prompt: string): Promise<string>;
}

export class GeminiClient implements LLMClient {
  private model;

  constructor(apiKey: string) {
    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  }

  async generateText(prompt: string): Promise<string> {
    const result = await this.model.generateContent(prompt);
    return result.response.text();
  }
}

export class ClaudeClient implements LLMClient {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async generateText(prompt: string): Promise<string> {
    const response = await this.client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from Claude");
    }
    return textBlock.text;
  }
}

export interface AIReviewPipelineConfig {
  summaryClient: LLMClient;
  riskClient: LLMClient;
  suggestionClient: LLMClient;
}

export class AIReviewPipeline {
  private summaryClient: LLMClient;
  private riskClient: LLMClient;
  private suggestionClient: LLMClient;

  constructor(config: AIReviewPipelineConfig) {
    this.summaryClient = config.summaryClient;
    this.riskClient = config.riskClient;
    this.suggestionClient = config.suggestionClient;
  }

  async run(pr: PullRequest, diff: string, semanticDiff: SemanticDiff): Promise<AIReviewResult> {
    const summary = await this.generateSummary(pr, semanticDiff);

    // Stage 2: Parallel Risk Analysis
    const [claudeFindings, geminiFindings] = await Promise.all([
      this.analyzeRisksWithModel(this.riskClient, "claude", pr, diff, semanticDiff),
      this.analyzeRisksWithModel(this.summaryClient, "gemini", pr, diff, semanticDiff),
    ]);

    // Stage 3: Consensus Merge
    const consensus = mergeConsensus(claudeFindings, geminiFindings);

    // Stage 4: Suggestions (only for high/medium confidence issues)
    const issuesForSuggestion = consensus.consensusIssues
      .filter((i) => i.confidence !== "low")
      .map((i) => i.issue);
    const suggestion = await this.generateSuggestions(issuesForSuggestion, diff);

    // Build backward-compatible risk result
    const risk: AIRiskResult = {
      issues: consensus.consensusIssues.map((i) => i.issue),
      stage: "risk",
    };

    return { summary, risk, consensus, suggestion };
  }

  async generateSummary(pr: PullRequest, semanticDiff: SemanticDiff): Promise<AISummaryResult> {
    const prompt = this.buildSummaryPrompt(pr, semanticDiff);
    const response = await this.summaryClient.generateText(prompt);
    const summary = this.parseSummaryResponse(response);
    return { summary, stage: "summary" };
  }

  async analyzeRisks(
    pr: PullRequest,
    diff: string,
    semanticDiff: SemanticDiff,
  ): Promise<AIRiskResult> {
    const prompt = this.buildRiskPrompt(pr, diff, semanticDiff);
    const response = await this.riskClient.generateText(prompt);
    const issues = this.parseRiskResponse(response);
    return { issues, stage: "risk" };
  }

  async generateSuggestions(issues: AIRiskIssue[], diff: string): Promise<AISuggestionResult> {
    if (issues.length === 0) {
      return { suggestions: [], stage: "suggestion" };
    }

    const prompt = this.buildSuggestionPrompt(issues, diff);
    const response = await this.suggestionClient.generateText(prompt);
    const suggestions = this.parseSuggestionResponse(response, issues);
    return { suggestions, stage: "suggestion" };
  }

  async analyzeRisksWithModel(
    client: LLMClient,
    modelName: "claude" | "gemini",
    pr: PullRequest,
    diff: string,
    semanticDiff: SemanticDiff,
  ): Promise<ModelFinding[]> {
    const prompt = this.buildRiskPrompt(pr, diff, semanticDiff);
    const response = await client.generateText(prompt);
    const issues = this.parseRiskResponse(response);

    // Convert AIRiskIssue to ModelFinding
    return issues.map((issue) => ({
      model: modelName,
      severity: issue.severity,
      message: issue.message,
      file: issue.file,
      line: issue.line,
      explanation: issue.explanation,
    }));
  }

  private buildSummaryPrompt(pr: PullRequest, semanticDiff: SemanticDiff): string {
    return `Analyze this pull request and provide a brief summary (2-3 sentences) of what it does.

PR Title: ${pr.title}
PR Description: ${pr.description || "(no description)"}
Branch: ${pr.branch} -> ${pr.baseBranch}

Files Changed: ${semanticDiff.totalFiles}
Additions: +${semanticDiff.totalAdditions}
Deletions: -${semanticDiff.totalDeletions}

Semantic Analysis:
${semanticDiff.summary}

File Changes:
${semanticDiff.fileChanges
  .map(
    (f) =>
      `- ${f.filename} (${f.status}): ${f.summary}
  Functions: ${f.functionChanges.map((fn) => `${fn.changeType}: ${fn.name}`).join(", ") || "none"}
  Imports: ${f.importChanges.map((i) => `${i.changeType}: ${i.module}`).join(", ") || "none"}
  Exports: ${f.exportChanges.map((e) => `${e.changeType}: ${e.name}`).join(", ") || "none"}`,
  )
  .join("\n")}

Provide a concise summary focusing on the purpose and scope of changes. Do not mention file counts or line counts. Respond with ONLY the summary text, no JSON, no markdown formatting.`;
  }

  private buildRiskPrompt(pr: PullRequest, diff: string, semanticDiff: SemanticDiff): string {
    return `Analyze this pull request for potential risks, bugs, security issues, and logic errors.

PR Title: ${pr.title}
PR Description: ${pr.description || "(no description)"}

Semantic Changes:
${semanticDiff.fileChanges.map((f) => `- ${f.filename}: ${f.summary}`).join("\n")}

Full Diff:
\`\`\`diff
${diff}
\`\`\`

Identify issues related to:
- Logic errors and bugs
- Security vulnerabilities (SQL injection, XSS, auth bypass, etc.)
- Error handling gaps
- Race conditions
- Performance issues
- Breaking changes

For each issue found, provide a JSON response with this exact structure:
{
  "issues": [
    {
      "severity": "critical" | "warning" | "info",
      "message": "Brief one-line description of the issue",
      "file": "path/to/file.ts",
      "line": 42,
      "explanation": "Detailed explanation of why this is risky and what could go wrong"
    }
  ]
}

If no issues are found, return: {"issues": []}

Focus on CODE QUALITY issues, not style preferences. Be specific with line numbers. Respond with ONLY the JSON, no markdown code blocks.`;
  }

  private buildSuggestionPrompt(issues: AIRiskIssue[], diff: string): string {
    const issuesList = issues
      .map(
        (issue, i) =>
          `${i + 1}. [${issue.severity.toUpperCase()}] ${issue.file}:${issue.line}
   ${issue.message}
   ${issue.explanation}`,
      )
      .join("\n\n");

    return `Given these code review issues, provide actionable fix suggestions with complete code replacements.

Issues Found:
${issuesList}

Relevant Diff Context:
\`\`\`diff
${diff}
\`\`\`

For each issue, provide a JSON response with this exact structure:
{
  "suggestions": [
    {
      "issueIndex": 0,
      "suggestedCode": "complete replacement code for the problematic section",
      "explanation": "Why this fix resolves the issue"
    }
  ]
}

Provide COMPLETE code replacements that can be directly applied. Include surrounding context (5+ lines) so the fix location is clear. Respond with ONLY the JSON, no markdown code blocks.`;
  }

  private parseSummaryResponse(response: string): string {
    return response.trim();
  }

  private parseRiskResponse(response: string): AIRiskIssue[] {
    try {
      const cleaned = response
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();
      const parsed = JSON.parse(cleaned) as { issues?: unknown[] };

      if (!parsed.issues || !Array.isArray(parsed.issues)) {
        return [];
      }

      return parsed.issues
        .filter((issue): issue is Record<string, unknown> => {
          return (
            typeof issue === "object" &&
            issue !== null &&
            "severity" in issue &&
            "message" in issue &&
            "file" in issue &&
            "line" in issue &&
            "explanation" in issue
          );
        })
        .map((issue) => ({
          severity: this.validateSeverity(issue.severity),
          message: String(issue.message),
          file: String(issue.file),
          line: Number(issue.line) || 0,
          explanation: String(issue.explanation),
        }));
    } catch {
      return [];
    }
  }

  private validateSeverity(severity: unknown): AIRiskSeverity {
    if (severity === "critical" || severity === "warning" || severity === "info") {
      return severity;
    }
    return "info";
  }

  private parseSuggestionResponse(response: string, issues: AIRiskIssue[]): AIFixSuggestion[] {
    try {
      const cleaned = response
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();
      const parsed = JSON.parse(cleaned) as { suggestions?: unknown[] };

      if (!parsed.suggestions || !Array.isArray(parsed.suggestions)) {
        return [];
      }

      return parsed.suggestions
        .filter((suggestion): suggestion is Record<string, unknown> => {
          return (
            typeof suggestion === "object" &&
            suggestion !== null &&
            "issueIndex" in suggestion &&
            "suggestedCode" in suggestion &&
            "explanation" in suggestion
          );
        })
        .map((suggestion) => {
          const index = Number(suggestion.issueIndex) || 0;
          const issue = issues[index] ?? issues[0];
          return {
            issue,
            suggestedCode: String(suggestion.suggestedCode),
            explanation: String(suggestion.explanation),
          };
        });
    } catch {
      return [];
    }
  }
}

export function createDefaultPipeline(): AIReviewPipeline {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const googleKey = process.env.GOOGLE_API_KEY;

  if (!anthropicKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }
  if (!googleKey) {
    throw new Error("GOOGLE_API_KEY environment variable is not set");
  }

  return new AIReviewPipeline({
    summaryClient: new GeminiClient(googleKey),
    riskClient: new ClaudeClient(anthropicKey),
    suggestionClient: new ClaudeClient(anthropicKey),
  });
}
