import type { AIConsensusResult } from "@ai-pr-review/shared";

interface ConsensusStatsProps {
  consensus: AIConsensusResult;
}

export function ConsensusStats({ consensus }: ConsensusStatsProps) {
  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 text-center">
        <p className="text-xs text-purple-400 uppercase tracking-wider mb-1">Claude</p>
        <p className="text-2xl font-bold text-purple-300">{consensus.claudeTotal}</p>
        <p className="text-xs text-slate-500">issues found</p>
      </div>
      <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
        <p className="text-xs text-green-400 uppercase tracking-wider mb-1">Consensus</p>
        <p className="text-2xl font-bold text-green-300">{consensus.allAgreeCount}</p>
        <p className="text-xs text-slate-500">both agree</p>
      </div>
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center">
        <p className="text-xs text-blue-400 uppercase tracking-wider mb-1">Gemini</p>
        <p className="text-2xl font-bold text-blue-300">{consensus.geminiTotal}</p>
        <p className="text-xs text-slate-500">issues found</p>
      </div>
    </div>
  );
}
