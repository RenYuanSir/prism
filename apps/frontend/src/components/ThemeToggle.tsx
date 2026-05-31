import { Moon, Sun } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

function resolveTheme(): boolean {
  const stored = localStorage.getItem("theme");
  if (stored) return stored === "light";
  return window.matchMedia("(prefers-color-scheme: light)").matches;
}

export function ThemeToggle() {
  const [isLight, setIsLight] = useState(resolveTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("light", isLight);
    localStorage.setItem("theme", isLight ? "light" : "dark");
  }, [isLight]);

  const toggle = useCallback(() => setIsLight((p) => !p), []);

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-weight-510 text-linear-text-tertiary hover:bg-linear-surface/50 hover:text-linear-text-secondary transition-all duration-200 w-full"
      aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
    >
      {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      {isLight ? "Dark Mode" : "Light Mode"}
    </button>
  );
}
