import type { PRCommit, PRFile, PullRequest } from "@prism/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GitHubService } from "./github";

vi.mock("@octokit/rest", () => {
  const mockOctokit = {
    pulls: {
      get: vi.fn(),
      listFiles: vi.fn(),
      listCommits: vi.fn(),
    },
    repos: {
      getContent: vi.fn(),
    },
  };

  return {
    Octokit: vi.fn(() => mockOctokit),
    __mockOctokit: mockOctokit,
  };
});

const { __mockOctokit: mockOctokit } = (await import("@octokit/rest")) as any;

describe("GitHubService", () => {
  let service: GitHubService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GitHubService("test-token");
  });

  describe("getPullRequest", () => {
    it("should fetch and map PR details", async () => {
      mockOctokit.pulls.get.mockResolvedValue({
        data: {
          id: 123,
          number: 42,
          title: "Add feature X",
          body: "This adds feature X",
          user: { login: "octocat" },
          head: { ref: "feat/feature-x" },
          base: { ref: "main" },
        },
      });

      mockOctokit.pulls.listFiles.mockResolvedValue({ data: [] });
      mockOctokit.pulls.listCommits.mockResolvedValue({ data: [] });

      const result: PullRequest = await service.getPullRequest("owner", "repo", 42);

      expect(result).toEqual({
        id: 42,
        title: "Add feature X",
        description: "This adds feature X",
        author: "octocat",
        branch: "feat/feature-x",
        baseBranch: "main",
        files: [],
        commits: [],
      });

      expect(mockOctokit.pulls.get).toHaveBeenCalledWith({
        owner: "owner",
        repo: "repo",
        pull_number: 42,
      });
    });

    it("should handle null PR body", async () => {
      mockOctokit.pulls.get.mockResolvedValue({
        data: {
          id: 456,
          number: 10,
          title: "Quick fix",
          body: null,
          user: { login: "dev" },
          head: { ref: "fix/bug" },
          base: { ref: "main" },
        },
      });

      mockOctokit.pulls.listFiles.mockResolvedValue({ data: [] });
      mockOctokit.pulls.listCommits.mockResolvedValue({ data: [] });

      const result = await service.getPullRequest("owner", "repo", 10);

      expect(result.description).toBe("");
    });
  });

  describe("getPullRequestDiff", () => {
    it("should fetch PR diff as string", async () => {
      const diffContent = "diff --git a/file.ts b/file.ts\n--- a/file.ts\n+++ b/file.ts";
      mockOctokit.pulls.get.mockResolvedValue({
        data: diffContent,
      });

      const result: string = await service.getPullRequestDiff("owner", "repo", 42);

      expect(result).toBe(diffContent);
      expect(mockOctokit.pulls.get).toHaveBeenCalledWith({
        owner: "owner",
        repo: "repo",
        pull_number: 42,
        mediaType: { format: "diff" },
      });
    });
  });

  describe("getPullRequestFiles", () => {
    it("should fetch and map PR files", async () => {
      mockOctokit.pulls.listFiles.mockResolvedValue({
        data: [
          {
            filename: "src/index.ts",
            status: "modified",
            additions: 10,
            deletions: 3,
            changes: 13,
            patch: "@@ -1,3 +1,10 @@\n+new line",
          },
          {
            filename: "src/old.ts",
            status: "removed",
            additions: 0,
            deletions: 50,
            changes: 50,
            patch: undefined,
          },
        ],
      });

      const result: PRFile[] = await service.getPullRequestFiles("owner", "repo", 42);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        filename: "src/index.ts",
        status: "modified",
        additions: 10,
        deletions: 3,
        changes: 13,
        patch: "@@ -1,3 +1,10 @@\n+new line",
      });
      expect(result[1]).toEqual({
        filename: "src/old.ts",
        status: "removed",
        additions: 0,
        deletions: 50,
        changes: 50,
        patch: undefined,
      });
    });

    it("should handle renamed files", async () => {
      mockOctokit.pulls.listFiles.mockResolvedValue({
        data: [
          {
            filename: "src/new-name.ts",
            status: "renamed",
            additions: 0,
            deletions: 0,
            changes: 0,
            patch: undefined,
          },
        ],
      });

      const result = await service.getPullRequestFiles("owner", "repo", 42);

      expect(result[0].status).toBe("renamed");
    });
  });

  describe("getPullRequestCommits", () => {
    it("should fetch and map PR commits", async () => {
      mockOctokit.pulls.listCommits.mockResolvedValue({
        data: [
          {
            sha: "abc123def456",
            commit: {
              message: "feat: add new feature",
              author: {
                name: "Test User",
                date: "2024-01-15T10:00:00Z",
              },
            },
          },
          {
            sha: "789xyz012abc",
            commit: {
              message: "fix: resolve bug",
              author: {
                name: "Another User",
                date: "2024-01-16T14:30:00Z",
              },
            },
          },
        ],
      });

      const result: PRCommit[] = await service.getPullRequestCommits("owner", "repo", 42);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        sha: "abc123def456",
        message: "feat: add new feature",
        author: "Test User",
        date: "2024-01-15T10:00:00Z",
      });
      expect(result[1]).toEqual({
        sha: "789xyz012abc",
        message: "fix: resolve bug",
        author: "Another User",
        date: "2024-01-16T14:30:00Z",
      });
    });

    it("should return empty array when no commits", async () => {
      mockOctokit.pulls.listCommits.mockResolvedValue({ data: [] });

      const result = await service.getPullRequestCommits("owner", "repo", 42);

      expect(result).toEqual([]);
    });
  });

  describe("getFileContent", () => {
    it("should fetch and decode file content from base64", async () => {
      const fileContent = "export function hello() { return 'world'; }";
      const base64Content = Buffer.from(fileContent).toString("base64");

      mockOctokit.repos.getContent.mockResolvedValue({
        data: {
          content: base64Content,
          encoding: "base64",
        },
      });

      const result = await service.getFileContent("owner", "repo", "src/hello.ts", "main");

      expect(result).toBe(fileContent);
      expect(mockOctokit.repos.getContent).toHaveBeenCalledWith({
        owner: "owner",
        repo: "repo",
        path: "src/hello.ts",
        ref: "main",
      });
    });

    it("should throw error when content is not available", async () => {
      mockOctokit.repos.getContent.mockResolvedValue({
        data: {
          type: "dir",
        },
      });

      await expect(service.getFileContent("owner", "repo", "src/", "main")).rejects.toThrow(
        "Cannot get content for src/",
      );
    });
  });
});
