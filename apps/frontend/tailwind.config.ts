import type { Config } from "tailwindcss";

function clr(name: string) {
  return `rgb(var(--c-${name}) / <alpha-value>)`;
}
function clrA(name: string, alphaVar: string) {
  return `rgb(var(--c-${name}) / var(${alphaVar}))`;
}

const config: Config = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      colors: {
        linear: {
          black: clr("bg"),
          panel: clr("panel"),
          surface: clr("surface"),
          elevated: clr("elevated"),
          "text-primary": clr("text-primary"),
          "text-secondary": clr("text-secondary"),
          "text-tertiary": clr("text-tertiary"),
          "text-muted": clr("text-muted"),
          brand: clr("brand"),
          accent: clr("accent"),
          "accent-hover": clr("accent-hover"),
          border: clrA("border-rgb", "--c-border-alpha"),
          "border-subtle": clrA("border-rgb", "--c-border-subtle-alpha"),
          success: clr("success"),
        },
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "slide-in-right": "slideInRight 0.4s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        shimmer: "shimmer 2s linear infinite",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};

export default config;
