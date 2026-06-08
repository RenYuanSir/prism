import type {
  AIConsensusResult,
  AIFixSuggestion,
  AIReviewResult,
  AIRiskIssue,
  ImpactGraph,
  ModelFinding,
  RaceConditionIssue,
  ReviewScore,
  SemanticDiff,
  SimilarPR,
} from "@prism/shared";
import type { PipelineStage } from "@prism/shared";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileText,
  GitBranch,
  GitCommit,
  Lightbulb,
  Loader2,
  Send,
  Sparkles,
  User,
  XCircle,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  type ReviewResponse,
  fetchHistoryDetail,
  fetchImpact,
  postComment,
  streamReview,
} from "../api/client";
import { ConsensusView } from "../components/ConsensusView";
import { FileChangeCard } from "../components/FileChangeCard";
import { ImpactHeatmap } from "../components/ImpactHeatmap";
import { IncrementalDeltaBanner } from "../components/IncrementalDeltaBanner";
import { LiquidGlass } from "../components/LiquidGlass";
import { PipelineProgress } from "../components/PipelineProgress";
import { RaceConditionTimeline } from "../components/RaceConditionTimeline";
import { ReviewScoreCard } from "../components/ReviewScoreCard";
import { SeverityBadge } from "../components/SeverityBadge";
import { SimilarPRCard } from "../components/SimilarPRCard";
import { SuggestionCard } from "../components/SuggestionCard";
import { computeReviewScore } from "../utils/scoring";

interface PRInfo {
  id: number;
  title: string;
  description: string;
  author: string;
  branch: string;
  baseBranch: string;
}

interface PartialResults {
  summary?: string;
  claudeFindings?: ModelFinding[];
  geminiFindings?: ModelFinding[];
  consensus?: AIConsensusResult;
  suggestions?: AIFixSuggestion[];
  raceConditions?: RaceConditionIssue[];
  currentStage?: string;
  isComplete: boolean;
  deltaChangedFiles?: string[];
  deltaUnchangedFiles?: string[];
  deltaPreviousReviewId?: string;
  deltaPreservedIssues?: AIRiskIssue[];
  scoreData?: ReviewScore;
  similarPRs?: SimilarPR[];
}

type ReviewState =
  | { status: "loading"; partial: PartialResults }
  | {
      status: "success";
      data: ReviewResponse;
      impactGraph: ImpactGraph | null;
      score: ReviewScore | null;
      similarPRs: SimilarPR[] | null;
    }
  | { status: "error"; message: string; partial: PartialResults };

type PostState =
  | { status: "idle" }
  | { status: "posting" }
  | { status: "success"; htmlUrl: string }
  | { status: "error"; message: string };

