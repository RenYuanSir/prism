import { describe, expect, it } from "vitest";
import { parseGitHubPrUrl } from "./index";

describe("parseGitHubPrUrl", () => {
  it("parses a standard HTTPS GitHub PR URL", () => {
    const result = parseGitHubPrUrl("https://github.com/facebook/react/pull/28735");
    expect(result).toEqual({ owner: "facebook", repo: "react", pullNumber: 28735 });
  });

  it("parses a URL with /files suffix", () => {
    const result = parseGitHubPrUrl("https://github.com/vercel/next.js/pull/55000/files");
    expect(result).toEqual({ owner: "vercel", repo: "next.js", pullNumber: 55000 });
  });

  it("parses a URL with /commits suffix", () => {
    const result = parseGitHubPrUrl("https://github.com/microsoft/typescript/pull/58000/commits");
    expect(result).toEqual({ owner: "microsoft", repo: "typescript", pullNumber: 58000 });
  });

  it("parses a URL without protocol", () => {
    const result = parseGitHubPrUrl("github.com/owner-name/repo-name/pull/42");
    expect(result).toEqual({ owner: "owner-name", repo: "repo-name", pullNumber: 42 });
  });

  it("parses a URL with http protocol", () => {
    const result = parseGitHubPrUrl("http://github.com/foo/bar/pull/99");
    expect(result).toEqual({ owner: "foo", repo: "bar", pullNumber: 99 });
  });

  it("parses a URL with hash fragment", () => {
    const result = parseGitHubPrUrl("http://github.com/owner/repo/pull/99#discussion");
    expect(result).toEqual({ owner: "owner", repo: "repo", pullNumber: 99 });
  });

  it("parses a URL with trailing whitespace", () => {
    const result = parseGitHubPrUrl("  https://github.com/a/b/pull/7  ");
    expect(result).toEqual({ owner: "a", repo: "b", pullNumber: 7 });
  });

  it("returns null for a non-GitHub URL", () => {
    expect(parseGitHubPrUrl("https://gitlab.com/owner/repo/-/merge_requests/123")).toBeNull();
  });

  it("returns null for URL with PR number 0", () => {
    expect(parseGitHubPrUrl("https://github.com/owner/repo/pull/0")).toBeNull();
  });

  it("returns null for negative PR number", () => {
    expect(parseGitHubPrUrl("https://github.com/owner/repo/pull/-1")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseGitHubPrUrl("")).toBeNull();
  });

  it("returns null for random text", () => {
    expect(parseGitHubPrUrl("not a url")).toBeNull();
  });
});
