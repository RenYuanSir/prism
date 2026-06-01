import type { AIConsensusResult, AIFixSuggestion, ConsensusIssue } from "@prism/shared";

/** Issues filtered to critical + warning only, from all consensus categories */
export interface FilteredIssue {
  issue: ConsensusIssue["issue"];
  confidence: ConsensusIssue["confidence"];
  models: string[];
  /** Whether the issue comes from a single model (vs consensus) */
  source: "consensus" | "claudeOnly" | "geminiOnly";
}

/**
 * Filter consensus results to critical and warning severity only.
 * Combines consensusIssues, claudeOnly, and geminiOnly into a unified list.
 */
export function filterIssuesForPosting(consensus: AIConsensusResult): FilteredIssue[] {
  const result: FilteredIssue[] = [];

  for (const ci of consensus.consensusIssues) {
    if (ci.issue.severity === "critical" || ci.issue.severity === "warning") {
      result.push({
        issue: ci.issue,
        confidence: ci.confidence,
        models: ci.models,
        source: "consensus",
      });
    }
  }

  for (const finding of consensus.claudeOnly) {
    if (finding.severity === "critical" || finding.severity === "warning") {
      result.push({
        issue: finding,
        confidence: "medium",
        models: ["claude"],
        source: "claudeOnly",
      });
    }
  }

  for (const finding of consensus.geminiOnly) {
    if (finding.severity === "critical" || finding.severity === "warning") {
      result.push({
        issue: finding,
        confidence: "medium",
        models: ["gemini"],
        source: "geminiOnly",
      });
    }
  }

  // Sort: critical first, then warning (info already filtered out)
  const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
  result.sort((a, b) => severityOrder[a.issue.severity] - severityOrder[b.issue.severity]);

  return result;
}

/**
 * Build a GitHub PR Review markdown body from filtered review results.
 */
export function formatReviewBody(
  summary: string,
  consensus: AIConsensusResult,
  suggestions: AIFixSuggestion[],
  owner: string,
  repo: string,
  prNumber: number,
): string {
  const filtered = filterIssuesForPosting(consensus);
  const lines: string[] = [];

  lines.push("## 🤖 PRism AI Review");
  lines.push("");
  lines.push(`**PR**: ${owner}/${repo}#${prNumber}`);
  lines.push("");
  lines.push("### Summary");
  lines.push("");
  lines.push(summary);
  lines.push("");

  if (filtered.length === 0) {
    lines.push("No critical or warning-level issues found.");
    return lines.join("\n");
  }

  lines.push(`### Findings (${filtered.length} ${filtered.length === 1 ? "issue" : "issues"})`);
  lines.push("");

  // Build suggestion lookup: "file:line" → AIFixSuggestion
  const sugMap = new Map<string, AIFixSuggestion>();
  for (const s of suggestions) {
    sugMap.set(`${s.issue.file}:${s.issue.line}`, s);
  }

  for (const fi of filtered) {
    const emoji = fi.issue.severity === "critical" ? "🔴 Critical" : "🟡 Warning";
    lines.push(`#### ${emoji}: ${fi.issue.message}`);
    lines.push("");
    lines.push(`- **File**: \`${fi.issue.file}:${fi.issue.line}\``);

    // Consensus description
    if (fi.source === "consensus") {
      if (fi.models.length >= 2) {
        const modelNames = fi.models.join(" + ");
        lines.push(`- **Consensus**: ${modelNames} both agree`);
      } else {
        lines.push(`- **Consensus**: ${fi.models[0]} only`);
      }
    } else if (fi.source === "claudeOnly") {
      lines.push("- **Consensus**: Claude only");
    } else {
      lines.push("- **Consensus**: Gemini only");
    }

    lines.push(`- **Explanation**: ${fi.issue.explanation}`);
    lines.push("");

    // Attach fix suggestion if available
    const key = `${fi.issue.file}:${fi.issue.line}`;
    const sug = sugMap.get(key);
    if (sug) {
      lines.push("#### Suggested Fix");
      lines.push("");
      lines.push("```suggestion");
      lines.push(sug.suggestedCode);
      lines.push("```");
      lines.push("");
      if (sug.explanation) {
        lines.push(`_${sug.explanation}_`);
        lines.push("");
      }
    }
  }

  return lines.join("\n");
}
