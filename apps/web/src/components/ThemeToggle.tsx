import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { applyTheme, preferredTheme } from "../lib/theme";
import type { ThemeMode } from "../lib/theme";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<ThemeMode>(() => preferredTheme());
  const isDark = theme === "dark";

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <button
      type="button"
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-olive/20 bg-white/85 px-3.5 py-2 text-sm font-bold text-ink shadow-sm shadow-ink/5 transition hover:-translate-y-0.5 hover:border-gold/40 hover:bg-white focus:outline-none focus:ring-4 focus:ring-gold/25 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      aria-label={isDark ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن"}
      aria-pressed={isDark}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
      <span className="hidden sm:inline">{isDark ? "فاتح" : "داكن"}</span>
    </button>
  );
}
