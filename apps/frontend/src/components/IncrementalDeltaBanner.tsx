import type { AIRiskIssue } from "@prism/shared";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp, GitBranch, ShieldCheck } from "lucide-react";
import { useState } from "react";

interface Props {
  changedFiles: string[];
  unchangedFiles: string[];
  preservedIssues: AIRiskIssue[];
}

export function IncrementalDeltaBanner({ changedFiles, unchangedFiles, preservedIssues }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-surface rounded-xl p-4 mb-4 border border-linear-border-subtle"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-linear-surface flex items-center justify-center">
            <GitBranch className="h-4 w-4 text-linear-accent" />
          </div>
          <div>
            <p className="text-[13px] font-weight-510 text-linear-text-primary">
              {changedFiles.length} file{changedFiles.length !== 1 ? "s" : ""} changed
              {unchangedFiles.length > 0 && ", " + unchangedFiles.length + " unchanged"}
            </p>
            <p className="text-[11px] text-linear-text-muted">
              {preservedIssues.length} finding{preservedIssues.length !== 1 ? "s" : ""} preserved
              from previous review
            </p>
          </div>
        </div>
        {preservedIssues.length > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[11px] text-linear-text-muted hover:text-linear-text-secondary transition-colors"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            {expanded ? "Hide" : "Show"} preserved
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
        )}
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-linear-border-subtle space-y-2">
              {preservedIssues.map((issue, i) => (
                <div
                  key={issue.file + "-" + issue.line + "-" + i}
                  className="flex items-start gap-2 text-[12px]"
                >
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-linear-surface text-linear-text-muted shrink-0 mt-0.5">
                    Preserved
                  </span>
                  <span className="text-linear-text-secondary">
                    <span className="font-mono text-linear-text-muted">
                      {issue.file}:{issue.line}
                    </span>{" "}
                    {issue.message}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
