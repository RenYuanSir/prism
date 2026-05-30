// Shared types for the AI PR Review application

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
