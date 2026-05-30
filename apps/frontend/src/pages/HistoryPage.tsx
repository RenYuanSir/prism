import { Clock, History } from "lucide-react";

export function HistoryPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-100 mb-2">Review History</h1>
        <p className="text-slate-400">View past PR reviews and their results.</p>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
        <History className="h-12 w-12 text-slate-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-300 mb-2">No History Yet</h3>
        <p className="text-slate-500 max-w-md mx-auto">
          Your review history will appear here once you start reviewing pull requests. Each review
          is cached for quick access.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-600">
          <Clock className="h-4 w-4" />
          <span>History tracking coming soon</span>
        </div>
      </div>
    </div>
  );
}
