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
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-3">
        <h3 className="text-sm font-semibold text-slate-200 mb-1">{path.label}</h3>
        <p className="text-xs text-slate-400 font-mono">{path.functionName}()</p>
      </div>

      <div className="space-y-2">
        {path.steps.map((step, index) => {
          const isActive = index <= currentStep;
          const isConflict = step.isConflictPoint && highlightConflict;

          return (
            <div
              key={index}
              className={`
                border rounded-lg p-3 transition-all
                ${isConflict ? "bg-red-500/20 border-red-500/50 animate-pulse" : ""}
                ${isActive && !isConflict ? "bg-blue-500/10 border-blue-500/30" : ""}
                ${!isActive ? "bg-slate-900/30 border-slate-800 opacity-50" : ""}
              `}
            >
              <div className="flex items-start gap-2">
                <span className="text-xs font-bold text-slate-500 mt-0.5">
                  {index + 1}.
                </span>
                <div className="flex-1">
                  <p className="text-sm text-slate-200">{step.description}</p>
                  <p className="text-xs text-slate-500 font-mono mt-1">:{step.line}</p>
                </div>
                {isConflict && (
                  <span className="text-xs font-bold text-red-400">CONFLICT</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
