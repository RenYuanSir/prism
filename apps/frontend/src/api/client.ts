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

export interface StreamEvent {
  type: string;
  stage?: string;
  summary?: string;
  model?: string;
  findings?: Array<{
    model: string;
    severity: string;
    message: string;
    file: string;
    line: number;
    explanation: string;
  }>;
  consensus?: Record<string, unknown>;
  suggestions?: unknown[];
  message?: string;
}

function parseSSEChunk(chunk: string): StreamEvent | null {
  const lines = chunk.split("\n");
  let eventType = "";
  let dataStr = "";
  for (const line of lines) {
    if (line.startsWith("event: ")) eventType = line.slice(7).trim();
    else if (line.startsWith("data: ")) dataStr = line.slice(6);
  }
  if (!eventType || !dataStr) return null;
  try {
    return JSON.parse(dataStr) as StreamEvent;
  } catch {
    return null;
  }
}

export async function streamReview(
  owner: string,
  repo: string,
  pullNumber: number,
  onEvent: (event: StreamEvent) => void,
  onError: (error: string) => void,
  onDone: () => void,
): Promise<AbortController> {
  const controller = new AbortController();
  const response = await fetch(`${BASE_URL}/review/${owner}/${repo}/${pullNumber}/stream`, {
    method: "POST",
    signal: controller.signal,
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  (async () => {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          if (!part.trim()) continue;
          const event = parseSSEChunk(part);
          if (!event) continue;
          if (event.type === "done") {
            onDone();
            return;
          }
          if (event.type === "error") {
            onError(event.message ?? "Unknown error");
            return;
          }
          onEvent(event);
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      onError(err instanceof Error ? err.message : "Connection lost");
    }
  })();
  return controller;
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

export async function fetchHistory(): Promise<
  ApiResponse<
    Array<{
      id: string;
      owner: string;
      repo: string;
      prNumber: number;
      title: string;
      createdAt: string;
      riskCount: number;
      criticalCount: number;
      summarySnippet: string;
    }>
  >
> {
  const response = await fetch(`${BASE_URL}/history`);
  return response.json();
}

export async function fetchHistoryDetail(id: string): Promise<ApiResponse<ReviewResponse>> {
  const response = await fetch(`${BASE_URL}/history/${id}`);
  const json = await response.json();
  if (json.success && json.data) {
    // Map SavedReview.pr.prNumber -> ReviewResponse.pr.id for type compatibility
    return {
      success: true,
      data: {
        ...json.data,
        pr: {
          id: json.data.pr.prNumber,
          title: json.data.pr.title,
          description: json.data.pr.description,
          author: json.data.pr.author,
          branch: json.data.pr.branch,
          baseBranch: json.data.pr.baseBranch,
        },
      },
    };
  }
  return json;
}

export interface LLMStageConfig {
  provider: string;
  model: string;
  apiKey: string;
  baseUrl?: string;
}

export interface LLMSettings {
  summary: LLMStageConfig;
  risk: LLMStageConfig;
  gemini: LLMStageConfig;
  suggestion: LLMStageConfig;
}

export interface SafeLLMSettings {
  summary: Omit<LLMStageConfig, "apiKey">;
  risk: Omit<LLMStageConfig, "apiKey">;
  gemini: Omit<LLMStageConfig, "apiKey">;
  suggestion: Omit<LLMStageConfig, "apiKey">;
}

export async function fetchSettings(): Promise<ApiResponse<SafeLLMSettings | null>> {
  const response = await fetch(`${BASE_URL}/settings`);
  return response.json();
}

export async function saveSettings(settings: LLMSettings): Promise<ApiResponse<null>> {
  const response = await fetch(`${BASE_URL}/settings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  return response.json();
}
