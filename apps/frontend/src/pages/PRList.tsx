import { parseGitHubPrUrl } from "@prism/shared";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  GitBranch,
  GitPullRequest,
  Shield,
  Sparkles,
  XCircle,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchHistory } from "../api/client";

interface HistoryEntry {
  id: string;
  owner: string;
  repo: string;
  prNumber: number;
  title: string;
  createdAt: string;
  riskCount: number;
  criticalCount: number;
  summarySnippet: string;
}

type RecentState =
  | { status: "loading" }
  | { status: "empty" }
  | { status: "loaded"; entries: HistoryEntry[] };

const features = [
  {
    icon: Zap,
    label: "Semantic Diff",
    desc: "AST-level change tracking",
    color: "rgb(var(--c-prism-purple))",
  },
  {
    icon: Shield,
    label: "Risk Detection",
    desc: "AI-powered vulnerability scan",
    color: "rgb(var(--c-prism-orange))",
  },
  {
    icon: GitBranch,
    label: "Impact Analysis",
    desc: "Dependency blast radius",
    color: "rgb(var(--c-prism-blue))",
  },
];

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

export function PRList() {
  const navigate = useNavigate();
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [pullNumber, setPullNumber] = useState("");
  const [isHovered, setIsHovered] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [urlParseStatus, setUrlParseStatus] = useState<"idle" | "success" | "error">("idle");
  const [recent, setRecent] = useState<RecentState>({ status: "loading" });

  useEffect(() => {
    async function loadRecent() {
      try {
        const result = await fetchHistory();
        if (result.success && result.data && result.data.length > 0) {
          setRecent({ status: "loaded", entries: result.data.slice(0, 5) });
        } else {
          setRecent({ status: "empty" });
        }
      } catch {
        setRecent({ status: "empty" });
      }
    }
    loadRecent();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (owner && repo && pullNumber) {
      navigate(`/review/${owner}/${repo}/${pullNumber}`);
    }
  };

  const handleUrlChange = (value: string) => {
    setUrlInput(value);
    if (!value.trim()) {
      setUrlParseStatus("idle");
      return;
    }
    const parsed = parseGitHubPrUrl(value);
    if (parsed) {
      setOwner(parsed.owner);
      setRepo(parsed.repo);
      setPullNumber(String(parsed.pullNumber));
      setUrlParseStatus("success");
    } else {
      setUrlParseStatus("error");
    }
  };

  const handleManualFieldChange = (setter: (value: string) => void, value: string) => {
    setter(value);
    setUrlParseStatus("idle");
  };

  const isValid = owner.trim() && repo.trim() && pullNumber.trim();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex items-center justify-center px-8 py-16">
        <div className="w-full max-w-xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-surface border border-linear-border text-[11px] font-weight-510 text-linear-text-tertiary mb-6">
              <Sparkles className="h-3 w-3 text-linear-accent" />
              AI-POWERED CODE REVIEW
            </div>
            <h1 className="text-[48px] font-weight-510 tracking-display leading-none text-linear-text-primary mb-4">
              Review Code <span className="text-gradient-brand">Intelligently</span>
            </h1>
            <p className="text-[15px] text-linear-text-tertiary leading-relaxed max-w-md mx-auto">
              Enter a GitHub pull request to get an AI-powered analysis with semantic diff, risk
              detection, and impact heatmaps.
            </p>
          </motion.div>

          {/* Form */}
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div className="glass-surface rounded-xl p-5 space-y-4">
              {/* URL Auto-Parse Input */}
              <div>
                <label
                  htmlFor="pr-url"
                  className="block text-[11px] font-weight-510 text-linear-text-muted tracking-wide uppercase mb-1.5"
                >
                  GitHub PR URL
                </label>
                <div className="relative">
                  <input
                    id="pr-url"
                    type="text"
                    value={urlInput}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    placeholder="Paste a GitHub PR URL to auto-fill…"
                    className={`w-full px-3 py-2.5 bg-linear-black border rounded-md text-[13px] text-linear-text-primary placeholder-linear-text-muted/50 focus:outline-none transition-colors pr-9 ${
                      urlParseStatus === "success"
                        ? "border-green-500/50 focus:border-green-500"
                        : urlParseStatus === "error"
                          ? "border-red-500/50 focus:border-red-500"
                          : "border-linear-border focus:border-linear-accent/50"
                    }`}
                  />
                  {urlParseStatus === "success" && (
                    <CheckCircle2
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500"
                      aria-label="URL parsed successfully"
                    />
                  )}
                  {urlParseStatus === "error" && (
                    <XCircle
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500"
                      aria-label="Invalid GitHub PR URL"
                    />
                  )}
                </div>
                {urlParseStatus === "error" && (
                  <p className="text-[13px] text-red-500 mt-1">Invalid GitHub PR URL</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="owner"
                    className="block text-[11px] font-weight-510 text-linear-text-muted tracking-wide uppercase mb-1.5"
                  >
                    Owner
                  </label>
                  <input
                    id="owner"
                    type="text"
                    value={owner}
                    onChange={(e) => handleManualFieldChange(setOwner, e.target.value)}
                    placeholder="facebook"
                    className="w-full px-3 py-2.5 bg-linear-black border border-linear-border rounded-md text-[13px] text-linear-text-primary placeholder-linear-text-muted/50 focus:outline-none focus:border-linear-accent/50 transition-colors"
                  />
                </div>
                <div>
                  <label
                    htmlFor="repo"
                    className="block text-[11px] font-weight-510 text-linear-text-muted tracking-wide uppercase mb-1.5"
                  >
                    Repository
                  </label>
                  <input
                    id="repo"
                    type="text"
                    value={repo}
                    onChange={(e) => handleManualFieldChange(setRepo, e.target.value)}
                    placeholder="react"
                    className="w-full px-3 py-2.5 bg-linear-black border border-linear-border rounded-md text-[13px] text-linear-text-primary placeholder-linear-text-muted/50 focus:outline-none focus:border-linear-accent/50 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="pr"
                  className="block text-[11px] font-weight-510 text-linear-text-muted tracking-wide uppercase mb-1.5"
                >
                  Pull Request Number
                </label>
                <input
                  id="pr"
                  type="number"
                  value={pullNumber}
                  onChange={(e) => handleManualFieldChange(setPullNumber, e.target.value)}
                  placeholder="28735"
                  min="1"
                  className="w-full px-3 py-2.5 bg-linear-black border border-linear-border rounded-md text-[13px] text-linear-text-primary placeholder-linear-text-muted/50 focus:outline-none focus:border-linear-accent/50 transition-colors"
                />
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={!isValid}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              whileHover={{ scale: isValid ? 1.01 : 1 }}
              whileTap={{ scale: isValid ? 0.99 : 1 }}
              className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-md text-[13px] font-weight-510 transition-all duration-200 ${
                isValid
                  ? "bg-linear-brand text-white hover:bg-linear-accent glow-brand"
                  : "bg-linear-surface text-linear-text-muted cursor-not-allowed border border-linear-border-subtle"
              }`}
            >
              <Sparkles className="h-4 w-4" />
              Start Review
              <motion.span
                animate={{ x: isHovered && isValid ? 4 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ArrowRight className="h-4 w-4" />
              </motion.span>
            </motion.button>
          </motion.form>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-10 grid grid-cols-3 gap-3"
          >
            {features.map((feature, i) => (
              <motion.div
                key={feature.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 + i * 0.1 }}
                className="glass-surface rounded-lg p-4 text-center glass-surface-hover transition-all cursor-default"
              >
                <feature.icon className="h-5 w-5 mx-auto mb-2" style={{ color: feature.color }} />
                <div className="text-[12px] font-weight-510 text-linear-text-secondary">
                  {feature.label}
                </div>
                <div className="text-[11px] text-linear-text-muted mt-0.5">{feature.desc}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Recent Reviews Section */}
      <div className="px-8 pb-8">
        <div className="max-w-xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <GitPullRequest className="h-4 w-4 text-linear-text-muted" />
              <h2 className="text-[13px] font-weight-510 text-linear-text-secondary tracking-wide">
                RECENT REVIEWS
              </h2>
            </div>
            {recent.status === "loaded" && (
              <Link
                to="/history"
                className="flex items-center gap-1 text-[11px] text-linear-text-muted hover:text-linear-text-secondary transition-colors"
              >
                View all
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            )}
          </div>

          {/* Loading skeletons */}
          {recent.status === "loading" && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-surface rounded-xl p-4 animate-pulse"
                >
                  <div className="h-3 bg-linear-surface/50 rounded w-36 mb-2" />
                  <div className="h-4 bg-linear-surface/50 rounded w-full mb-1.5" />
                  <div className="h-3 bg-linear-surface/50 rounded w-20" />
                </motion.div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {recent.status === "empty" && (
            <div className="glass-surface rounded-xl p-12 text-center">
              <GitPullRequest className="h-10 w-10 text-linear-text-muted/30 mx-auto mb-3" />
              <p className="text-[13px] text-linear-text-muted">
                No reviews yet. Start by reviewing a PR above.
              </p>
            </div>
          )}

          {/* Loaded: review cards (max 5) */}
          {recent.status === "loaded" && (
            <div className="space-y-2">
              {recent.entries.map((entry, i) => (
                <motion.button
                  key={entry.id}
                  type="button"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() =>
                    navigate(
                      `/review/${entry.owner}/${entry.repo}/${entry.prNumber}?historyId=${entry.id}`,
                    )
                  }
                  className="w-full text-left glass-surface hover:bg-linear-elevated/50 border border-linear-border-subtle rounded-xl p-4 transition-all group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 text-[12px] text-linear-text-secondary font-mono">
                      <span className="text-linear-accent">{entry.owner}</span>
                      <span className="text-linear-border">/</span>
                      <span>{entry.repo}</span>
                      <span className="text-linear-border">#</span>
                      <span className="text-linear-accent">{entry.prNumber}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-linear-text-muted/70">
                      {entry.criticalCount > 0 && (
                        <span className="flex items-center gap-1 text-red-400">
                          <AlertTriangle className="h-3 w-3" />
                          {entry.criticalCount}
                        </span>
                      )}
                      {entry.riskCount - entry.criticalCount > 0 && (
                        <span className="text-yellow-400">
                          {entry.riskCount - entry.criticalCount} issues
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(entry.createdAt)}
                      </span>
                    </div>
                  </div>
                  <h3 className="text-[13px] font-weight-510 text-linear-text-primary truncate">
                    {entry.title}
                  </h3>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
