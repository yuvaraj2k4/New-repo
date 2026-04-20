"use client";

import { useAuthStore } from "@/store/authStore";
import { usePathname } from "next/navigation";
import { Search, Settings, Bell, ChevronRight } from "lucide-react";

const PAGE_TITLES: Record<string, string> = {
  dashboard: "Overview",
  requirements: "Requirements",
  qa: "Test Engineering",
  brd: "BRD Studio",
  frs: "FRS Studio",
  prs: "PRS Studio",
  projects: "Projects",
  "test-cases": "Test Case Generator",
  "test-data": "Test Data Generator",
};

export function Header() {
  const { user } = useAuthStore();
  const pathname = usePathname();

  const getBreadcrumbs = (path: string) => {
    const parts = path.split("/").filter(Boolean);
    return parts.map((part) => {
      // Handle project UUIDs cleanly in the path
      if (part.length > 20 && part.includes("-")) return "Project Workspace";
      return PAGE_TITLES[part] ?? part.charAt(0).toUpperCase() + part.slice(1);
    });
  };

  const initials = user?.full_name
    ? user.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : "A";

  return (
    <header
      className="sticky top-0 z-40 w-full h-[83px] flex items-start justify-between px-6 pt-6"
      style={{
        background: "var(--ios-card-bg)",
        borderBottom: "1px solid var(--ios-separator)"
      }}
    >
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-sm font-medium tracking-tight leading-8 select-none">
        {getBreadcrumbs(pathname).map((crumb, index, arr) => (
          <div key={index} className="flex items-center gap-1.5">
            <span
              className="transition-colors"
              style={{ color: index === arr.length - 1 ? "var(--brand-navy)" : "var(--brand-muted)" }}
            >
              {crumb}
            </span>
            {index < arr.length - 1 && (
              <ChevronRight className="w-3.5 h-3.5" style={{ color: "var(--ios-separator)", marginTop: "1px" }} />
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 h-8">
        {/* Search */}
        <button
          className="flex items-center gap-2 h-8 px-3 rounded-lg transition-colors text-sm"
          style={{ color: "var(--brand-muted)" }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = "var(--ios-bg-secondary)";
            (e.currentTarget as HTMLElement).style.color = "var(--brand-navy)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = "";
            (e.currentTarget as HTMLElement).style.color = "var(--brand-muted)";
          }}
        >
          <Search className="w-4 h-4" />
          <span
            className="hidden md:inline small font-semibold px-1.5 py-0.5 rounded-md"
            style={{ background: "var(--ios-bg-secondary)", border: "1px solid var(--ios-separator)", color: "var(--brand-muted)" }}
          >
            ⌘K
          </span>
        </button>

        {/* Bell */}
        <button
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{ color: "var(--brand-muted)" }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = "var(--ios-bg-secondary)";
            (e.currentTarget as HTMLElement).style.color = "var(--brand-navy)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = "";
            (e.currentTarget as HTMLElement).style.color = "var(--brand-muted)";
          }}
        >
          <Bell className="w-4 h-4" />
        </button>

        {/* Settings */}
        <button
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{ color: "var(--brand-muted)" }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = "var(--ios-bg-secondary)";
            (e.currentTarget as HTMLElement).style.color = "var(--brand-navy)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = "";
            (e.currentTarget as HTMLElement).style.color = "var(--brand-muted)";
          }}
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Divider */}
        <span className="mx-2 h-5 w-px" style={{ background: "var(--ios-separator)" }} />

        {/* User avatar */}
        <div className="flex items-center gap-2.5">
          <div className="hidden sm:block text-right">
            <p className="text-xs font-semibold leading-tight" style={{ color: "var(--brand-navy)" }}>
              {user?.full_name || "Architect"}
            </p>
            <p className="small leading-tight capitalize" style={{ color: "var(--brand-muted)" }}>
              {user?.role || "Developer"}
            </p>
          </div>
          <button
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 transition-opacity hover:opacity-85"
            style={{ background: "var(--brand-primary)" }}
          >
            {initials}
          </button>
        </div>
      </div>
    </header>
  );
}
