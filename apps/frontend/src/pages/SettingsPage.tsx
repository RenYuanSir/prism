import { motion } from "framer-motion";
import { Bell, Key, Palette, Settings, Shield, Sparkles } from "lucide-react";

export function SettingsPage() {
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
        <p className="text-[15px] text-linear-text-tertiary">Configure your PRism experience.</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        <SettingsSection
          icon={Key}
          title="API Keys"
          description="Configure GitHub and AI provider API keys."
        >
          <div className="space-y-4">
            <SettingsInput label="GitHub Token" placeholder="ghp_..." type="password" />
            <SettingsInput label="Anthropic API Key" placeholder="sk-ant-..." type="password" />
            <SettingsInput label="Google API Key" placeholder="AI..." type="password" />
          </div>
        </SettingsSection>

        <SettingsSection
          icon={Bell}
          title="Notifications"
          description="Configure how you receive review notifications."
        >
          <div className="space-y-4">
            <ToggleSetting
              label="Email notifications"
              description="Receive email for critical issues"
            />
            <ToggleSetting label="Slack integration" description="Post reviews to Slack channel" />
          </div>
        </SettingsSection>

        <SettingsSection
          icon={Palette}
          title="Appearance"
          description="Customize the look and feel."
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-weight-510 text-linear-text-secondary">Dark Mode</p>
              <p className="text-[11px] text-linear-text-muted mt-0.5">
                Always enabled for optimal code review experience
              </p>
            </div>
            <div className="h-6 w-11 bg-linear-brand rounded-full relative">
              <div className="absolute right-0.5 top-0.5 h-5 w-5 bg-white rounded-full shadow-sm" />
            </div>
          </div>
        </SettingsSection>

        <SettingsSection icon={Shield} title="Security" description="Security-related settings.">
          <div className="space-y-4">
            <ToggleSetting
              label="Require approval for critical issues"
              description="Block merge on critical findings"
            />
            <ToggleSetting
              label="Auto-scan on PR open"
              description="Automatically review new pull requests"
            />
          </div>
        </SettingsSection>

        <SettingsSection
          icon={Sparkles}
          title="AI Configuration"
          description="Fine-tune AI review behavior."
        >
          <div className="space-y-4">
            <SettingsInput label="Summary Model" placeholder="gemini-2.0-flash" />
            <SettingsInput label="Risk Analysis Model" placeholder="claude-3-5-sonnet" />
            <SettingsInput label="Suggestion Model" placeholder="claude-3-5-sonnet" />
          </div>
        </SettingsSection>
      </motion.div>
    </div>
  );
}

function SettingsSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-surface rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-8 w-8 rounded-lg bg-linear-surface flex items-center justify-center border border-linear-border-subtle">
          <Icon className="h-4 w-4 text-linear-accent" />
        </div>
        <div>
          <h3 className="text-[13px] font-weight-510 text-linear-text-secondary">{title}</h3>
          <p className="text-[11px] text-linear-text-muted">{description}</p>
        </div>
      </div>
      <div className="pl-11">{children}</div>
    </div>
  );
}

function SettingsInput({
  label,
  placeholder,
  type = "text",
}: {
  label: string;
  placeholder: string;
  type?: string;
}) {
  const inputId = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div>
      <label
        htmlFor={inputId}
        className="block text-[11px] font-weight-510 text-linear-text-muted tracking-wide uppercase mb-1.5"
      >
        {label}
      </label>
      <input
        id={inputId}
        type={type}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 bg-linear-black border border-linear-border rounded-md text-[13px] text-linear-text-primary placeholder-linear-text-muted/50 focus:outline-none focus:border-linear-accent/50 transition-colors"
      />
    </div>
  );
}

function ToggleSetting({
  label,
  description,
}: {
  label: string;
  description: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[13px] font-weight-510 text-linear-text-secondary">{label}</p>
        <p className="text-[11px] text-linear-text-muted mt-0.5">{description}</p>
      </div>
      <div className="h-6 w-11 bg-linear-surface rounded-full relative cursor-pointer border border-linear-border-subtle">
        <div className="absolute left-0.5 top-0.5 h-5 w-5 bg-linear-text-muted rounded-full" />
      </div>
    </div>
  );
}
