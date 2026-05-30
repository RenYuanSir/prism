import type { ConsensusIssue } from "@ai-pr-review/shared";
import { useState } from "react";
import { SeverityBadge } from "./SeverityBadge";
import { ChevronDown, ChevronUp } from "lucide-react";

interface ConsensusIssueCardProps {
  issue: ConsensusIssue;
}

export function ConsensusIssueCard({ issue }: ConsensusIssueCardProps) {
  const [expanded, setExpanded] = useState(issue.confidence === "high");

  const confidenceStyles = {
    high: "bg-green-500/10 border-green-500/30",
    medium: "bg-yellow-500/10 border-yellow-500/30",
    low: "bg-slate-800/50 border-slate-700",
  };

  const confidenceLabel = {
    high: "\u{1F512} HIGH CONFIDENCE — Both models agree",
    medium: "⚠️ MEDIUM CONFIDENCE — Single model finding",
    low: "ℹ️ LOW CONFIDENCE — Minor, single model",
  };

  return (
    <div className={`border rounded-lg p-4 mb-3 ${confidenceStyles[issue.confidence]}`}>
      <div className="flex items-start gap-3 mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <SeverityBadge severity={issue.issue.severity} />
            <span className="text-sm font-medium text-slate-200">{issue.issue.message}</span>
          </div>
          <div className="text-xs text-slate-400 font-mono mb-1">
            {issue.issue.file}:{issue.issue.line}
          </div>
          <div className="text-xs text-slate-500">{confidenceLabel[issue.confidence]}</div>
        </div>
        {issue.confidence === "high" && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-slate-400 hover:text-slate-200"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        )}
      </div>

      {expanded && issue.confidence === "high" && (
        <div className="mt-4 space-y-3 border-t border-slate-700/50 pt-3">
          {issue.modelFindings.map((finding) => (
            <div key={finding.model} className="text-sm">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                {finding.model === "claude" ? "Claude says:" : "Gemini says:"}
              </p>
              <p className="text-slate-300">{finding.explanation}</p>
            </div>
          ))}
        </div>
      )}

      {issue.confidence !== "high" && (
        <div className="mt-2 text-sm text-slate-300">{issue.issue.explanation}</div>
      )}
    </div>
  );
}
