import type { SimilarPR } from "@prism/shared";
import { motion } from "framer-motion";
import { ArrowRight, History } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

interface SimilarPRCardProps {
  similarPRs: SimilarPR[];
}

function similarityColor(sim: number): string {
  if (sim >= 0.8) return "bg-red-500";
  if (sim >= 0.5) return "bg-yellow-500";
  return "bg-gray-500";
}

function similarityTextColor(sim: number): string {
  if (sim >= 0.8) return "text-red-400";
  if (sim >= 0.5) return "text-yellow-400";
  return "text-linear-text-muted";
}

export function SimilarPRCard({ similarPRs }: SimilarPRCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (similarPRs.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.25 }}
      className="glass-surface rounded-xl p-5 border border-linear-border-subtle"
    >
      <div className="flex items-center gap-2 mb-4">
        <History className="h-4 w-4 text-yellow-400" />
        <h3 className="text-[13px] font-weight-510 text-linear-text-secondary">
          {t("similar.title")}
        </h3>
      </div>

      <div className="space-y-3">
        {similarPRs.map((pr, i) => (
          <motion.button
            key={pr.id}
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.08 }}
            onClick={() =>
              navigate(`/review/${pr.owner}/${pr.repo}/${pr.prNumber}?historyId=${pr.id}`)
            }
            className="w-full text-left p-3 rounded-lg bg-linear-surface/30 hover:bg-linear-elevated/50 border border-linear-border-subtle transition-colors group"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5 text-[12px] font-mono text-linear-text-tertiary">
                <span className="text-linear-accent">#{pr.prNumber}</span>
                <span className="text-linear-text-muted truncate max-w-[180px]">{pr.title}</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-linear-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-1.5 rounded-full bg-linear-surface overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.round(pr.similarity * 100)}%` }}
                  transition={{ delay: 0.5 + i * 0.08, duration: 0.6, ease: "easeOut" }}
                  className={`h-full rounded-full ${similarityColor(pr.similarity)}`}
                />
              </div>
              <span className={`text-[11px] font-medium ${similarityTextColor(pr.similarity)}`}>
                {Math.round(pr.similarity * 100)}%
              </span>
            </div>

            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[10px] text-linear-text-muted">
                {t("similar.matchedIssues", { n: pr.matchedRiskCount })}
              </span>
              <span className="text-[10px] text-linear-text-muted/60">
                {pr.createdAt.slice(0, 10)}
              </span>
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
