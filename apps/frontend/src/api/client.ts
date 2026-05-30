import type {
  AIReviewResult,
  ApiResponse,
  ImpactGraph,
  PullRequest,
  SemanticDiff,
} from "@prism/shared";

const BASE_URL = "/api";

export interface PRWithDiff extends PullRequest {
  diff: string;
}

export interface ReviewResponse {
  pr: {
    id: number;
    title: string;
    description: string;
    author: string;
    branch: string;
    baseBranch: string;
  };
  semanticDiff: SemanticDiff;
  review: AIReviewResult;
}

export interface ImpactResponse {
  impactGraph: ImpactGraph;
}

export async function fetchPR(
  owner: string,
  repo: string,
  pullNumber: number,
): Promise<ApiResponse<PRWithDiff>> {
  const response = await fetch(`${BASE_URL}/pr/${owner}/${repo}/${pullNumber}`);
  return response.json();
}

export async function triggerReview(
  owner: string,
  repo: string,
  pullNumber: number,
): Promise<ApiResponse<ReviewResponse>> {
  const response = await fetch(`${BASE_URL}/review/${owner}/${repo}/${pullNumber}`, {
    method: "POST",
  });
  return response.json();
}

export async function fetchImpact(
  owner: string,
  repo: string,
  pullNumber: number,
): Promise<ApiResponse<ImpactResponse>> {
  const response = await fetch(`${BASE_URL}/impact/${owner}/${repo}/${pullNumber}`, {
    method: "POST",
  });
  return response.json();
}

export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/health`);
    const data = await response.json();
    return data.status === "ok";
  } catch {
    return false;
  }
}
