import type { AIConsensusResult } from "@prism/shared";
import { useTranslation } from "react-i18next";

interface ConsensusStatsProps {
  consensus: AIConsensusResult;
}

export function ConsensusStats({ consensus }: ConsensusStatsProps) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
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
  );
}
