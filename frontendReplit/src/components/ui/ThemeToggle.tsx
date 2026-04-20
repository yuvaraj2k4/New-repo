"use client";

import { useTheme } from "@/components/providers/ThemeProvider";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300",
        "bg-surface-container-high hover:bg-surface-container-highest/50",
        "border border-outline-variant/10 text-tertiary hover:text-on-surface focus:outline-none",
        className
      )}
      aria-label="Toggle theme"
    >
      <div className="relative w-5 h-5 overflow-hidden">
        <span 
          className={cn(
            "material-symbols-outlined absolute inset-0 text-xl transition-all duration-500 ease-in-out",
            theme === "dark" ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          )}
        >
          dark_mode
        </span>
        <span 
          className={cn(
            "material-symbols-outlined absolute inset-0 text-xl transition-all duration-500 ease-in-out text-amber-500",
            theme === "light" ? "translate-y-0 opacity-100" : "-translate-y-8 opacity-0"
          )}
        >
          light_mode
        </span>
      </div>
    </button>
  );
}
