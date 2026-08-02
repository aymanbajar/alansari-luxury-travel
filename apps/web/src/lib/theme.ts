const storageKey = "alansari-theme";

export type ThemeMode = "light" | "dark";

export function preferredTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }

  const saved = window.localStorage.getItem(storageKey);
  if (saved === "dark" || saved === "light") {
    return saved;
  }

  if (typeof window.matchMedia !== "function") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme: ThemeMode): void {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.dataset.theme = theme;
  window.localStorage.setItem(storageKey, theme);
}

export function initializeTheme(): void {
  applyTheme(preferredTheme());
}
