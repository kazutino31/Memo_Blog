// src/components/ThemeToggle.tsx
import { useThemeStore } from "@/store/themeStore";
import { Sun, Moon, Monitor } from "lucide-react";

const ICONS = { light: Sun, dark: Moon, system: Monitor };

const LABELS = {
  light: "亮色模式",
  dark: "深色模式",
  system: "跟隨系統",
} as const;

export function ThemeToggle() {
  const { preference, cycle } = useThemeStore();
  const Icon = ICONS[preference] ?? Monitor;
  return (
    <button
      className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-[var(--rule-strong)] "
      onClick={cycle}
      aria-label={`切換主題，目前：${LABELS[preference]}`}
      title={LABELS[preference]}
    >
      <Icon size={18} />
    </button>
  );
}
