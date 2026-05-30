import type { AIConsensusResult } from "@prism/shared";

interface ConsensusStatsProps {
  consensus: AIConsensusResult;
}

export function ConsensusStats({ consensus }: ConsensusStatsProps) {
  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <div className="bg-linear-brand/10 border border-linear-brand/20 rounded-xl p-4 text-center">
        <p className="text-xs text-linear-accent uppercase tracking-wider mb-1">Claude</p>
        <p className="text-2xl font-bold text-linear-accent">{consensus.claudeTotal}</p>
        <p className="text-xs text-linear-text-muted">issues found</p>
      </div>
      <div className="bg-linear-success/10 border border-linear-success/20 rounded-xl p-4 text-center">
        <p className="text-xs text-linear-success uppercase tracking-wider mb-1">Consensus</p>
        <p className="text-2xl font-bold text-linear-success">{consensus.allAgreeCount}</p>
        <p className="text-xs text-linear-text-muted">both agree</p>
      </div>
      <div className="bg-linear-accent/10 border border-linear-accent/20 rounded-xl p-4 text-center">
        <p className="text-xs text-linear-accent uppercase tracking-wider mb-1">Gemini</p>
        <p className="text-2xl font-bold text-linear-accent-hover">{consensus.geminiTotal}</p>
        <p className="text-xs text-linear-text-muted">issues found</p>
      </div>
    </div>
  );
}
