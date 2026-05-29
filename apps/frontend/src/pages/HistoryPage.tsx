import { motion } from "framer-motion";
import { Clock, GitPullRequest, History } from "lucide-react";

export function HistoryPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-surface border border-linear-border text-[11px] font-weight-510 text-linear-text-tertiary mb-4">
          <History className="h-3 w-3" />
          REVIEW LOG
        </div>
        <h1 className="text-[32px] font-weight-510 tracking-tight-custom text-linear-text-primary mb-2">
          Review History
        </h1>
        <p className="text-[15px] text-linear-text-tertiary">
          View past PR reviews and their results.
        </p>
      </motion.div>

      {/* Empty State */}
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
          No History Yet
        </h3>
        <p className="text-[13px] text-linear-text-muted max-w-md mx-auto leading-relaxed">
          Your review history will appear here once you start reviewing pull requests. Each review
          is cached for quick access.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-linear-text-muted">
          <Clock className="h-3.5 w-3.5" />
          <span>History tracking coming soon</span>
        </div>
      </motion.div>
    </div>
  );
}
