import type { RaceConditionIssue } from "@prism/shared";
import { Play, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { ConflictIndicator } from "./ConflictIndicator";
import { ExecutionPathColumn } from "./ExecutionPathColumn";
import { SeverityBadge } from "./SeverityBadge";

interface RaceConditionTimelineProps {
  issues: RaceConditionIssue[];
}

export function RaceConditionTimeline({ issues }: RaceConditionTimelineProps) {
  const [currentIssueIndex, setCurrentIssueIndex] = useState(0);
  const [animationStep, setAnimationStep] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);

  const issue = issues[currentIssueIndex];

  const maxSteps = issue ? Math.max(issue.patternA.steps.length, issue.patternB.steps.length) : 0;

  const hasConflict =
    !!issue &&
    animationStep >= 0 &&
    (issue.patternA.steps[animationStep]?.isConflictPoint ||
      issue.patternB.steps[animationStep]?.isConflictPoint);

  // All hooks must run unconditionally — before any early return.
  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      setAnimationStep((prev) => {
        if (prev >= maxSteps - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlaying, maxSteps]);

  if (!issue) return null;

  const handlePlay = () => {
    setAnimationStep(0);
    setIsPlaying(true);
  };

  const handleReplay = () => {
    setAnimationStep(-1);
    setIsPlaying(false);
  };

  return (
    <div className="space-y-6">
      {issues.length > 1 && (
        <div className="flex gap-2 mb-4">
          {issues.map((issue, i) => (
            <button
              key={`${issue.file}-${issue.line}-${issue.sharedState}`}
              type="button"
              onClick={() => {
                setCurrentIssueIndex(i);
                handleReplay();
              }}
              className={`px-3 py-1 text-xs rounded ${
                i === currentIssueIndex
                  ? "bg-linear-accent text-white"
                  : "bg-linear-elevated text-linear-text-secondary"
              }`}
            >
              Issue {i + 1}
            </button>
          ))}
        </div>
      )}

      <div className="bg-linear-panel/50 border border-linear-surface rounded-xl p-6">
        <div className="flex items-start gap-3 mb-4">
          <span className="text-2xl">⚡</span>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <SeverityBadge severity={issue.severity} />
              <span className="text-sm font-medium text-linear-text-secondary">
                {issue.message}
              </span>
            </div>
            <p className="text-xs text-linear-text-tertiary font-mono mb-1">
              {issue.file}:{issue.line}
            </p>
            {issue.confidence === "high" && (
              <p className="text-xs text-linear-success font-semibold">
                HIGH CONFIDENCE — Both models detected this
              </p>
            )}
          </div>
        </div>

        <p className="text-sm text-linear-text-secondary mb-2">
          <span className="font-semibold">Shared State:</span> {issue.sharedState}
        </p>
        <p className="text-sm text-linear-text-secondary mb-6">{issue.explanation}</p>

        <div className="grid grid-cols-2 gap-6">
          <ExecutionPathColumn
            path={issue.patternA}
            currentStep={animationStep}
            highlightConflict={hasConflict}
          />
          <ExecutionPathColumn
            path={issue.patternB}
            currentStep={animationStep}
            highlightConflict={hasConflict}
          />
        </div>

        <ConflictIndicator visible={hasConflict} conflictPoint={issue.conflictPoint} />

        <div className="flex items-center justify-center gap-4 mt-6">
          {animationStep === -1 && (
            <button
              type="button"
              onClick={handlePlay}
              className="flex items-center gap-2 px-4 py-2 bg-linear-brand hover:bg-linear-accent text-white rounded-lg transition-colors"
            >
              <Play className="h-4 w-4" />
              Play Animation
            </button>
          )}
          {animationStep >= 0 && !isPlaying && (
            <button
              type="button"
              onClick={handleReplay}
              className="flex items-center gap-2 px-4 py-2 bg-linear-elevated hover:bg-linear-text-muted text-white rounded-lg transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              Replay
            </button>
          )}
          {animationStep >= 0 && (
            <span className="text-sm text-linear-text-tertiary">
              Step {animationStep + 1} / {maxSteps}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
