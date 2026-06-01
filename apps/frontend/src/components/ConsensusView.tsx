import type { AIConsensusResult } from "@prism/shared";
import { useTranslation } from "react-i18next";
import { ConsensusIssueCard } from "./ConsensusIssueCard";
import { ConsensusStats } from "./ConsensusStats";

interface ConsensusViewProps {
  consensus: AIConsensusResult;
}

export function ConsensusView({ consensus }: ConsensusViewProps) {
  const { t } = useTranslation();
  return (
    <div>
      <h2 className="text-lg font-semibold text-linear-text-secondary mb-4">
        {t("reviewResult.reviewConsensus")}
      </h2>
      <ConsensusStats consensus={consensus} />

      {consensus.consensusIssues.length > 0 && (
        <div className="space-y-3">
          {consensus.consensusIssues.map((issue, i) => (
            <ConsensusIssueCard
              key={`${issue.issue.file}-${issue.issue.line}-${i}`}
              issue={issue}
            />
          ))}
        </div>
      )}

      {consensus.claudeOnly.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-linear-text-tertiary uppercase tracking-wider mb-3">
            {t("consensus.claudeOnly")} ({consensus.claudeOnly.length})
          </h3>
          {consensus.claudeOnly.map((finding) => (
            <ConsensusIssueCard
              key={`claude-${finding.file}-${finding.line}`}
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
          <h3 className="text-sm font-medium text-linear-text-tertiary uppercase tracking-wider mb-3">
            {t("consensus.geminiOnly")} ({consensus.geminiOnly.length})
          </h3>
          {consensus.geminiOnly.map((finding) => (
            <ConsensusIssueCard
              key={`gemini-${finding.file}-${finding.line}`}
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
