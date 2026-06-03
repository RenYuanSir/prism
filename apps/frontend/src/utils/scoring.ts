import type { AIReviewResult, ReviewScore, SemanticDiff } from "@prism/shared";

const WEIGHTS = {
  coverage: 0.3,
  agreement: 0.25,
  confidence: 0.25,
  specificity: 0.2,
} as const;

export function computeReviewScore(
  review: AIReviewResult,
  semanticDiff: SemanticDiff,
): ReviewScore {
  const coverage = computeCoverage(review, semanticDiff);
  const agreement = computeAgreement(review);
  const confidence = computeConfidence(review);
  const specificity = computeSpecificity(review);

  const total = Math.round(
    coverage * WEIGHTS.coverage * 100 +
      agreement * WEIGHTS.agreement * 100 +
      confidence * WEIGHTS.confidence * 100 +
      specificity * WEIGHTS.specificity * 100,
  );

  return { total, coverage, agreement, confidence, specificity, trend: null };
}

function computeCoverage(review: AIReviewResult, semanticDiff: SemanticDiff): number {
  const totalFiles = semanticDiff.totalFiles;
  if (totalFiles === 0) return 0.5;
  const filesWithIssues = new Set(review.risk.issues.map((i) => i.file));
  return Math.min(filesWithIssues.size / totalFiles, 1);
}

function computeAgreement(review: AIReviewResult): number {
  const total = review.consensus.consensusIssues.length;
  if (total === 0) return 1;
  return review.consensus.allAgreeCount / total;
}

function computeConfidence(review: AIReviewResult): number {
  const issues = review.consensus.consensusIssues;
  if (issues.length === 0) return 1;
  const weights = { high: 3, medium: 2, low: 1 };
  const totalWeight = issues.reduce((sum, i) => sum + weights[i.confidence], 0);
  return totalWeight / (issues.length * 3);
}

function computeSpecificity(review: AIReviewResult): number {
  const issues = review.risk.issues;
  if (issues.length === 0) return 1;
  const actionable = issues.filter((i) => i.severity === "critical" || i.severity === "warning");
  return actionable.length / issues.length;
}