export function ReviewResult() {
  const { t } = useTranslation();
  const { owner, repo, pullNumber } = useParams<{
    owner: string;
    repo: string;
    pullNumber: string;
  }>();
  const [searchParams] = useSearchParams();
  const historyId = searchParams.get("historyId");

  const [state, setState] = useState<ReviewState>({
    status: "loading",
    partial: { isComplete: false },
  });

  useEffect(() => {
    if (!owner || !repo || !pullNumber) return;
    const prNum = Number(pullNumber);
    if (!Number.isInteger(prNum) || prNum <= 0) {
      setState({
        status: "error",
        message: t("reviewResult.invalidPr"),
        partial: { isComplete: false },
      });
      return;
    }

    // Cached review mode — load from history, skip pipeline
    if (historyId) {
      async function loadCached() {
        try {
          const result = await fetchHistoryDetail(historyId!);
          if (result.success && result.data) {
            setState({
              status: "success",
              data: {
                pr: {
                  id: result.data.pr.id,
                  title: result.data.pr.title,
                  description: result.data.pr.description,
                  author: result.data.pr.author,
                  branch: result.data.pr.branch,
                  baseBranch: result.data.pr.baseBranch,
                },
                semanticDiff: result.data.semanticDiff,
                review: result.data.review,
              },
              impactGraph: null,
              score: null,
              similarPRs: null,
            });
          } else {
            setState({
              status: "error",
              message: result.error ?? t("reviewResult.notFound"),
              partial: { isComplete: false },
            });
          }
        } catch (err) {
          setState({
            status: "error",
            message: err instanceof Error ? err.message : t("reviewResult.loadFailed"),
            partial: { isComplete: false },
          });
        }
      }
      loadCached();
      return; // Skip streaming flow
    }

    const partial: PartialResults = { isComplete: false };

    let streamController: AbortController | null = null;

    streamReview(
      owner,
      repo,
      prNum,
      true,
      (event) => {
        switch (event.type) {
          case "stage:start":
            partial.currentStage = event.stage;
            setState({ status: "loading", partial: { ...partial } });
            break;
          case "summary":
            partial.summary = event.summary;
            setState({ status: "loading", partial: { ...partial } });
            break;
          case "risk:model-done":
            if (event.model === "claude") partial.claudeFindings = event.findings as ModelFinding[];
            else partial.geminiFindings = event.findings as ModelFinding[];
            setState({ status: "loading", partial: { ...partial } });
            break;
          case "consensus":
            partial.consensus = event.consensus as unknown as AIConsensusResult;
            setState({ status: "loading", partial: { ...partial } });
            break;
          case "suggestion":
            partial.suggestions = event.suggestions as AIFixSuggestion[];
            setState({ status: "loading", partial: { ...partial } });
            break;
          case "incremental:delta":
            if (event.delta) {
              partial.deltaChangedFiles = event.delta.changedFiles;
              partial.deltaUnchangedFiles = event.delta.unchangedFiles;
              partial.deltaPreviousReviewId = event.delta.previousReviewId;
              setState({ status: "loading", partial: { ...partial } });
            }
            break;
          case "incremental:preserved":
            partial.deltaPreservedIssues = (event.issues ?? []) as AIRiskIssue[];
            setState({ status: "loading", partial: { ...partial } });
            break;
          case "race-conditions":
            partial.raceConditions = event.raceConditions as RaceConditionIssue[];
            setState({ status: "loading", partial: { ...partial } });
            break;
          case "score":
            partial.scoreData = event.score as ReviewScore;
            setState({ status: "loading", partial: { ...partial } });
            break;
          case "similar-prs":
            if (event.similarPRs) {
              partial.similarPRs = event.similarPRs as SimilarPR[];
            }
            break;
        }
      },
      (error) => setState({ status: "error", message: error, partial: { ...partial } }),
      async () => {
        // Stream done — fetch impact and transition to success
        try {
          const [prResult, impactResult] = await Promise.all([
            fetch(`/api/pr/${owner}/${repo}/${prNum}`).then((r) => r.json()),
            fetchImpact(owner, repo, prNum),
          ]);
          if (prResult.success && prResult.data) {
            setState({
              status: "success",
              data: {
                pr: {
                  id: prResult.data.id,
                  title: prResult.data.title,
                  description: prResult.data.description,
                  author: prResult.data.author,
                  branch: prResult.data.branch,
                  baseBranch: prResult.data.baseBranch,
                },
                semanticDiff: prResult.data.semanticDiff || {
                  fileChanges: [],
                  summary: "",
                  totalFiles: 0,
                  totalAdditions: 0,
                  totalDeletions: 0,
                },
                review: {
                  summary: { summary: partial.summary ?? "", stage: "summary" },
                  risk: {
                    issues: (partial.consensus?.consensusIssues ?? []).map((i) => i.issue),
                    stage: "risk",
                  },
                  consensus: partial.consensus ?? {
                    consensusIssues: [],
                    claudeOnly: partial.claudeFindings ?? [],
                    geminiOnly: partial.geminiFindings ?? [],
                    allAgreeCount: 0,
                    claudeTotal: 0,
                    geminiTotal: 0,
                  },
                  raceConditions: partial.raceConditions ?? [],
                  suggestion: { suggestions: partial.suggestions ?? [], stage: "suggestion" },
                },
              },
              impactGraph: impactResult.success ? (impactResult.data?.impactGraph ?? null) : null,
              score: computeReviewScore(
                {
                  summary: { summary: partial.summary ?? "", stage: "summary" },
                  risk: {
                    issues: (partial.consensus?.consensusIssues ?? []).map((i) => i.issue),
                    stage: "risk",
                  },
                  consensus: partial.consensus ?? {
                    consensusIssues: [],
                    claudeOnly: partial.claudeFindings ?? [],
                    geminiOnly: partial.geminiFindings ?? [],
                    allAgreeCount: 0,
                    claudeTotal: 0,
                    geminiTotal: 0,
                  },
                  raceConditions: partial.raceConditions ?? [],
                  suggestion: { suggestions: partial.suggestions ?? [], stage: "suggestion" },
                },
                prResult.data.semanticDiff || {
                  fileChanges: [],
                  summary: "",
                  totalFiles: 0,
                  totalAdditions: 0,
                  totalDeletions: 0,
                },
              ),
              similarPRs: partial.similarPRs ?? null,
            });
          }
        } catch {
          /* PR info fetch is non-critical */
        }
      },
    ).then((c) => {
      streamController = c;
    });

    return () => {
      streamController?.abort();
    };
  }, [owner, repo, pullNumber, historyId, t]);

  if (!owner || !repo || !pullNumber) {
    return (
      <div className="p-8">
        <p className="text-linear-text-tertiary">{t("reviewResult.invalidUrl")}</p>
      </div>
    );
  }

  // Stable summary text that persists across loading → success transition.
  // Lifted outside AnimatePresence so it never unmounts/remounts,
  // preventing the visual "flash" that looks like the summary changed.
  const summaryText =
    state.status === "loading" || state.status === "error"
      ? state.partial.summary
      : state.status === "success"
        ? state.data.review.summary.summary
        : undefined;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <Link
          to={historyId ? "/history" : "/"}
          className="inline-flex items-center gap-2 text-[13px] text-linear-text-tertiary hover:text-linear-text-secondary transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          {historyId ? t("reviewResult.backToHistory") : t("reviewResult.backToList")}
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

      {/* AI Summary — rendered outside AnimatePresence so it stays visible */}
      {summaryText && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <SectionHeader
            icon={Sparkles}
            title={t("reviewResult.aiSummary")}
            accent="text-linear-accent"
          />
          <LiquidGlass className="rounded-xl p-6">
            <p className="text-[14px] text-linear-text-secondary leading-relaxed">{summaryText}</p>
          </LiquidGlass>
        </motion.section>
      )}

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
            {/* Incremental Delta Banner */}
            {state.partial.deltaChangedFiles && (
              <IncrementalDeltaBanner
                changedFiles={state.partial.deltaChangedFiles}
                unchangedFiles={state.partial.deltaUnchangedFiles ?? []}
                preservedIssues={state.partial.deltaPreservedIssues ?? []}
              />
            )}

            <LiquidGlass className="rounded-xl p-6">
              <h2 className="text-[15px] font-weight-510 text-linear-text-primary mb-4">
                {t("reviewResult.analyzing")}
              </h2>
              <PipelineProgress
                currentStage={
                  (state.partial.currentStage as PipelineStage | "idle" | "complete") ?? "summary"
                }
              />
            </LiquidGlass>

            {/* Risk analysis — per-model cards, show individually */}
            {(state.partial.claudeFindings || state.partial.geminiFindings) && (
              <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <SectionHeader
                  icon={AlertTriangle}
                  title={t("reviewResult.riskAnalysis")}
                  accent="text-linear-accent"
                />
                <div className="grid grid-cols-2 gap-4">
                  <RiskModelCard label="Model 1" findings={state.partial.claudeFindings} />
                  <RiskModelCard label="Model 2" findings={state.partial.geminiFindings} />
                </div>
              </motion.section>
            )}

            {/* Consensus — after both models done */}
            {state.partial.consensus && (
              <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <ConsensusView consensus={state.partial.consensus} />
              </motion.section>
            )}

            {/* Race Conditions */}
            {state.partial.raceConditions && state.partial.raceConditions.length > 0 && (
              <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <SectionHeader
                  icon={AlertTriangle}
                  title={t("reviewResult.raceConditions")}
                  count={state.partial.raceConditions.length}
                  accent="text-red-400"
                />
                <RaceConditionTimeline issues={state.partial.raceConditions} />
              </motion.section>
            )}

            {/* Suggestions */}
            {state.partial.suggestions && state.partial.suggestions.length > 0 && (
              <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <SectionHeader
                  icon={Lightbulb}
                  title={t("reviewResult.fixSuggestions")}
                  count={state.partial.suggestions.length}
                  accent="text-linear-accent"
                />
                <div className="space-y-3">
                  {state.partial.suggestions.map((s, i) => (
                    <SuggestionCard key={`${s.issue.file}-${s.issue.line}-${i}`} suggestion={s} />
                  ))}
                </div>
              </motion.section>
            )}

            {/* Spinner while still waiting for consensus */}
            {!state.partial.consensus && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 text-linear-accent animate-spin" />
              </div>
            )}
          </motion.div>
        )}

        {/* Error State */}
        {state.status === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <LiquidGlass className="rounded-xl p-6 border-red-500/20">
              <div className="flex items-start gap-3">
                <XCircle className="h-6 w-6 text-red-400 flex-shrink-0" />
                <div>
                  <h3 className="text-[15px] font-weight-510 text-red-400 mb-1">
                    {t("reviewResult.failed")}
                  </h3>
                  <p className="text-linear-text-secondary">{state.message}</p>
                  <Link
                    to="/"
                    className="inline-block mt-4 px-4 py-2 bg-linear-surface hover:bg-linear-elevated text-linear-text-primary rounded-md transition-colors text-[13px] font-weight-510 border border-linear-border"
                  >
                    {t("reviewResult.tryAnother")}
                  </Link>
                </div>
              </div>
            </LiquidGlass>
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
              owner={owner!}
              repo={repo!}
              pullNumber={pullNumber!}
              score={state.score}
              similarPRs={state.similarPRs}
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
  owner: string;
  repo: string;
  pullNumber: string;
  score: ReviewScore | null;
  similarPRs: SimilarPR[] | null;
}

