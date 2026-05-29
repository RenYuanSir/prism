import type { AIReviewResult, ImpactGraph, SemanticDiff } from "@ai-pr-review/shared";
import type { PipelineStage } from "@ai-pr-review/shared";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  GitBranch,
  GitCommit,
  Lightbulb,
  Loader2,
  Sparkles,
  User,
  XCircle,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { type ReviewResponse, fetchImpact, triggerReview } from "../api/client";
import { ConsensusView } from "../components/ConsensusView";
import { FileChangeCard } from "../components/FileChangeCard";
import { ImpactHeatmap } from "../components/ImpactHeatmap";
import { PipelineProgress } from "../components/PipelineProgress";
import { RaceConditionTimeline } from "../components/RaceConditionTimeline";
import { SuggestionCard } from "../components/SuggestionCard";

interface PRInfo {
  id: number;
  title: string;
  description: string;
  author: string;
  branch: string;
  baseBranch: string;
}

type ReviewState =
  | { status: "loading"; stage: PipelineStage | "idle" }
  | { status: "success"; data: ReviewResponse; impactGraph: ImpactGraph | null }
  | { status: "error"; message: string };

export function ReviewResult() {
  const { owner, repo, pullNumber } = useParams<{
    owner: string;
    repo: string;
    pullNumber: string;
  }>();
  const [state, setState] = useState<ReviewState>({ status: "loading", stage: "idle" });

  useEffect(() => {
    if (!owner || !repo || !pullNumber) return;

    const prNum = Number(pullNumber);
    if (!Number.isInteger(prNum) || prNum <= 0) {
      setState({ status: "error", message: "Invalid pull request number" });
      return;
    }

    async function runReview() {
      setState({ status: "loading", stage: "summary" });

      setTimeout(() => setState({ status: "loading", stage: "risk" }), 2000);
      setTimeout(() => setState({ status: "loading", stage: "suggestion" }), 4000);

      try {
        const [result, impactResult] = await Promise.all([
          triggerReview(owner!, repo!, prNum),
          fetchImpact(owner!, repo!, prNum),
        ]);
        if (result.success && result.data) {
          const impactGraph =
            impactResult.success && impactResult.data ? impactResult.data.impactGraph : null;
          setState({ status: "success", data: result.data, impactGraph });
        } else {
          setState({
            status: "error",
            message: result.error ?? "Failed to review PR",
          });
        }
      } catch (err) {
        setState({
          status: "error",
          message: err instanceof Error ? err.message : "Network error",
        });
      }
    }

    runReview();
  }, [owner, repo, pullNumber]);

  if (!owner || !repo || !pullNumber) {
    return (
      <div className="p-8">
        <p className="text-linear-text-tertiary">Invalid URL parameters</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-[13px] text-linear-text-tertiary hover:text-linear-text-secondary transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to PR List
        </Link>
        <div className="flex items-center gap-2 text-[13px] text-linear-text-muted font-mono">
          <GitCommit className="h-3.5 w-3.5" />
          <span>{owner}</span>
          <span className="text-linear-border">/</span>
          <span>{repo}</span>
          <span className="text-linear-border">#</span>
          <span className="text-linear-accent">{pullNumber}</span>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {/* Loading State */}
        {state.status === "loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="glass-surface rounded-xl p-6">
              <h2 className="text-[15px] font-weight-510 text-linear-text-primary mb-4">
                Analyzing Pull Request...
              </h2>
              <PipelineProgress currentStage={state.stage} />
            </div>

            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-linear-accent animate-spin" />
            </div>
          </motion.div>
        )}

        {/* Error State */}
        {state.status === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="glass-surface rounded-xl p-6 border-red-500/20"
          >
            <div className="flex items-start gap-3">
              <XCircle className="h-6 w-6 text-red-400 flex-shrink-0" />
              <div>
                <h3 className="text-[15px] font-weight-510 text-red-400 mb-1">Review Failed</h3>
                <p className="text-linear-text-secondary">{state.message}</p>
                <Link
                  to="/"
                  className="inline-block mt-4 px-4 py-2 bg-linear-surface hover:bg-linear-elevated text-linear-text-primary rounded-md transition-colors text-[13px] font-weight-510 border border-linear-border"
                >
                  Try Another PR
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        {/* Success State */}
        {state.status === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ReviewContent
              pr={state.data.pr}
              semanticDiff={state.data.semanticDiff}
              review={state.data.review}
              impactGraph={state.impactGraph}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface ReviewContentProps {
  pr: PRInfo;
  semanticDiff: SemanticDiff;
  review: AIReviewResult;
  impactGraph: ImpactGraph | null;
}

function ReviewContent({ pr, semanticDiff, review, impactGraph }: ReviewContentProps) {
  const criticalCount = review.risk.issues.filter((i) => i.severity === "critical").length;
  const warningCount = review.risk.issues.filter((i) => i.severity === "warning").length;
  const infoCount = review.risk.issues.filter((i) => i.severity === "info").length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ staggerChildren: 0.1 }}
      className="space-y-6"
    >
      {/* PR Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-surface rounded-xl p-6"
      >
        <h1 className="text-[24px] font-weight-510 tracking-tight-custom text-linear-text-primary mb-3">
          {pr.title}
        </h1>
        <div className="flex flex-wrap items-center gap-4 text-[13px] text-linear-text-tertiary">
          <div className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" />
            <span>{pr.author}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <GitBranch className="h-3.5 w-3.5" />
            <span className="font-mono text-[12px]">
              {pr.branch} → {pr.baseBranch}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            <span>{semanticDiff.totalFiles} files changed</span>
          </div>
        </div>
        {pr.description && (
          <p className="mt-4 text-[13px] text-linear-text-secondary leading-relaxed border-t border-linear-border-subtle pt-4">
            {pr.description}
          </p>
        )}
      </motion.div>

      {/* Stats Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-4 gap-3"
      >
        <StatCard
          label="Files Changed"
          value={semanticDiff.totalFiles.toString()}
          icon={FileText}
          color="neutral"
        />
        <StatCard
          label="Additions"
          value={`+${semanticDiff.totalAdditions}`}
          icon={CheckCircle2}
          color="success"
        />
        <StatCard
          label="Deletions"
          value={`-${semanticDiff.totalDeletions}`}
          icon={XCircle}
          color="danger"
        />
        <StatCard
          label="Issues Found"
          value={review.risk.issues.length.toString()}
          icon={AlertTriangle}
          color={criticalCount > 0 ? "danger" : warningCount > 0 ? "warning" : "success"}
          subtext={
            criticalCount > 0
              ? `${criticalCount} critical`
              : warningCount > 0
                ? `${warningCount} warnings`
                : `${infoCount} info`
          }
        />
      </motion.div>

      {/* AI Summary */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <SectionHeader icon={Sparkles} title="AI Summary" accent="text-linear-accent" />
        <div className="glass-surface rounded-xl p-6">
          <p className="text-[14px] text-linear-text-secondary leading-relaxed">
            {review.summary.summary}
          </p>
        </div>
      </motion.section>

      {/* File Changes */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <SectionHeader
          icon={FileText}
          title="File Changes"
          count={semanticDiff.fileChanges.length}
          accent="text-linear-accent"
        />
        <div className="space-y-2">
          {semanticDiff.fileChanges.map((fc, i) => (
            <motion.div
              key={fc.filename}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.05 }}
            >
              <FileChangeCard fileChange={fc} />
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Impact Heatmap */}
      {impactGraph && impactGraph.nodes.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <SectionHeader icon={Zap} title="Cross-File Impact" accent="text-linear-accent" />
          <div className="glass-surface rounded-xl p-6">
            <ImpactHeatmap graph={impactGraph} />
          </div>
        </motion.section>
      )}

      {/* Race Conditions */}
      {review.raceConditions && review.raceConditions.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <SectionHeader
            icon={AlertTriangle}
            title="Race Conditions Detected"
            count={review.raceConditions.length}
            accent="text-red-400"
          />
          <RaceConditionTimeline issues={review.raceConditions} />
        </motion.section>
      )}

      {/* Consensus View */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <ConsensusView consensus={review.consensus} />
      </motion.section>

      {/* Fix Suggestions */}
      {review.suggestion.suggestions.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <SectionHeader
            icon={Lightbulb}
            title="Fix Suggestions"
            count={review.suggestion.suggestions.length}
            accent="text-linear-accent"
          />
          <div className="space-y-3">
            {review.suggestion.suggestions.map((suggestion, i) => (
              <motion.div
                key={`${suggestion.issue.file}-${suggestion.issue.line}-${i}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + i * 0.05 }}
              >
                <SuggestionCard suggestion={suggestion} />
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}
    </motion.div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  count,
  accent = "text-linear-text-secondary",
}: {
  icon: React.ElementType;
  title: string;
  count?: number;
  accent?: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className={`h-4 w-4 ${accent}`} />
      <h2 className="text-[13px] font-weight-510 text-linear-text-secondary tracking-wide">
        {title.toUpperCase()}
      </h2>
      {count !== undefined && <span className="text-[11px] text-linear-text-muted">({count})</span>}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  subtext,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  color: "neutral" | "success" | "danger" | "warning";
  subtext?: string;
}) {
  const colorStyles = {
    neutral: "text-linear-text-primary",
    success: "text-linear-success",
    danger: "text-red-400",
    warning: "text-yellow-400",
  };

  const bgStyles = {
    neutral: "bg-linear-surface/50",
    success: "bg-linear-success/5",
    danger: "bg-red-500/5",
    warning: "bg-yellow-500/5",
  };

  return (
    <div className={`glass-surface rounded-xl p-4 ${bgStyles[color]}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3 w-3 text-linear-text-muted" />
        <p className="text-[11px] font-weight-510 text-linear-text-muted tracking-wide uppercase">
          {label}
        </p>
      </div>
      <p className={`text-[24px] font-weight-510 tracking-tight-custom ${colorStyles[color]}`}>
        {value}
      </p>
      {subtext && <p className="text-[11px] text-linear-text-muted mt-0.5">{subtext}</p>}
    </div>
  );
}
