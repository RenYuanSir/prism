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
