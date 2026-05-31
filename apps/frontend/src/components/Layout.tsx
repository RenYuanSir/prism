import { motion } from "framer-motion";
import { GitPullRequest, History, Settings } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";

const navItems = [
  { to: "/", icon: GitPullRequest, label: "PR Review" },
  { to: "/history", icon: History, label: "History" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-linear-black text-linear-text-primary">
      <div className="flex h-screen">
        {/* Sidebar */}
        <aside className="w-[240px] border-r border-linear-border-subtle bg-linear-panel flex flex-col">
          {/* Logo */}
          <div className="p-5 border-b border-linear-border-subtle">
            <div className="flex items-center gap-3">
              {/* Prism logo: spectral gradient square */}
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center"
                style={{
                  background:
                    "linear-gradient(135deg, rgb(var(--c-prism-red)) 0%, rgb(var(--c-prism-orange)) 20%, rgb(var(--c-prism-yellow)) 40%, rgb(var(--c-prism-green)) 60%, rgb(var(--c-prism-blue)) 80%, rgb(var(--c-prism-purple)) 100%)",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <title>PRism logo</title>
                  <path
                    d="M8 2L14 5V11L8 14L2 11V5L8 2Z"
                    stroke="white"
                    strokeWidth="1.2"
                    strokeLinejoin="round"
                    fill="none"
                  />
                  <path d="M8 2V14" stroke="white" strokeWidth="0.6" opacity="0.6" />
                  <path d="M2 5L8 8L14 5" stroke="white" strokeWidth="0.6" opacity="0.5" />
                </svg>
              </div>
              <div>
                <h1 className="font-weight-510 text-sm text-linear-text-primary">PRism</h1>
                <p className="text-[11px] text-linear-text-muted tracking-wide">AI CODE REVIEW</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-0.5">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-weight-510 transition-all duration-200 ${
                    isActive
                      ? "bg-linear-surface text-linear-text-primary border border-linear-border-subtle"
                      : "text-linear-text-tertiary hover:bg-linear-surface/50 hover:text-linear-text-secondary"
                  }`
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                {location.pathname === item.to && (
                  <motion.div
                    layoutId="activeNav"
                    className="ml-auto w-1 h-1 rounded-full bg-linear-accent"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </NavLink>
            ))}
          </nav>

          {/* Footer: Theme toggle + status */}
          <div className="p-3 border-t border-linear-border-subtle space-y-1">
            <ThemeToggle />
            <div className="flex items-center gap-2 px-3 py-1.5 text-[11px] text-linear-text-muted">
              <div className="h-1.5 w-1.5 rounded-full bg-linear-success animate-pulse" />
              <span className="font-weight-510 tracking-wide">SYSTEM READY</span>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
