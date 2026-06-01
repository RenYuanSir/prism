import { motion } from "framer-motion";
import { ArrowRight, Clock, GitPullRequest, History } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { fetchHistory } from "../api/client";
import { formatTime } from "../utils/time";

interface HistoryEntry {
  id: string;
  owner: string;
  repo: string;
  prNumber: number;
  title: string;
  createdAt: string;
  riskCount: number;
  criticalCount: number;
  summarySnippet: string;
}

type PageState =
  | { status: "loading" }
  | { status: "empty" }
  | { status: "list"; entries: HistoryEntry[] }
  | { status: "error"; message: string };

export function HistoryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [state, setState] = useState<PageState>({ status: "loading" });

  useEffect(() => {
    async function load() {
      try {
        const result = await fetchHistory();
        if (result.success && result.data) {
          const entries = result.data as HistoryEntry[];
          if (entries.length === 0) {
            setState({ status: "empty" });
          } else {
            setState({ status: "list", entries });
          }
        } else {
          setState({ status: "error", message: result.error ?? "Failed to load" });
        }
      } catch (err) {
        setState({
          status: "error",
          message: err instanceof Error ? err.message : "Network error",
        });
      }
    }
    load();
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-surface border border-linear-border text-[11px] font-weight-510 text-linear-text-tertiary mb-4">
          <History className="h-3 w-3" />
          {t("history.badge")}
        </div>
        <h1 className="text-[32px] font-weight-510 tracking-tight-custom text-linear-text-primary mb-2">
          {t("history.title")}
        </h1>
        <p className="text-[15px] text-linear-text-tertiary">{t("history.subtitle")}</p>
      </motion.div>

      {/* Loading State */}
      {state.status === "loading" && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-surface rounded-xl p-5 animate-pulse"
            >
              <div className="h-4 bg-linear-surface/50 rounded w-48 mb-3" />
              <div className="h-3 bg-linear-surface/50 rounded w-full mb-2" />
              <div className="h-3 bg-linear-surface/50 rounded w-24" />
            </motion.div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {state.status === "empty" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-surface rounded-xl p-12 text-center"
        >
          <div className="h-16 w-16 rounded-2xl bg-linear-surface flex items-center justify-center mx-auto mb-4 border border-linear-border-subtle">
            <GitPullRequest className="h-8 w-8 text-linear-text-muted/50" />
          </div>
          <h3 className="text-[15px] font-weight-510 text-linear-text-secondary mb-2">
            {t("history.emptyTitle")}
          </h3>
          <p className="text-[13px] text-linear-text-muted max-w-md mx-auto leading-relaxed">
            {t("history.emptyDesc")}
          </p>
          <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-linear-text-muted">
            <Clock className="h-3.5 w-3.5" />
            <span>{t("history.emptyHint")}</span>
          </div>
        </motion.div>
      )}

      {/* List State */}
      {state.status === "list" && (
        <div className="space-y-3">
          {state.entries.map((entry, i) => (
            <motion.button
              key={entry.id}
              type="button"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() =>
                navigate(
                  `/review/${entry.owner}/${entry.repo}/${entry.prNumber}?historyId=${entry.id}`,
                )
              }
              className="w-full text-left glass-surface hover:bg-linear-elevated/50 border border-linear-border-subtle rounded-xl p-5 transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-[13px] text-linear-text-secondary font-mono">
                  <span className="text-linear-accent">{entry.owner}</span>
                  <span className="text-linear-border">/</span>
                  <span>{entry.repo}</span>
                  <span className="text-linear-border">#</span>
                  <span className="text-linear-accent">{entry.prNumber}</span>
                </div>
                <div className="flex items-center gap-2">
                  {entry.criticalCount > 0 && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-red-500/10 text-red-400">
                      {t("reviewResult.criticalCount", { n: entry.criticalCount })}
                    </span>
                  )}
                  {entry.riskCount - entry.criticalCount > 0 && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-yellow-500/10 text-yellow-400">
                      {t("history.issuesCount", { n: entry.riskCount - entry.criticalCount })}
                    </span>
                  )}
                  <ArrowRight className="h-4 w-4 text-linear-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              <h3 className="text-[14px] font-weight-510 text-linear-text-primary mb-1.5">
                {entry.title}
              </h3>
              <p className="text-[13px] text-linear-text-muted leading-relaxed line-clamp-2 mb-2">
                {entry.summarySnippet}
              </p>
              <p className="text-[11px] text-linear-text-muted/70">
                {formatTime(entry.createdAt, t)}
              </p>
            </motion.button>
          ))}
        </div>
      )}

      {/* Error State */}
      {state.status === "error" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-surface rounded-xl p-8 text-center border-red-500/20"
        >
          <p className="text-linear-text-secondary mb-4">{state.message}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-linear-surface hover:bg-linear-elevated text-linear-text-primary rounded-md transition-colors text-[13px] font-weight-510 border border-linear-border"
          >
            {t("history.retry")}
          </button>
        </motion.div>
      )}
    </div>
  );
}
