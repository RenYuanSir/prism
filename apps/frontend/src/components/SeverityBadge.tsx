import type { AIRiskSeverity } from "@prism/shared";

interface SeverityBadgeProps {
  severity: AIRiskSeverity;
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const styles: Record<AIRiskSeverity, string> = {
    critical: "bg-red-500/10 text-red-400 ring-red-500/20",
    warning: "bg-yellow-500/10 text-yellow-400 ring-yellow-500/20",
    info: "bg-linear-accent/10 text-linear-accent ring-linear-accent/20",
  };

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${styles[severity]}`}
    >
      {severity}
    </span>
  );
}
