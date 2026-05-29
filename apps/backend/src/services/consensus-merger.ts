import type {
  AIConsensusResult,
  AIRiskIssue,
  ConsensusIssue,
  ModelFinding,
} from "@ai-pr-review/shared";

export function mergeConsensus(
  claudeFindings: ModelFinding[],
  geminiFindings: ModelFinding[],
): AIConsensusResult {
  const matched: ConsensusIssue[] = [];
  const unmatchedClaude = [...claudeFindings];
  const unmatchedGemini = [...geminiFindings];

  // Match findings from both models
  for (let i = unmatchedClaude.length - 1; i >= 0; i--) {
    const claude = unmatchedClaude[i];
    if (!claude) continue;

    for (let j = unmatchedGemini.length - 1; j >= 0; j--) {
      const gemini = unmatchedGemini[j];
      if (!gemini) continue;

      if (isMatch(claude, gemini)) {
        const consensus = createConsensusIssue(claude, gemini);
        matched.push(consensus);
        unmatchedClaude.splice(i, 1);
        unmatchedGemini.splice(j, 1);
        break;
      }
    }
  }

  // Sort by confidence (high > medium > low), then by severity
  matched.sort((a, b) => {
    const confidenceOrder = { high: 0, medium: 1, low: 2 };
    const severityOrder = { critical: 0, warning: 1, info: 2 };

    const confDiff = confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
    if (confDiff !== 0) return confDiff;

    return severityOrder[a.issue.severity] - severityOrder[b.issue.severity];
  });

  return {
    consensusIssues: matched,
    claudeOnly: unmatchedClaude,
    geminiOnly: unmatchedGemini,
    allAgreeCount: matched.filter((i) => i.confidence === "high").length,
    claudeTotal: claudeFindings.length,
    geminiTotal: geminiFindings.length,
  };
}

function isMatch(a: ModelFinding, b: ModelFinding): boolean {
  return (
    a.file === b.file &&
    Math.abs(a.line - b.line) <= 3 &&
    severityCompatible(a.severity, b.severity)
  );
}

function severityCompatible(a: string, b: string): boolean {
  if (a === "info" || b === "info") return a === b;
  return true; // critical and warning are compatible
}

function createConsensusIssue(claude: ModelFinding, gemini: ModelFinding): ConsensusIssue {
  // Use Claude's finding as the primary issue
  const issue: AIRiskIssue = {
    severity: claude.severity,
    message: claude.message,
    file: claude.file,
    line: claude.line,
    explanation: claude.explanation,
  };

  return {
    issue,
    confidence: "high",
    models: ["claude", "gemini"],
    modelFindings: [claude, gemini],
  };
}
