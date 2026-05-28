import { Bell, Key, Palette, Settings } from "lucide-react";

export function SettingsPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-100 mb-2">Settings</h1>
        <p className="text-slate-400">Configure your AI PR Review experience.</p>
      </div>

      <div className="space-y-6">
        <SettingsSection
          icon={Key}
          title="API Keys"
          description="Configure GitHub and AI provider API keys."
        >
          <div className="space-y-3">
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
          <div className="space-y-3">
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
              <p className="text-sm text-slate-200">Dark Mode</p>
              <p className="text-xs text-slate-500">
                Always enabled for optimal code review experience
              </p>
            </div>
            <div className="h-6 w-11 bg-blue-600 rounded-full relative">
              <div className="absolute right-0.5 top-0.5 h-5 w-5 bg-white rounded-full" />
            </div>
          </div>
        </SettingsSection>
      </div>
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
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <Icon className="h-5 w-5 text-slate-400" />
        <div>
          <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
      </div>
      <div className="pl-8">{children}</div>
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
      <label htmlFor={inputId} className="block text-xs font-medium text-slate-400 mb-1">
        {label}
      </label>
      <input
        id={inputId}
        type={type}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
        <p className="text-sm text-slate-200">{label}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <div className="h-6 w-11 bg-slate-700 rounded-full relative cursor-pointer">
        <div className="absolute left-0.5 top-0.5 h-5 w-5 bg-slate-400 rounded-full" />
      </div>
    </div>
  );
}
