import { Octokit } from "@octokit/rest";
import type { PRCommit, PRFile, PullRequest } from "@prism/shared";

export class GitHubService {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  async getPullRequest(owner: string, repo: string, pullNumber: number): Promise<PullRequest> {
    const { data: pr } = await this.octokit.pulls.get({
      owner,
      repo,
      pull_number: pullNumber,
    });

    const [files, commits] = await Promise.all([
      this.getPullRequestFiles(owner, repo, pullNumber),
      this.getPullRequestCommits(owner, repo, pullNumber),
    ]);

    return {
      id: pr.number,
      title: pr.title,
      description: pr.body ?? "",
      author: pr.user?.login ?? "unknown",
      branch: pr.head.ref,
      baseBranch: pr.base.ref,
      files,
      commits,
    };
  }

  async getPullRequestDiff(owner: string, repo: string, pullNumber: number): Promise<string> {
    const { data } = await this.octokit.pulls.get({
      owner,
      repo,
      pull_number: pullNumber,
      mediaType: { format: "diff" },
    });

    return data as unknown as string;
  }

  async getPullRequestFiles(owner: string, repo: string, pullNumber: number): Promise<PRFile[]> {
    const { data } = await this.octokit.pulls.listFiles({
      owner,
      repo,
      pull_number: pullNumber,
    });

    return data.map((file) => ({
      filename: file.filename,
      status: file.status as PRFile["status"],
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes,
      patch: file.patch,
    }));
  }

  async getPullRequestCommits(
    owner: string,
    repo: string,
    pullNumber: number,
  ): Promise<PRCommit[]> {
    const { data } = await this.octokit.pulls.listCommits({
      owner,
      repo,
      pull_number: pullNumber,
    });

    return data.map((commit) => ({
      sha: commit.sha,
      message: commit.commit.message,
      author: commit.commit.author?.name ?? "unknown",
      date: commit.commit.author?.date ?? "",
    }));
  }

  async getFileContent(owner: string, repo: string, path: string, ref: string): Promise<string> {
    const { data } = await this.octokit.repos.getContent({
      owner,
      repo,
      path,
      ref,
    });

    if ("content" in data && typeof data.content === "string") {
      return Buffer.from(data.content, "base64").toString("utf-8");
    }

    throw new Error(`Cannot get content for ${path}`);
  }

  async createReview(
    owner: string,
    repo: string,
    pullNumber: number,
    body: string,
  ): Promise<{ id: number; htmlUrl: string }> {
    const { data } = await this.octokit.pulls.createReview({
      owner,
      repo,
      pull_number: pullNumber,
      body,
      event: "COMMENT",
    });

    return {
      id: data.id,
      htmlUrl: data.html_url,
    };
  }
}
