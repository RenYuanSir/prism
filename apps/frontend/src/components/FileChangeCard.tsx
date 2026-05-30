import type { ChangeType, FileChange } from "@prism/shared";
import { Box, FileCode, GitBranch, Package } from "lucide-react";
import { useState } from "react";

interface FileChangeCardProps {
  fileChange: FileChange;
}

function ChangeTypeBadge({ type }: { type: ChangeType }) {
  const styles: Record<ChangeType, string> = {
    added: "bg-linear-success/10 text-linear-success ring-linear-success/20",
    modified: "bg-yellow-500/10 text-yellow-400 ring-yellow-500/20",
    removed: "bg-red-500/10 text-red-400 ring-red-500/20",
  };

  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ${styles[type]}`}
    >
      {type}
    </span>
  );
}

function FileStatusBadge({ status }: { status: FileChange["status"] }) {
  const styles: Record<string, string> = {
    added: "bg-linear-success/10 text-linear-success",
    modified: "bg-yellow-500/10 text-yellow-400",
    removed: "bg-red-500/10 text-red-400",
    renamed: "bg-linear-brand/10 text-linear-accent",
  };

  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}

export function FileChangeCard({ fileChange }: FileChangeCardProps) {
  const [expanded, setExpanded] = useState(false);

  const hasDetails =
    fileChange.functionChanges.length > 0 ||
    fileChange.importChanges.length > 0 ||
    fileChange.exportChanges.length > 0;

  return (
    <div className="bg-linear-surface/50 border border-linear-elevated rounded-lg overflow-hidden transition-colors hover:border-linear-text-muted">
      <button
        type="button"
        onClick={() => hasDetails && setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <FileCode className="h-4 w-4 text-linear-text-tertiary flex-shrink-0" />
          <span className="font-mono text-sm text-linear-text-secondary truncate">
            {fileChange.filename}
          </span>
          <FileStatusBadge status={fileChange.status} />
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 ml-4">
          <span className="text-xs text-linear-success">+{fileChange.additions}</span>
          <span className="text-xs text-red-400">-{fileChange.deletions}</span>
          {hasDetails && (
            <span className="text-xs text-linear-text-muted">{expanded ? "▲" : "▼"}</span>
          )}
        </div>
      </button>

      {expanded && hasDetails && (
        <div className="px-4 pb-4 space-y-3 border-t border-linear-elevated/50 pt-3">
          <p className="text-xs text-linear-text-tertiary">{fileChange.summary}</p>

          {fileChange.functionChanges.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <GitBranch className="h-3 w-3 text-linear-text-muted" />
                <span className="text-xs font-medium text-linear-text-tertiary uppercase tracking-wider">
                  Functions
                </span>
              </div>
              <div className="space-y-1 ml-5">
                {fileChange.functionChanges.map((fn) => (
                  <div key={fn.name} className="flex items-center gap-2 text-xs">
                    <ChangeTypeBadge type={fn.changeType} />
                    <span className="font-mono text-linear-text-secondary">{fn.name}</span>
                    {fn.newSignature && (
                      <span className="text-linear-text-muted truncate">{fn.newSignature}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {fileChange.importChanges.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-3 w-3 text-linear-text-muted" />
                <span className="text-xs font-medium text-linear-text-tertiary uppercase tracking-wider">
                  Imports
                </span>
              </div>
              <div className="space-y-1 ml-5">
                {fileChange.importChanges.map((imp) => (
                  <div key={imp.module} className="flex items-center gap-2 text-xs">
                    <ChangeTypeBadge type={imp.changeType} />
                    <span className="font-mono text-linear-text-secondary">{imp.module}</span>
                    <span className="text-linear-text-muted">({imp.imports.join(", ")})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {fileChange.exportChanges.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Box className="h-3 w-3 text-linear-text-muted" />
                <span className="text-xs font-medium text-linear-text-tertiary uppercase tracking-wider">
                  Exports
                </span>
              </div>
              <div className="space-y-1 ml-5">
                {fileChange.exportChanges.map((exp) => (
                  <div key={exp.name} className="flex items-center gap-2 text-xs">
                    <ChangeTypeBadge type={exp.changeType} />
                    <span className="font-mono text-linear-text-secondary">{exp.name}</span>
                    {exp.isDefault && <span className="text-linear-text-muted">(default)</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
