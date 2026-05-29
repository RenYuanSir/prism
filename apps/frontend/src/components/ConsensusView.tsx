import type { AIConsensusResult } from "@ai-pr-review/shared";
import { ConsensusStats } from "./ConsensusStats";
import { ConsensusIssueCard } from "./ConsensusIssueCard";

interface ConsensusViewProps {
  consensus: AIConsensusResult;
}

export function ConsensusView({ consensus }: ConsensusViewProps) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-200 mb-4">Review Consensus</h2>
      <ConsensusStats consensus={consensus} />

      {consensus.consensusIssues.length > 0 && (
        <div className="space-y-3">
          {consensus.consensusIssues.map((issue, i) => (
            <ConsensusIssueCard key={`${issue.issue.file}-${issue.issue.line}-${i}`} issue={issue} />
          ))}
        </div>
      )}

      {consensus.claudeOnly.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">
            Claude Only ({consensus.claudeOnly.length})
          </h3>
          {consensus.claudeOnly.map((finding, i) => (
            <ConsensusIssueCard
              key={`claude-${i}`}
              issue={{
                issue: {
                  severity: finding.severity,
                  message: finding.message,
                  file: finding.file,
                  line: finding.line,
                  explanation: finding.explanation,
                },
                confidence: finding.severity === "info" ? "low" : "medium",
                models: ["claude"],
                modelFindings: [finding],
              }}
            />
          ))}
        </div>
      )}

      {consensus.geminiOnly.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">
            Gemini Only ({consensus.geminiOnly.length})
          </h3>
          {consensus.geminiOnly.map((finding, i) => (
            <ConsensusIssueCard
              key={`gemini-${i}`}
              issue={{
                issue: {
                  severity: finding.severity,
                  message: finding.message,
                  file: finding.file,
                  line: finding.line,
                  explanation: finding.explanation,
                },
                confidence: finding.severity === "info" ? "low" : "medium",
                models: ["gemini"],
                modelFindings: [finding],
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
