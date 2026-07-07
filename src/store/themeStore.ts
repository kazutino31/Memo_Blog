import { create } from "zustand";

type ThemePreference = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeState {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (pref: ThemePreference) => void;
  cycle: () => void; // light → dark → system → light...
}

function resolveTheme(pref: ThemePreference): ResolvedTheme {
  if (pref === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return pref;
}

function applyTheme(resolved: ResolvedTheme) {
  document.documentElement.setAttribute("data-theme", resolved);
}

const initialPreference =
  (localStorage.getItem("theme") as ThemePreference) || "system";
const initialResolved = resolveTheme(initialPreference);

export const useThemeStore = create<ThemeState>((set, get) => ({
  preference: initialPreference,
  resolved: initialResolved,

  setPreference: (pref) => {
    const resolved = resolveTheme(pref);
    localStorage.setItem("theme", pref);
    applyTheme(resolved);
    set({ preference: pref, resolved });
  },

  cycle: () => {
    const order: ThemePreference[] = ["light", "dark", "system"];
    const next = order[(order.indexOf(get().preference) + 1) % order.length];
    get().setPreference(next);
  },
}));

// 監聽系統偏好變化：使用者在 OS 層級切換深色模式時，
// 若目前是 'system' 模式，網站要即時跟著變（不需重新整理頁面）
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", (e) => {
    const { preference } = useThemeStore.getState();
    if (preference === "system") {
      const resolved = e.matches ? "dark" : "light";
      applyTheme(resolved);
      useThemeStore.setState({ resolved });
    }
  });
