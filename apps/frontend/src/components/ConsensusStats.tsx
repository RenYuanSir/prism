import type { AIConsensusResult } from "@prism/shared";
import { useTranslation } from "react-i18next";

interface ConsensusStatsProps {
  consensus: AIConsensusResult;
}

export function ConsensusStats({ consensus }: ConsensusStatsProps) {
  const { t } = useTranslation();
  const highCount = consensus.consensusIssues.filter((i) => i.confidence === "high").length;
  const mediumCount = consensus.consensusIssues.filter((i) => i.confidence === "medium").length;
  const lowCount = consensus.consensusIssues.filter((i) => i.confidence === "low").length;
  const total = consensus.consensusIssues.length;

  return (
    <div className="mb-6">
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-linear-brand/10 border border-linear-brand/20 rounded-xl p-4 text-center">
          <p className="text-xs text-linear-accent uppercase tracking-wider mb-1">
            {t("consensus.claude")}
          </p>
          <p className="text-2xl font-bold text-linear-accent">{consensus.claudeTotal}</p>
          <p className="text-xs text-linear-text-muted">{t("consensus.issuesFound")}</p>
        </div>
        <div className="bg-linear-success/10 border border-linear-success/20 rounded-xl p-4 text-center">
          <p className="text-xs text-linear-success uppercase tracking-wider mb-1">
            {t("consensus.consensus")}
          </p>
          <p className="text-2xl font-bold text-linear-success">{consensus.allAgreeCount}</p>
          <p className="text-xs text-linear-text-muted">{t("consensus.bothAgree")}</p>
        </div>
        <div className="bg-linear-accent/10 border border-linear-accent/20 rounded-xl p-4 text-center">
          <p className="text-xs text-linear-accent uppercase tracking-wider mb-1">
            {t("consensus.gemini")}
          </p>
          <p className="text-2xl font-bold text-linear-accent-hover">{consensus.geminiTotal}</p>
          <p className="text-xs text-linear-text-muted">{t("consensus.issuesFound")}</p>
        </div>
      </div>

      {total > 0 && (
        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-linear-text-muted shrink-0">Confidence:</span>
          <div className="flex-1 h-1.5 rounded-full bg-linear-surface overflow-hidden flex">
            {highCount > 0 && (
              <div
                className="h-full bg-linear-success transition-all"
                style={{ width: `${(highCount / total) * 100}%` }}
                title={`High: ${highCount}`}
              />
            )}
            {mediumCount > 0 && (
              <div
                className="h-full bg-yellow-500 transition-all"
                style={{ width: `${(mediumCount / total) * 100}%` }}
                title={`Medium: ${mediumCount}`}
              />
            )}
            {lowCount > 0 && (
              <div
                className="h-full bg-linear-text-muted/40 transition-all"
                style={{ width: `${(lowCount / total) * 100}%` }}
                title={`Low: ${lowCount}`}
              />
            )}
          </div>
          <span className="text-linear-success">{highCount}</span>
          <span className="text-yellow-500">{mediumCount}</span>
          <span className="text-linear-text-muted/60">{lowCount}</span>
        </div>
      )}
    </div>
  );
}
