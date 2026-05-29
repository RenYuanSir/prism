import type { AIReviewResult, ImpactGraph, SemanticDiff } from "@ai-pr-review/shared";
import type { PipelineStage } from "@ai-pr-review/shared";
import {
  ArrowLeft,
  FileText,
  GitBranch,
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
import { RaceConditionTimeline } from "../components/RaceConditionTimeline";
import { PipelineProgress } from "../components/PipelineProgress";
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

      // Simulate pipeline progress
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
        <p className="text-slate-400">Invalid URL parameters</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to PR List
        </Link>
        <div className="flex items-center gap-2 text-sm text-slate-500 font-mono">
          <span>{owner}</span>
          <span>/</span>
          <span>{repo}</span>
          <span>#</span>
          <span>{pullNumber}</span>
        </div>
      </div>

      {/* Loading State */}
      {state.status === "loading" && (
        <div className="space-y-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-slate-200 mb-4">Analyzing Pull Request...</h2>
            <PipelineProgress currentStage={state.stage} />
          </div>

          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
          </div>
        </div>
      )}

      {/* Error State */}
      {state.status === "error" && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <XCircle className="h-6 w-6 text-red-400 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-red-400 mb-1">Review Failed</h3>
              <p className="text-slate-300">{state.message}</p>
              <Link
                to="/"
                className="inline-block mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
              >
                Try Another PR
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Success State */}
      {state.status === "success" && (
        <ReviewContent
          pr={state.data.pr}
          semanticDiff={state.data.semanticDiff}
          review={state.data.review}
          impactGraph={state.impactGraph}
        />
      )}
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

  return (
    <div className="space-y-6">
      {/* PR Header */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
        <h1 className="text-2xl font-bold text-slate-100 mb-3">{pr.title}</h1>
        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>{pr.author}</span>
          </div>
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            <span className="font-mono">
              {pr.branch} → {pr.baseBranch}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>{semanticDiff.totalFiles} files changed</span>
          </div>
        </div>
        {pr.description && (
          <p className="mt-4 text-sm text-slate-300 leading-relaxed border-t border-slate-800 pt-4">
            {pr.description}
          </p>
        )}
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Files Changed" value={semanticDiff.totalFiles.toString()} color="blue" />
        <StatCard label="Additions" value={`+${semanticDiff.totalAdditions}`} color="green" />
        <StatCard label="Deletions" value={`-${semanticDiff.totalDeletions}`} color="red" />
        <StatCard
          label="Issues Found"
          value={review.risk.issues.length.toString()}
          color={criticalCount > 0 ? "red" : warningCount > 0 ? "yellow" : "green"}
        />
      </div>

      {/* AI Summary */}
      <section>
        <h2 className="text-lg font-semibold text-slate-200 mb-3 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-400" />
          AI Summary
        </h2>
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <p className="text-slate-300 leading-relaxed">{review.summary.summary}</p>
        </div>
      </section>

      {/* Semantic Diff */}
      <section>
        <h2 className="text-lg font-semibold text-slate-200 mb-3 flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-400" />
          File Changes
          <span className="text-sm font-normal text-slate-500">
            ({semanticDiff.fileChanges.length})
          </span>
        </h2>
        <div className="space-y-2">
          {semanticDiff.fileChanges.map((fc) => (
            <FileChangeCard key={fc.filename} fileChange={fc} />
          ))}
        </div>
      </section>

      {/* Impact Heatmap */}
      {impactGraph && impactGraph.nodes.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-slate-200 mb-3 flex items-center gap-2">
            <Zap className="h-5 w-5 text-orange-400" />
            Cross-File Impact
          </h2>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <ImpactHeatmap graph={impactGraph} />
          </div>
        </section>
      )}

      {/* Race Conditions */}
      {review.raceConditions && review.raceConditions.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-slate-200 mb-3 flex items-center gap-2">
            <Zap className="h-5 w-5 text-orange-400" />
            Race Conditions Detected
            <span className="text-sm font-normal text-slate-500">
              ({review.raceConditions.length})
            </span>
          </h2>
          <RaceConditionTimeline issues={review.raceConditions} />
        </section>
      )}

      {/* Consensus View */}
      <section>
        <ConsensusView consensus={review.consensus} />
      </section>

      {/* Fix Suggestions */}
      {review.suggestion.suggestions.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-slate-200 mb-3 flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-purple-400" />
            Fix Suggestions
            <span className="text-sm font-normal text-slate-500">
              ({review.suggestion.suggestions.length})
            </span>
          </h2>
          <div className="space-y-3">
            {review.suggestion.suggestions.map((suggestion, i) => (
              <SuggestionCard
                key={`${suggestion.issue.file}-${suggestion.issue.line}-${i}`}
                suggestion={suggestion}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "blue" | "green" | "red" | "yellow";
}) {
  const colorStyles = {
    blue: "text-blue-400",
    green: "text-green-400",
    red: "text-red-400",
    yellow: "text-yellow-400",
  };

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colorStyles[color]}`}>{value}</p>
    </div>
  );
}