function ReviewContent({
  pr,
  semanticDiff,
  review,
  impactGraph,
  owner,
  repo,
  pullNumber,
  score,
  similarPRs,
}: ReviewContentProps) {
  const { t } = useTranslation();
  const criticalCount = review.risk.issues.filter((i) => i.severity === "critical").length;
  const warningCount = review.risk.issues.filter((i) => i.severity === "warning").length;
  const infoCount = review.risk.issues.filter((i) => i.severity === "info").length;

  const [postState, setPostState] = useState<PostState>({ status: "idle" });

  const handlePostToGitHub = async () => {
    setPostState({ status: "posting" });
    try {
      const result = await postComment(
        owner,
        repo,
        Number(pullNumber),
        review.summary.summary,
        review.consensus as unknown as Record<string, unknown>,
        review.suggestion.suggestions as unknown[],
      );
      if (result.success && result.data) {
        setPostState({ status: "success", htmlUrl: result.data.htmlUrl });
      } else {
        setPostState({ status: "error", message: result.error ?? "Unknown error" });
      }
    } catch (err) {
      setPostState({
        status: "error",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  };

  return (
    <div className="flex gap-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ staggerChildren: 0.1 }}
        className="flex-1 space-y-6 min-w-0"
      >
        {/* PR Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <LiquidGlass className="rounded-xl p-6">
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
                <span>{t("reviewResult.filesChanged", { n: semanticDiff.totalFiles })}</span>
              </div>
            </div>
            {pr.description && (
              <p className="mt-4 text-[13px] text-linear-text-secondary leading-relaxed border-t border-linear-border-subtle pt-4">
                {pr.description}
              </p>
            )}
          </LiquidGlass>
        </motion.div>

        {/* Review Quality Score */}
        {score && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <ReviewScoreCard score={score} />
          </motion.div>
        )}

        {/* Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-4 gap-3"
        >
          <StatCard
            label={t("reviewResult.statFiles")}
            value={semanticDiff.totalFiles.toString()}
            icon={FileText}
            color="neutral"
          />
          <StatCard
            label={t("reviewResult.statAdditions")}
            value={`+${semanticDiff.totalAdditions}`}
            icon={CheckCircle2}
            color="success"
          />
          <StatCard
            label={t("reviewResult.statDeletions")}
            value={`-${semanticDiff.totalDeletions}`}
            icon={XCircle}
            color="danger"
          />
          <StatCard
            label={t("reviewResult.statIssues")}
            value={review.risk.issues.length.toString()}
            icon={AlertTriangle}
            color={criticalCount > 0 ? "danger" : warningCount > 0 ? "warning" : "success"}
            subtext={
              criticalCount > 0
                ? t("reviewResult.criticalCount", { n: criticalCount })
                : warningCount > 0
                  ? t("reviewResult.warningCount", { n: warningCount })
                  : t("reviewResult.infoCount", { n: infoCount })
            }
          />
        </motion.div>

        {/* Post to GitHub */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-end gap-3"
        >
          {postState.status === "success" ? (
            <a
              href={postState.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-green-500/10 border border-green-500/30 text-green-400 text-[13px] font-weight-510 hover:bg-green-500/20 transition-colors"
            >
              <CheckCircle2 className="h-4 w-4" />
              {t("reviewResult.postedToGitHub")}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : postState.status === "error" ? (
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-red-400">{postState.message}</span>
              <button
                type="button"
                onClick={handlePostToGitHub}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-linear-brand text-white text-[13px] font-weight-510 hover:bg-linear-accent transition-colors"
              >
                <Send className="h-4 w-4" />
                {t("reviewResult.retryPost")}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handlePostToGitHub}
              disabled={postState.status === "posting"}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-linear-brand text-white text-[13px] font-weight-510 hover:bg-linear-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {postState.status === "posting" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("reviewResult.posting")}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  {t("reviewResult.postToGitHub")}
                </>
              )}
            </button>
          )}
        </motion.div>

        {/* File Changes */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <SectionHeader
            icon={FileText}
            title={t("reviewResult.fileChanges")}
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
            <SectionHeader
              icon={Zap}
              title={t("reviewResult.crossFileImpact")}
              accent="text-linear-accent"
            />
            <LiquidGlass className="rounded-xl p-6">
              <ImpactHeatmap graph={impactGraph} />
            </LiquidGlass>
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
              title={t("reviewResult.raceConditions")}
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
              title={t("reviewResult.fixSuggestions")}
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

      {similarPRs && similarPRs.length > 0 && (
        <div className="w-72 flex-shrink-0 pt-2">
          <SimilarPRCard similarPRs={similarPRs} />
        </div>
      )}
    </div>
  );
}

function RiskModelCard({ label, findings }: { label: string; findings?: ModelFinding[] }) {
  const { t } = useTranslation();
  return (
    <LiquidGlass className="rounded-xl p-4">
      <h4 className="text-[13px] font-weight-510 text-linear-text-secondary mb-3">
        {findings ? t("reviewResult.modelIssues", { label, count: findings.length }) : label}
      </h4>
      {findings === undefined ? (
        <div className="flex items-center gap-2 text-linear-text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-[13px]">{t("reviewResult.modelAnalyzing")}</span>
        </div>
      ) : findings.length === 0 ? (
        <p className="text-[13px] text-linear-text-muted">{t("reviewResult.modelNoIssues")}</p>
      ) : (
        findings.slice(0, 5).map((f, i) => (
          <div key={`${f.file}-${f.line}-${i}`} className="mb-2 p-2 bg-linear-surface/30 rounded">
            <SeverityBadge severity={f.severity} />
            <p className="text-[13px] text-linear-text-secondary mt-1">{f.message}</p>
            <p className="text-[11px] text-linear-text-muted font-mono">
              {f.file}:{f.line}
            </p>
          </div>
        ))
      )}
    </LiquidGlass>
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
        {title}
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
    <LiquidGlass className={`rounded-xl p-4 ${bgStyles[color]}`}>
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
    </LiquidGlass>
  );
}
