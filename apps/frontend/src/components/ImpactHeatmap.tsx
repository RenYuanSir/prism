import type { ImpactGraph, ImpactNode } from "@ai-pr-review/shared";
import { AlertTriangle, ArrowRight, FileCode, Info, Layers, Zap } from "lucide-react";
import { useState } from "react";

interface ImpactHeatmapProps {
  graph: ImpactGraph;
}

const impactStyles: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  high: {
    bg: "bg-red-500/15",
    border: "border-red-500/30",
    text: "text-red-400",
    badge: "bg-red-500/20 text-red-300",
  },
  medium: {
    bg: "bg-yellow-500/15",
    border: "border-yellow-500/30",
    text: "text-yellow-400",
    badge: "bg-yellow-500/20 text-yellow-300",
  },
  low: {
    bg: "bg-slate-800/50",
    border: "border-slate-700",
    text: "text-slate-400",
    badge: "bg-slate-700 text-slate-300",
  },
};

function shortFilename(filename: string): string {
  const parts = filename.split("/");
  return parts[parts.length - 1] ?? filename;
}

function HeatmapTile({
  node,
  isSelected,
  onClick,
}: { node: ImpactNode; isSelected: boolean; onClick: () => void }) {
  const styles = impactStyles[node.impactLevel];
  const scorePercent = Math.round(node.impactScore * 100);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative p-3 rounded-lg border transition-all text-left ${styles.bg} ${styles.border} ${
        isSelected
          ? "ring-2 ring-blue-500 ring-offset-1 ring-offset-slate-900"
          : "hover:brightness-125"
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-mono text-slate-300 truncate" title={node.filename}>
          {shortFilename(node.filename)}
        </span>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${styles.badge}`}>
          {scorePercent}%
        </span>
      </div>
      <div className="w-full bg-slate-700/50 rounded-full h-1.5 mt-1">
        <div
          className={`h-1.5 rounded-full transition-all ${
            node.impactLevel === "high"
              ? "bg-red-500"
              : node.impactLevel === "medium"
                ? "bg-yellow-500"
                : "bg-slate-500"
          }`}
          style={{ width: `${scorePercent}%` }}
        />
      </div>
      {node.affectedFileCount > 0 && (
        <p className="text-[10px] text-slate-500 mt-1">
          {node.affectedFileCount} dependent{node.affectedFileCount !== 1 ? "s" : ""}
        </p>
      )}
    </button>
  );
}

function DetailPanel({ node, graph }: { node: ImpactNode; graph: ImpactGraph }) {
  const styles = impactStyles[node.impactLevel];
  const connectedEdges = graph.edges.filter(
    (e) => e.from === node.filename || e.to === node.filename,
  );

  return (
    <div className={`rounded-lg border p-4 ${styles.bg} ${styles.border}`}>
      <div className="flex items-center gap-2 mb-3">
        <FileCode className={`h-4 w-4 ${styles.text}`} />
        <span className="font-mono text-sm text-slate-200">{node.filename}</span>
        <span
          className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded ${styles.badge} uppercase`}
        >
          {node.impactLevel} impact
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-slate-900/50 rounded p-2 text-center">
          <p className="text-lg font-bold text-slate-200">{Math.round(node.impactScore * 100)}%</p>
          <p className="text-[10px] text-slate-500 uppercase">Score</p>
        </div>
        <div className="bg-slate-900/50 rounded p-2 text-center">
          <p className="text-lg font-bold text-slate-200">{node.directDependents.length}</p>
          <p className="text-[10px] text-slate-500 uppercase">Dependents</p>
        </div>
        <div className="bg-slate-900/50 rounded p-2 text-center">
          <p className="text-lg font-bold text-slate-200">{node.directDependencies.length}</p>
          <p className="text-[10px] text-slate-500 uppercase">Dependencies</p>
        </div>
      </div>

      {node.changedExports.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
            Changed Exports
          </p>
          <div className="flex flex-wrap gap-1">
            {node.changedExports.map((exp) => (
              <span
                key={exp}
                className="text-xs font-mono px-1.5 py-0.5 bg-purple-500/15 text-purple-300 rounded"
              >
                {exp}
              </span>
            ))}
          </div>
        </div>
      )}

      {node.directDependents.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
            Files That Depend On This
          </p>
          <div className="space-y-1">
            {node.directDependents.map((dep) => (
              <div key={dep} className="flex items-center gap-2 text-xs">
                <ArrowRight className="h-3 w-3 text-red-400" />
                <span className="font-mono text-slate-300">{dep}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {node.directDependencies.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
            Dependencies
          </p>
          <div className="space-y-1">
            {node.directDependencies.map((dep) => (
              <div key={dep} className="flex items-center gap-2 text-xs">
                <ArrowRight className="h-3 w-3 text-blue-400" />
                <span className="font-mono text-slate-300">{dep}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {connectedEdges.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
            Symbols
          </p>
          <div className="space-y-1">
            {connectedEdges.map((edge) => (
              <div key={`${edge.from}-${edge.to}`} className="text-xs text-slate-500">
                <span className="font-mono text-slate-400">
                  {edge.from === node.filename ? edge.to : edge.from}
                </span>
                : {edge.symbols.join(", ")}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ImpactHeatmap({ graph }: ImpactHeatmapProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const selectedNode = graph.nodes.find((n) => n.filename === selectedFile) ?? null;

  // Sort: high impact first, then by score descending
  const sortedNodes = [...graph.nodes].sort((a, b) => {
    const levelOrder = { high: 0, medium: 1, low: 2 };
    const diff = levelOrder[a.impactLevel] - levelOrder[b.impactLevel];
    if (diff !== 0) return diff;
    return b.impactScore - a.impactScore;
  });

  if (graph.nodes.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-red-400" />
          <span className="text-sm text-slate-300">
            <span className="font-bold text-red-400">{graph.highImpactCount}</span> high
          </span>
        </div>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-400" />
          <span className="text-sm text-slate-300">
            <span className="font-bold text-yellow-400">{graph.mediumImpactCount}</span> medium
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-slate-400" />
          <span className="text-sm text-slate-300">
            <span className="font-bold text-slate-400">{graph.lowImpactCount}</span> low
          </span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Layers className="h-4 w-4 text-slate-500" />
          <span className="text-xs text-slate-500">{graph.edges.length} dependencies</span>
        </div>
      </div>

      {/* Heatmap grid + detail panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {sortedNodes.map((node) => (
              <HeatmapTile
                key={node.filename}
                node={node}
                isSelected={selectedFile === node.filename}
                onClick={() =>
                  setSelectedFile(selectedFile === node.filename ? null : node.filename)
                }
              />
            ))}
          </div>
        </div>

        <div>
          {selectedNode ? (
            <DetailPanel node={selectedNode} graph={graph} />
          ) : (
            <div className="flex items-center justify-center h-full min-h-[200px] border border-dashed border-slate-700 rounded-lg">
              <p className="text-sm text-slate-500">Click a file tile to see impact details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
