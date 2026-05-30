// Shared types for the PRism application

export interface PRFile {
  filename: string;
  status: "added" | "modified" | "removed" | "renamed";
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
}

export interface PRCommit {
  sha: string;
  message: string;
  author: string;
  date: string;
}

export interface PullRequest {
  id: number;
  title: string;
  description: string;
  author: string;
  branch: string;
  baseBranch: string;
  files: PRFile[];
  commits: PRCommit[];
}

export type ReviewIssueSeverity = "info" | "warning" | "error" | "critical";

export interface ReviewIssue {
  severity: ReviewIssueSeverity;
  message: string;
  file: string;
  line: number;
}

export interface ReviewResult {
  prId: number;
  summary: string;
  issues: ReviewIssue[];
  score: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Semantic diff types for AST-based change analysis
export type ChangeType = "added" | "modified" | "removed";

export interface FunctionChange {
  name: string;
  changeType: ChangeType;
  oldSignature?: string;
  newSignature?: string;
  description?: string;
}

export interface ImportChange {
  module: string;
  changeType: ChangeType;
  imports: string[];
  isDefault?: boolean;
}

export interface ExportChange {
  name: string;
  changeType: ChangeType;
  isDefault: boolean;
}

export interface FileChange {
  filename: string;
  status: "added" | "modified" | "removed" | "renamed";
  additions: number;
  deletions: number;
  changeType: ChangeType;
  summary: string;
  functionChanges: FunctionChange[];
  importChanges: ImportChange[];
  exportChanges: ExportChange[];
}

export interface SemanticDiff {
  fileChanges: FileChange[];
  summary: string;
  totalFiles: number;
  totalAdditions: number;
  totalDeletions: number;
}

// AI Review Pipeline types
export type PipelineStage = "summary" | "risk" | "suggestion";

export type StreamEvent =
  | { type: "stage:start"; stage: string }
  | { type: "summary"; summary: string }
  | { type: "risk:model-done"; model: string; findings: ModelFinding[] }
  | { type: "consensus"; consensus: AIConsensusResult }
  | { type: "suggestion"; suggestions: AIFixSuggestion[] }
  | { type: "done" }
  | { type: "error"; message: string };

export type AIRiskSeverity = "critical" | "warning" | "info";

export interface AIRiskIssue {
  severity: AIRiskSeverity;
  message: string;
  file: string;
  line: number;
  explanation: string;
}

export interface AIFixSuggestion {
  issue: AIRiskIssue;
  suggestedCode: string;
  explanation: string;
}

export interface AISummaryResult {
  summary: string;
  stage: "summary";
}

export interface AIRiskResult {
  issues: AIRiskIssue[];
  stage: "risk";
}

export interface AISuggestionResult {
  suggestions: AIFixSuggestion[];
  stage: "suggestion";
}

export interface AIReviewResult {
  summary: AISummaryResult;
  risk: AIRiskResult;
  consensus: AIConsensusResult;
  raceConditions: RaceConditionIssue[];
  suggestion: AISuggestionResult;
}

export interface HistoryEntry {
  id: string;
  owner: string;
  repo: string;
  prNumber: number;
  title: string;
  createdAt: string;
  riskCount: number;
  criticalCount: number;
  summarySnippet: string;
}

export interface SavedReview {
  id: string;
  pr: {
    owner: string;
    repo: string;
    prNumber: number;
    title: string;
    description: string;
    author: string;
    branch: string;
    baseBranch: string;
  };
  review: AIReviewResult;
  semanticDiff: SemanticDiff;
  createdAt: string;
}

export type ModelName = "claude" | "gemini";

export interface ModelFinding {
  model: ModelName;
  severity: AIRiskSeverity;
  message: string;
  file: string;
  line: number;
  explanation: string;
}

export type ConsensusConfidence = "high" | "medium" | "low";

export interface ConsensusIssue {
  issue: AIRiskIssue;
  confidence: ConsensusConfidence;
  models: ModelName[];
  modelFindings: ModelFinding[];
}

export interface AIConsensusResult {
  consensusIssues: ConsensusIssue[];
  claudeOnly: ModelFinding[];
  geminiOnly: ModelFinding[];
  allAgreeCount: number;
  claudeTotal: number;
  geminiTotal: number;
}

// Race condition detection types
export type ConcurrencyPatternType =
  | "async_function"
  | "promise_chain"
  | "callback"
  | "event_handler"
  | "timer";

export type SharedStateType =
  | "variable_write"
  | "db_operation"
  | "cache_operation"
  | "global_mutation";

export interface ConcurrencyPattern {
  type: ConcurrencyPatternType;
  file: string;
  line: number;
  endLine: number;
  functionName: string;
  sharedStateAccess: SharedStateAccess[];
}

export interface SharedStateAccess {
  type: SharedStateType;
  name: string;
  line: number;
  isWrite: boolean;
}

export interface RaceConditionIssue {
  severity: AIRiskSeverity;
  message: string;
  file: string;
  line: number;
  explanation: string;
  sharedState: string;
  patternA: ExecutionPath;
  patternB: ExecutionPath;
  conflictPoint: string;
  confidence: ConsensusConfidence;
  models: ModelName[];
}

export interface ExecutionPath {
  label: string;
  functionName: string;
  steps: PathStep[];
}

export interface PathStep {
  description: string;
  line: number;
  isConflictPoint: boolean;
}

// Cross-file impact heatmap types
export type ImpactLevel = "high" | "medium" | "low";

export interface ImpactNode {
  filename: string;
  impactScore: number;
  impactLevel: ImpactLevel;
  directDependents: string[];
  directDependencies: string[];
  changedExports: string[];
  affectedFileCount: number;
}

export interface ImpactEdge {
  from: string;
  to: string;
  symbols: string[];
}

export interface ImpactGraph {
  nodes: ImpactNode[];
  edges: ImpactEdge[];
  maxImpactScore: number;
  highImpactCount: number;
  mediumImpactCount: number;
  lowImpactCount: number;
}

// GitHub PR URL parser

/**
 * Parse a GitHub Pull Request URL into owner, repo, and PR number.
 * Returns null if the URL is not a valid GitHub PR URL.
 *
 * Supported formats:
 * - https://github.com/owner/repo/pull/123
 * - https://github.com/owner/repo/pull/123/files
 * - http://github.com/owner/repo/pull/123#discussion
 * - github.com/owner/repo/pull/123
 * - https://www.github.com/owner/repo/pull/123
 */
export function parseGitHubPrUrl(
  url: string,
): { owner: string; repo: string; pullNumber: number } | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  const regex = /(?:www\.)?\bgithub\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/i;
  const match = trimmed.match(regex);
  if (!match) return null;

  const [, owner, repo, pullNumberStr] = match;
  const pullNumber = Number(pullNumberStr);
  if (!Number.isInteger(pullNumber) || pullNumber <= 0) return null;

  return { owner, repo, pullNumber };
}
