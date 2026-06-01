import type { AIFixSuggestion } from "@prism/shared";
import { FileText, Lightbulb } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SeverityBadge } from "./SeverityBadge";

interface SuggestionCardProps {
  suggestion: AIFixSuggestion;
}

export function SuggestionCard({ suggestion }: SuggestionCardProps) {
  const { t } = useTranslation();
  return (
    <div className="bg-linear-surface/50 border border-linear-elevated rounded-lg p-4 transition-colors hover:border-linear-text-muted">
      <div className="flex items-start gap-3 mb-3">
        <Lightbulb className="h-5 w-5 text-linear-accent mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <SeverityBadge severity={suggestion.issue.severity} />
            <span className="text-sm font-medium text-linear-text-secondary">
              {suggestion.issue.message}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-linear-text-tertiary">
            <FileText className="h-3 w-3" />
            <span className="font-mono">
              {suggestion.issue.file}:{suggestion.issue.line}
            </span>
          </div>
        </div>
      </div>

      <div className="ml-8 space-y-3">
        <div>
          <h4 className="text-xs font-medium text-linear-text-tertiary uppercase tracking-wider mb-2">
            {t("suggestion.suggestedFix")}
          </h4>
          <pre className="bg-linear-panel border border-linear-elevated rounded-md p-3 overflow-x-auto">
            <code className="text-xs text-linear-text-secondary font-mono whitespace-pre">
              {suggestion.suggestedCode}
            </code>
          </pre>
        </div>
        <div>
          <h4 className="text-xs font-medium text-linear-text-tertiary uppercase tracking-wider mb-1">
            {t("suggestion.explanation")}
          </h4>
          <p className="text-sm text-linear-text-secondary leading-relaxed">
            {suggestion.explanation}
          </p>
        </div>
      </div>
    </div>
  );
}
