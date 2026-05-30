import { ArrowRight, GitPullRequest, Sparkles } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export function PRList() {
  const navigate = useNavigate();
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [pullNumber, setPullNumber] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (owner && repo && pullNumber) {
      navigate(`/review/${owner}/${repo}/${pullNumber}`);
    }
  };

  const isValid = owner.trim() && repo.trim() && pullNumber.trim();

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-100 mb-2">Review a Pull Request</h1>
        <p className="text-slate-400">
          Enter the details of a GitHub pull request to get an AI-powered code review.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="owner" className="block text-sm font-medium text-slate-300 mb-2">
                Repository Owner
              </label>
              <input
                id="owner"
                type="text"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="facebook"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label htmlFor="repo" className="block text-sm font-medium text-slate-300 mb-2">
                Repository Name
              </label>
              <input
                id="repo"
                type="text"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                placeholder="react"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
          <div>
            <label htmlFor="pr" className="block text-sm font-medium text-slate-300 mb-2">
              Pull Request Number
            </label>
            <input
              id="pr"
              type="number"
              value={pullNumber}
              onChange={(e) => setPullNumber(e.target.value)}
              placeholder="123"
              min="1"
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={!isValid}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <Sparkles className="h-5 w-5" />
          Start Review
          <ArrowRight className="h-5 w-5" />
        </button>
      </form>

      <div className="mt-12">
        <h2 className="text-xl font-semibold text-slate-200 mb-4">Recent Reviews</h2>
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
          <GitPullRequest className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No reviews yet. Start by reviewing a PR above.</p>
        </div>
      </div>
    </div>
  );
}
