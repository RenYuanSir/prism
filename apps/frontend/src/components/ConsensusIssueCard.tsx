import type { ConsensusIssue } from "@prism/shared";
import { ChevronDown, ChevronUp, GitCompare } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SeverityBadge } from "./SeverityBadge";

interface ConsensusIssueCardProps {
  issue: ConsensusIssue;
}

export function ConsensusIssueCard({ issue }: ConsensusIssueCardProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const confidenceStyles = {
    high: "border-l-linear-success",
    medium: "border-l-yellow-500",
    low: "border-l-linear-text-muted/40",
  };

  const confidenceLabel = {
    high: t("consensus.highConfidence"),
    medium: t("consensus.mediumConfidence"),
    low: t("consensus.lowConfidence"),
  };

  const confidenceSegments = ["high", "medium", "low"] as const;
  const activeIndex = confidenceSegments.indexOf(issue.confidence);

  // Detect model disagreements for the disagreement zone
  const disagreements: string[] = [];
  if (issue.modelFindings.length >= 2) {
    const [a, b] = issue.modelFindings;
    if (a.severity !== b.severity) {
      disagreements.push(t("consensus.severityMismatch", { a: a.severity, b: b.severity }));
    }
    if (a.line !== b.line) {
      disagreements.push(
        t("consensus.lineMismatch", { a: a.line.toString(), b: b.line.toString() }),
      );
    }
  }

  return (
    <div
      className={`border border-linear-border-subtle border-l-2 rounded-lg p-4 mb-3 bg-linear-surface/20 transition-colors ${confidenceStyles[issue.confidence]}`}
    >
      {/* Confidence Bar */}
      <div className="flex items-center gap-1.5 mb-3">
        {confidenceSegments.map((seg, i) => (
          <div
            key={seg}
            className={`h-1 rounded-full flex-1 transition-all ${
              i <= activeIndex
                ? seg === "high"
                  ? "bg-linear-success"
                  : seg === "medium"
                    ? "bg-yellow-500"
                    : "bg-linear-text-muted/40"
                : "bg-linear-surface"
            }`}
          />
        ))}
        <span className="text-[10px] font-medium text-linear-text-muted ml-1 w-8 text-right">
          {confidenceLabel[issue.confidence].split(" ")[0]}
        </span>
      </div>

      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <SeverityBadge severity={issue.issue.severity} />
            <span className="text-sm font-medium text-linear-text-secondary">
              {issue.issue.message}
            </span>
          </div>
          <div className="text-xs text-linear-text-tertiary font-mono mb-1">
            {issue.issue.file}:{issue.issue.line}
          </div>
          <div className="text-xs text-linear-text-muted">{confidenceLabel[issue.confidence]}</div>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-linear-text-tertiary hover:text-linear-text-secondary mt-1 shrink-0"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 space-y-3 border-t border-linear-border-subtle pt-3">
          {/* Disagreement Zone */}
          {disagreements.length > 0 && (
            <div className="flex items-start gap-2 p-2 rounded bg-yellow-500/5 border border-yellow-500/15">
              <GitCompare className="h-3.5 w-3.5 text-yellow-500 mt-0.5 shrink-0" />
              <div className="text-xs space-y-0.5">
                <p className="font-medium text-yellow-400">{t("consensus.disagreementZone")}</p>
                {disagreements.map((d) => (
                  <p key={d} className="text-linear-text-muted">
                    {d}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Model explanations */}
          {issue.modelFindings.map((finding) => (
            <div key={finding.model} className="text-sm">
              <p className="text-xs font-medium text-linear-text-tertiary uppercase tracking-wider mb-1">
                {finding.model === "claude" ? t("consensus.claudeSays") : t("consensus.geminiSays")}
              </p>
              <p className="text-linear-text-secondary">{finding.explanation}</p>
            </div>
          ))}

          {/* Issue explanation fallback */}
          {issue.modelFindings.length < 2 && (
            <div className="text-sm text-linear-text-secondary">{issue.issue.explanation}</div>
          )}
        </div>
      )}
    </div>
  );
}
