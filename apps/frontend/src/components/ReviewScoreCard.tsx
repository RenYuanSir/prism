import type { ReviewScore } from "@prism/shared";
import { motion } from "framer-motion";
import { ArrowDown, ArrowRight, ArrowUp, BarChart3 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ReviewScoreCardProps {
  score: ReviewScore;
}

function scoreColor(v: number): string {
  if (v >= 70) return "text-linear-success";
  if (v >= 40) return "text-yellow-400";
  return "text-red-400";
}

function scoreBg(v: number): string {
  if (v >= 70) return "bg-linear-success";
  if (v >= 40) return "bg-yellow-500";
  return "bg-red-400";
}

function TrendIcon({ trend }: { trend: number | null }) {
  if (trend === null) return null;
  if (trend > 5) return <ArrowUp className="h-3.5 w-3.5 text-linear-success" />;
  if (trend < -5) return <ArrowDown className="h-3.5 w-3.5 text-yellow-400" />;
  return <ArrowRight className="h-3.5 w-3.5 text-linear-text-muted" />;
}

export function ReviewScoreCard({ score }: ReviewScoreCardProps) {
  const { t } = useTranslation();

  const dimensions = [
    { key: "coverage", label: t("scoring.coverage"), value: score.coverage },
    { key: "agreement", label: t("scoring.agreement"), value: score.agreement },
    { key: "confidence", label: t("scoring.confidence"), value: score.confidence },
    { key: "specificity", label: t("scoring.specificity"), value: score.specificity },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-surface rounded-xl p-5"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="h-4 w-4 text-linear-text-muted" />
        <h3 className="text-[13px] font-weight-510 text-linear-text-secondary tracking-wide">
          {t("scoring.title")}
        </h3>
      </div>

      {/* Total Score + Trend */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-baseline gap-2">
          <span className={`text-[36px] font-bold tracking-tight ${scoreColor(score.total)}`}>
            {score.total}
          </span>
          <span className="text-[13px] text-linear-text-muted">/ 100</span>
        </div>
        {score.trend !== null && (
          <div className="flex items-center gap-1">
            <TrendIcon trend={score.trend} />
            <span
              className={`text-[12px] font-medium ${
                score.trend > 5
                  ? "text-linear-success"
                  : score.trend < -5
                    ? "text-yellow-400"
                    : "text-linear-text-muted"
              }`}
            >
              {score.trend > 0 ? "+" : ""}
              {score.trend}%
            </span>
          </div>
        )}
      </div>

      {/* Dimension Bars */}
      <div className="space-y-2">
        {dimensions.map((dim) => (
          <div key={dim.key} className="flex items-center gap-2">
            <span className="text-[11px] text-linear-text-muted w-20 shrink-0">{dim.label}</span>
            <div className="flex-1 h-1.5 rounded-full bg-linear-surface overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${scoreBg(dim.value * 100)}`}
                initial={{ width: 0 }}
                animate={{ width: `${dim.value * 100}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
            <span className="text-[11px] text-linear-text-muted w-8 text-right">
              {Math.round(dim.value * 100)}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
