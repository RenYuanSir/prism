import { motion } from "framer-motion";
import { AlertCircle, Check, Eye, EyeOff, Loader2, Save, Settings, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { type LLMSettings, fetchSettings, saveSettings } from "../api/client";

const PROVIDER_PRESETS: Record<
  string,
  { label: string; provider: string; baseUrl: string; defaultModel: string }
> = {
  anthropic: {
    label: "Anthropic",
    provider: "anthropic",
    baseUrl: "https://api.anthropic.com",
    defaultModel: "claude-sonnet-4-6",
  },
  google: {
    label: "Google Gemini",
    provider: "google",
    baseUrl: "",
    defaultModel: "gemini-2.0-flash",
  },
  openai: {
    label: "OpenAI",
    provider: "openai-compatible",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o",
  },
  deepseek: {
    label: "DeepSeek",
    provider: "openai-compatible",
    baseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
  },
  bailian: {
    label: "百炼 (Bailian)",
    provider: "openai-compatible",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    defaultModel: "deepseek-v4-pro",
  },
  custom: {
    label: "Custom (OpenAI-compatible)",
    provider: "openai-compatible",
    baseUrl: "",
    defaultModel: "",
  },
};

type StageName = "summary" | "risk" | "suggestion";

const STAGE_LABELS: Record<string, { name: string; desc: string }> = {
  summary: {
    name: "Summary",
    desc: "Generates PR change overview. Fast model recommended.",
  },
  risk: {
    name: "Risk Analysis",
    desc: "Detects bugs, security issues, and code smells. Most capable model recommended.",
  },
  suggestion: {
    name: "Suggestions",
    desc: "Generates fix suggestions for confirmed issues. Balanced model recommended.",
  },
};

interface StageForm {
  preset: string;
  model: string;
  apiKey: string;
  baseUrl: string;
  showKey: boolean;
}

function defaultForm(): StageForm {
  return {
    preset: "anthropic",
    model: "",
    apiKey: "",
    baseUrl: "",
    showKey: false,
  };
}

export function SettingsPage() {
  const [forms, setForms] = useState<Record<StageName, StageForm>>(() => ({
    summary: defaultForm(),
    risk: defaultForm(),
    suggestion: defaultForm(),
  }));
  const [loadState, setLoadState] = useState<"loading" | "loaded" | "error">("loading");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState("");

  // Load existing settings on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const result = await fetchSettings();
        if (cancelled) return;
        if (result.success && result.data) {
          const loaded = result.data;
          setForms({
            summary: formFromSaved(loaded.summary),
            risk: formFromSaved(loaded.risk),
            suggestion: formFromSaved(loaded.suggestion),
          });
        }
        if (!cancelled) setLoadState("loaded");
      } catch {
        if (!cancelled) setLoadState("error");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateField = useCallback(
    (stage: StageName, field: keyof StageForm, value: string | boolean) => {
      setForms((prev) => ({
        ...prev,
        [stage]: { ...prev[stage], [field]: value },
      }));
      setSaveState((prev) => (prev === "saved" ? "idle" : prev));
    },
    [],
  );

  const handlePresetChange = useCallback((stage: StageName, preset: string) => {
    setForms((prev) => {
      const cfg = PROVIDER_PRESETS[preset];
      return {
        ...prev,
        [stage]: {
          ...prev[stage],
          preset,
          model: cfg.defaultModel,
          baseUrl: preset === "custom" ? prev[stage].baseUrl : cfg.baseUrl,
        },
      };
    });
    setSaveState((prev) => (prev === "saved" ? "idle" : prev));
  }, []);

  const handleSave = async () => {
    setSaveState("saving");
    setSaveError("");
    try {
      const settings: LLMSettings = {
        summary: buildConfig(forms.summary),
        risk: buildConfig(forms.risk),
        suggestion: buildConfig(forms.suggestion),
      };
      const result = await saveSettings(settings);
      if (result.success) {
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 3000);
      } else {
        setSaveState("error");
        setSaveError(result.error ?? "Failed to save");
      }
    } catch (err) {
      setSaveState("error");
      setSaveError(err instanceof Error ? err.message : "Network error");
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-surface border border-linear-border text-[11px] font-weight-510 text-linear-text-tertiary mb-4">
          <Settings className="h-3 w-3" />
          CONFIGURATION
        </div>
        <h1 className="text-[32px] font-weight-510 tracking-tight-custom text-linear-text-primary mb-2">
          Settings
        </h1>
        <p className="text-[15px] text-linear-text-tertiary">
          Configure LLM providers for each pipeline stage.
        </p>
      </motion.div>

      {loadState === "loading" && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 text-linear-accent animate-spin" />
        </div>
      )}

      {loadState === "error" && (
        <div className="glass-surface rounded-xl p-8 text-center">
          <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-3" />
          <p className="text-linear-text-secondary mb-2">Failed to load settings</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="text-[13px] text-linear-accent hover:text-linear-accent-hover"
          >
            Retry
          </button>
        </div>
      )}

      {loadState === "loaded" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
          {/* LLM Pipeline Config — 3 stage cards */}
          {(["summary", "risk", "suggestion"] as StageName[]).map((stage, i) => (
            <motion.div
              key={stage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}
              className="glass-surface rounded-xl p-6"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="h-8 w-8 rounded-lg bg-linear-surface flex items-center justify-center border border-linear-border-subtle">
                  <Sparkles className="h-4 w-4 text-linear-accent" />
                </div>
                <div>
                  <h3 className="text-[13px] font-weight-510 text-linear-text-secondary">
                    {STAGE_LABELS[stage].name}
                  </h3>
                  <p className="text-[11px] text-linear-text-muted">{STAGE_LABELS[stage].desc}</p>
                </div>
              </div>

              <div className="pl-11 space-y-4">
                {/* Provider dropdown */}
                <div>
                  <label
                    htmlFor={`${stage}-provider`}
                    className="block text-[11px] font-weight-510 text-linear-text-muted tracking-wide uppercase mb-1.5"
                  >
                    Provider
                  </label>
                  <select
                    id={`${stage}-provider`}
                    value={forms[stage].preset}
                    onChange={(e) => handlePresetChange(stage, e.target.value)}
                    className="w-full px-3 py-2.5 bg-linear-black border border-linear-border rounded-md text-[13px] text-linear-text-primary focus:outline-none focus:border-linear-accent/50 transition-colors"
                  >
                    {Object.entries(PROVIDER_PRESETS).map(([key, cfg]) => (
                      <option key={key} value={key}>
                        {cfg.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Model */}
                <div>
                  <label
                    htmlFor={`${stage}-model`}
                    className="block text-[11px] font-weight-510 text-linear-text-muted tracking-wide uppercase mb-1.5"
                  >
                    Model
                  </label>
                  <input
                    id={`${stage}-model`}
                    type="text"
                    value={forms[stage].model}
                    onChange={(e) => updateField(stage, "model", e.target.value)}
                    placeholder={PROVIDER_PRESETS[forms[stage].preset].defaultModel || "model-name"}
                    className="w-full px-3 py-2.5 bg-linear-black border border-linear-border rounded-md text-[13px] text-linear-text-primary placeholder-linear-text-muted/50 focus:outline-none focus:border-linear-accent/50 transition-colors"
                  />
                </div>

                {/* API Key */}
                <div>
                  <label
                    htmlFor={`${stage}-apikey`}
                    className="block text-[11px] font-weight-510 text-linear-text-muted tracking-wide uppercase mb-1.5"
                  >
                    API Key
                  </label>
                  <div className="relative">
                    <input
                      id={`${stage}-apikey`}
                      type={forms[stage].showKey ? "text" : "password"}
                      value={forms[stage].apiKey}
                      onChange={(e) => updateField(stage, "apiKey", e.target.value)}
                      placeholder={
                        PROVIDER_PRESETS[forms[stage].preset].label === "Google Gemini"
                          ? "AIza..."
                          : "sk-..."
                      }
                      className="w-full px-3 py-2.5 bg-linear-black border border-linear-border rounded-md text-[13px] text-linear-text-primary placeholder-linear-text-muted/50 focus:outline-none focus:border-linear-accent/50 transition-colors pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => updateField(stage, "showKey", !forms[stage].showKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-linear-text-muted hover:text-linear-text-tertiary"
                      aria-label={forms[stage].showKey ? "Hide API key" : "Show API key"}
                    >
                      {forms[stage].showKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Base URL — shown when provider uses it */}
                {(forms[stage].preset === "custom" ||
                  PROVIDER_PRESETS[forms[stage].preset].provider === "openai-compatible") && (
                  <div>
                    <label
                      htmlFor={`${stage}-baseurl`}
                      className="block text-[11px] font-weight-510 text-linear-text-muted tracking-wide uppercase mb-1.5"
                    >
                      Base URL
                    </label>
                    <input
                      id={`${stage}-baseurl`}
                      type="text"
                      value={forms[stage].baseUrl}
                      onChange={(e) => updateField(stage, "baseUrl", e.target.value)}
                      placeholder={PROVIDER_PRESETS[forms[stage].preset].baseUrl || "https://..."}
                      className="w-full px-3 py-2.5 bg-linear-black border border-linear-border rounded-md text-[13px] text-linear-text-primary placeholder-linear-text-muted/50 focus:outline-none focus:border-linear-accent/50 transition-colors"
                    />
                  </div>
                )}
              </div>
            </motion.div>
          ))}

          {/* Save button */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saveState === "saving"}
              className="flex items-center gap-2 px-5 py-2.5 bg-linear-brand hover:bg-linear-accent text-white rounded-md text-[13px] font-weight-510 transition-colors disabled:opacity-50"
            >
              {saveState === "saving" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saveState === "saving" ? "Saving..." : "Save Settings"}
            </button>
            {saveState === "saved" && (
              <span className="flex items-center gap-1 text-[13px] text-green-400">
                <Check className="h-4 w-4" />
                Saved
              </span>
            )}
            {saveState === "error" && (
              <span className="flex items-center gap-1 text-[13px] text-red-400">
                <AlertCircle className="h-4 w-4" />
                {saveError}
              </span>
            )}
          </div>

          {/* Coming Soon sections */}
          <div className="pt-4 space-y-4">
            <ComingSoonSection
              title="Notifications"
              description="Configure how you receive review notifications."
            />
            <ComingSoonSection
              title="Security"
              description="Merge gates, auto-scan rules, and approval requirements."
            />
          </div>
        </motion.div>
      )}
    </div>
  );
}

function ComingSoonSection({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="glass-surface rounded-xl p-6 opacity-50 pointer-events-none">
      <div className="flex items-center gap-3 mb-1">
        <div className="h-8 w-8 rounded-lg bg-linear-surface flex items-center justify-center border border-linear-border-subtle" />
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-[13px] font-weight-510 text-linear-text-secondary">{title}</h3>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-weight-590 bg-linear-accent/10 text-linear-accent">
              COMING SOON
            </span>
          </div>
          <p className="text-[11px] text-linear-text-muted">{description}</p>
        </div>
      </div>
    </div>
  );
}

function formFromSaved(saved: {
  provider: string;
  model: string;
  baseUrl?: string;
}): StageForm {
  // Reverse-map provider+baseUrl to find the matching preset
  for (const [key, cfg] of Object.entries(PROVIDER_PRESETS)) {
    if (
      cfg.provider === saved.provider &&
      (cfg.baseUrl === saved.baseUrl || (!cfg.baseUrl && !saved.baseUrl))
    ) {
      return {
        preset: key,
        model: saved.model,
        apiKey: "",
        baseUrl: saved.baseUrl ?? "",
        showKey: false,
      };
    }
  }
  // Fallback: treat as custom
  return {
    preset: "custom",
    model: saved.model,
    apiKey: "",
    baseUrl: saved.baseUrl ?? "",
    showKey: false,
  };
}

function buildConfig(form: StageForm): {
  provider: string;
  model: string;
  apiKey: string;
  baseUrl?: string;
} {
  const cfg = PROVIDER_PRESETS[form.preset];
  return {
    provider: cfg.provider,
    model: form.model || cfg.defaultModel,
    apiKey: form.apiKey,
    baseUrl: form.baseUrl || cfg.baseUrl || undefined,
  };
}
