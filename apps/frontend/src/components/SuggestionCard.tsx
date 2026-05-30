import type { AIFixSuggestion } from "@ai-pr-review/shared";
import { FileText, Lightbulb } from "lucide-react";
import { SeverityBadge } from "./SeverityBadge";

interface SuggestionCardProps {
  suggestion: AIFixSuggestion;
}

export function SuggestionCard({ suggestion }: SuggestionCardProps) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 transition-colors hover:border-slate-600">
      <div className="flex items-start gap-3 mb-3">
        <Lightbulb className="h-5 w-5 text-purple-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <SeverityBadge severity={suggestion.issue.severity} />
            <span className="text-sm font-medium text-slate-200">{suggestion.issue.message}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <FileText className="h-3 w-3" />
            <span className="font-mono">
              {suggestion.issue.file}:{suggestion.issue.line}
            </span>
          </div>
        </div>
      </div>

      <div className="ml-8 space-y-3">
        <div>
          <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
            Suggested Fix
          </h4>
          <pre className="bg-slate-900 border border-slate-700 rounded-md p-3 overflow-x-auto">
            <code className="text-xs text-slate-300 font-mono whitespace-pre">
              {suggestion.suggestedCode}
            </code>
          </pre>
        </div>
        <div>
          <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
            Explanation
          </h4>
          <p className="text-sm text-slate-300 leading-relaxed">{suggestion.explanation}</p>
        </div>
      </div>
    </div>
  );
}
