import type { ExecutionPath } from "@ai-pr-review/shared";

interface ExecutionPathColumnProps {
  path: ExecutionPath;
  currentStep: number;
  highlightConflict: boolean;
}

export function ExecutionPathColumn({
  path,
  currentStep,
  highlightConflict,
}: ExecutionPathColumnProps) {
  return (
    <div className="flex-1">
      <div className="bg-linear-surface/50 border border-linear-elevated rounded-lg p-4 mb-3">
        <h3 className="text-sm font-semibold text-linear-text-secondary mb-1">{path.label}</h3>
        <p className="text-xs text-linear-text-tertiary font-mono">{path.functionName}()</p>
      </div>

      <div className="space-y-2">
        {path.steps.map((step, index) => {
          const isActive = index <= currentStep;
          const isConflict = step.isConflictPoint && highlightConflict;

          return (
            <div
              key={`${step.line}-${index}`}
              className={`
                border rounded-lg p-3 transition-all
                ${isConflict ? "bg-red-500/20 border-red-500/50 animate-pulse" : ""}
                ${isActive && !isConflict ? "bg-linear-accent/10 border-linear-accent/30" : ""}
                ${!isActive ? "bg-linear-panel/30 border-linear-surface opacity-50" : ""}
              `}
            >
              <div className="flex items-start gap-2">
                <span className="text-xs font-bold text-linear-text-muted mt-0.5">
                  {index + 1}.
                </span>
                <div className="flex-1">
                  <p className="text-sm text-linear-text-secondary">{step.description}</p>
                  <p className="text-xs text-linear-text-muted font-mono mt-1">:{step.line}</p>
                </div>
                {isConflict && <span className="text-xs font-bold text-red-400">CONFLICT</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
