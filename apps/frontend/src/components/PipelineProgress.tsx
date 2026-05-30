import type { PipelineStage } from "@ai-pr-review/shared";
import { CheckCircle, Circle, Loader2 } from "lucide-react";

interface PipelineProgressProps {
  currentStage: PipelineStage | "idle" | "complete";
}

const stages: { key: PipelineStage; label: string }[] = [
  { key: "summary", label: "Summary" },
  { key: "risk", label: "Risk Analysis" },
  { key: "suggestion", label: "Suggestions" },
];

export function PipelineProgress({ currentStage }: PipelineProgressProps) {
  const getStageIndex = (stage: PipelineStage | "idle" | "complete"): number => {
    if (stage === "idle") return -1;
    if (stage === "complete") return stages.length;
    return stages.findIndex((s) => s.key === stage);
  };

  const currentIndex = getStageIndex(currentStage);

  return (
    <div className="flex items-center gap-4">
      {stages.map((stage, index) => {
        const isComplete = currentIndex > index;
        const isCurrent = currentIndex === index;
        const isPending = currentIndex < index;

        return (
          <div key={stage.key} className="flex items-center gap-2">
            {isComplete && <CheckCircle className="h-5 w-5 text-green-500" />}
            {isCurrent && <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />}
            {isPending && <Circle className="h-5 w-5 text-slate-600" />}
            <span
              className={`text-sm font-medium ${
                isComplete ? "text-green-400" : isCurrent ? "text-blue-400" : "text-slate-600"
              }`}
            >
              {stage.label}
            </span>
            {index < stages.length - 1 && (
              <div className={`w-12 h-0.5 ${isComplete ? "bg-green-500" : "bg-slate-700"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
