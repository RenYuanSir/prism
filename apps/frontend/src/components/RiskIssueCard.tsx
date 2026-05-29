import type { AIRiskIssue } from "@ai-pr-review/shared";
import { AlertTriangle, FileText, Info, XCircle } from "lucide-react";
import { SeverityBadge } from "./SeverityBadge";

interface RiskIssueCardProps {
  issue: AIRiskIssue;
}

export function RiskIssueCard({ issue }: RiskIssueCardProps) {
  const IconComponent = {
    critical: XCircle,
    warning: AlertTriangle,
    info: Info,
  }[issue.severity];

  const iconColor = {
    critical: "text-red-400",
    warning: "text-yellow-400",
    info: "text-linear-accent",
  }[issue.severity];

  return (
    <div className="bg-linear-surface/50 border border-linear-elevated rounded-lg p-4 transition-colors hover:border-linear-text-muted">
      <div className="flex items-start gap-3">
        <IconComponent className={`h-5 w-5 mt-0.5 flex-shrink-0 ${iconColor}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <SeverityBadge severity={issue.severity} />
            <span className="text-sm font-medium text-linear-text-secondary">{issue.message}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-linear-text-tertiary mb-2">
            <FileText className="h-3 w-3" />
            <span className="font-mono">
              {issue.file}:{issue.line}
            </span>
          </div>
          <p className="text-sm text-linear-text-secondary leading-relaxed">{issue.explanation}</p>
        </div>
      </div>
    </div>
  );
}
