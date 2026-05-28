// Shared types for the AI PR Review application

export interface PullRequest {
  id: string;
  title: string;
  description: string;
  author: string;
  repository: string;
  branch: string;
  baseBranch: string;
  url: string;
  createdAt: string;
}

export interface ReviewComment {
  file: string;
  line: number;
  body: string;
  severity: "info" | "warning" | "error";
}

export interface ReviewResult {
  prId: string;
  summary: string;
  comments: ReviewComment[];
  approved: boolean;
  reviewedAt: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
