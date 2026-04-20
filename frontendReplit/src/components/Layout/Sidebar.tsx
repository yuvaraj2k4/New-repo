"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";
import { useState } from "react";
import {
  LayoutDashboard,
  FolderGit2,
  Settings2,
  Boxes,
  TerminalSquare,
  CheckSquare,
  Database,
  LogOut,
  ChevronLeft,
  ChevronDown,
  Cpu,
} from "lucide-react";

const WORKSPACE_NAV = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Projects", href: "/dashboard/projects", icon: FolderGit2 },
];

const STUDIO_NAV = [
  { label: "BRD Studio", href: "/dashboard/requirements/brd", icon: Settings2 },
  { label: "FRS Studio", href: "/dashboard/requirements/frs", icon: Boxes },
  { label: "PRS Studio", href: "/dashboard/requirements/prs", icon: TerminalSquare },
];

const TEST_ENG_NAV = [
  { label: "Test Case Generator", href: "/dashboard/qa/test-cases", icon: CheckSquare },
  { label: "Test Data Generator", href: "/dashboard/qa/test-data", icon: Database },
];

function NavItem({
  href,
  icon: Icon,
  label,
  active,
  collapsed,
  badge,
  isSubItem,
}: {
  href: string;
  icon: any;
  label: string;
  active: boolean;
  collapsed: boolean;
  badge?: string;
  isSubItem?: boolean;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={cn(
        "group relative flex items-center rounded-xl transition-all duration-150 ease-out select-none",
        collapsed
          ? "w-10 h-10 justify-center mx-auto"
          : isSubItem
            ? "gap-3 py-2 mx-2 pl-9 pr-3"
            : "gap-3 px-3 py-2 mx-2"
      )}
      style={
        active
          ? { background: "var(--brand-primary-light)", color: "var(--brand-primary)" }
          : { color: "var(--brand-muted)" }
      }
      onMouseEnter={e => {
        if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.04)";
      }}
      onMouseLeave={e => {
        if (!active) (e.currentTarget as HTMLElement).style.background = "";
      }}
    >
      <Icon
        className="shrink-0 w-[18px] h-[18px] transition-transform duration-150 group-hover:scale-105"
        strokeWidth={active ? 2.5 : 2}
      />

      {!collapsed && (
        <span className={cn(
          "flex-1 truncate text-base",
          active ? "font-semibold" : "font-medium"
        )} style={{ color: active ? "var(--brand-primary)" : "var(--brand-navy)" }}>
          {label}
        </span>
      )}

      {!collapsed && badge && (
        <span
          className="text-[0.6rem] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full"
          style={{ background: "var(--brand-primary-light)", color: "var(--brand-primary)" }}
        >
          {badge}
        </span>
      )}

      {active && !collapsed && (
        <span
          className="absolute left-0 inset-y-2 w-[3px] rounded-r-full"
          style={{ background: "var(--brand-primary)" }}
        />
      )}

      {collapsed && active && (
        <span
          className="absolute left-0 inset-y-2 w-[3px] rounded-r-full"
          style={{ background: "var(--brand-primary)" }}
        />
      )}
    </Link>
  );
}

function NavGroup({
  label,
  icon: Icon,
  badge,
  active,
  collapsed,
  setCollapsed,
  children,
}: {
  label: string;
  icon: any;
  badge?: string;
  active: boolean;
  collapsed: boolean;
  setCollapsed: (v: boolean | ((v: boolean) => boolean)) => void;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(active);

  return (
    <div className="flex flex-col gap-0.5 mt-1">
      <button
        onClick={() => {
          if (collapsed) {
            setCollapsed(false);
            setExpanded(true);
          } else {
            setExpanded(!expanded);
          }
        }}
        title={collapsed ? label : undefined}
        className={cn(
          "group relative flex items-center rounded-xl transition-all duration-150 ease-out select-none w-full text-left",
          collapsed
            ? "w-10 h-10 justify-center mx-auto"
            : "gap-3 px-3 py-2 mx-2"
        )}
        style={{ color: active ? "var(--brand-primary)" : "var(--brand-muted)" }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = "var(--ios-hover-bg)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = "";
        }}
      >
        <Icon
          className="shrink-0 w-[18px] h-[18px]"
          strokeWidth={active ? 2.5 : 2}
          style={{ color: active ? "var(--brand-primary)" : "var(--brand-muted)" }}
        />

        {!collapsed && (
          <span
            className={cn("flex-1 truncate text-base text-left", active ? "font-semibold" : "font-medium")}
            style={{ color: active ? "var(--brand-primary)" : "var(--brand-navy)" }}
          >
            {label}
          </span>
        )}

        {!collapsed && badge && (
          <span
            className="text-[0.6rem] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full mr-1"
            style={{ background: "var(--brand-primary-light)", color: "var(--brand-primary)" }}
          >
            {badge}
          </span>
        )}

        {!collapsed && (
          <ChevronDown
            className={cn("shrink-0 w-3.5 h-3.5 transition-transform duration-200", expanded ? "rotate-180" : "")}
            style={{ color: "var(--brand-muted)" }}
          />
        )}
      </button>

      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-out",
          !collapsed && expanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore
    } finally {
      logout();
    }
  };

  const initials = user?.full_name
    ? user.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : "A";

  return (
    <aside
      className={cn(
        "relative flex flex-col h-screen shrink-0 z-50 overflow-visible transition-all duration-300 ease-in-out",
        collapsed ? "w-[68px]" : "w-[280px]"
      )}
      style={{
        background: "var(--ios-card-bg)",
        borderRight: "1px solid var(--ios-separator)"
      }}
    >
      {/* Brand */}
      <div
        className={cn(
          "flex items-center shrink-0 pt-6 pb-5",
          collapsed ? "justify-center px-3" : "gap-3 px-5"
        )}
      >
        <div
          className="relative w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
          style={{ background: "var(--brand-primary)" }}
        >
          <Cpu className="w-4.5 h-4.5 text-white" strokeWidth={2} />
        </div>

        {!collapsed && (
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold tracking-tight leading-tight" style={{ color: "var(--brand-navy)" }}>
              Midnight<span style={{ color: "var(--brand-primary)" }}>Architect</span>
            </h1>
            <p className="small font-medium mt-0.5" style={{ color: "var(--brand-muted)" }}>SDLC AI Workspace</p>
          </div>
        )}
      </div>

      {/* Separator */}
      <div className="mx-4 mb-2" style={{ height: "1px", background: "var(--ios-separator)" }} />

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 flex flex-col gap-0.5 custom-scrollbar">
        {!collapsed && (
          <p
            className="small px-5 pt-3 pb-1.5 uppercase tracking-widest select-none opacity-80"
            style={{ color: "var(--brand-muted)" }}
          >
            Workspace
          </p>
        )}
        {collapsed && <div className="h-4" />}

        {WORKSPACE_NAV.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            active={
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href)
            }
            collapsed={collapsed}
          />
        ))}

        {!collapsed && (
          <p
            className="small px-5 pt-5 pb-1.5 uppercase tracking-widest select-none opacity-80"
            style={{ color: "var(--brand-muted)" }}
          >
            Studios
          </p>
        )}
        {collapsed && <div className="h-3" />}

        <NavGroup
          label="Requirement Studio"
          icon={FolderGit2}
          active={pathname.startsWith("/dashboard/requirements")}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
        >
          {STUDIO_NAV.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              active={pathname === item.href || pathname.startsWith(item.href + "/")}
              collapsed={collapsed}
              isSubItem
            />
          ))}
        </NavGroup>

        <NavGroup
          label="Test Engineering"
          icon={Boxes}
          active={pathname.startsWith("/dashboard/qa")}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
        >
          {TEST_ENG_NAV.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              active={pathname === item.href || pathname.startsWith(item.href + "/")}
              collapsed={collapsed}
              isSubItem
            />
          ))}
        </NavGroup>
      </nav>

      {/* Footer */}
      <div style={{ borderTop: "1px solid var(--ios-separator)" }}>
        <div className="p-3 flex items-center justify-center py-4">
          <button onClick={handleLogout} className="logout-action-btn flex shrink-0" title="Sign Out">
            <div className="sign">
              <LogOut style={{ color: "#ffffff", strokeWidth: 2.5, width: "17px", height: "17px" }} />
            </div>
            <div className="text whitespace-nowrap small font-semibold">Logout</div>
          </button>
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className={cn(
          "absolute top-7 flex items-center justify-center w-6 h-6 rounded-full shadow-sm z-50 transition-all duration-300",
          "right-0 translate-x-1/2"
        )}
        style={{
          background: "var(--ios-card-bg)",
          border: "1px solid var(--ios-separator)",
          color: "var(--brand-muted)"
        }}
        title={collapsed ? "Expand" : "Collapse"}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.color = "var(--brand-primary)";
          (e.currentTarget as HTMLElement).style.borderColor = "var(--brand-primary)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.color = "var(--brand-muted)";
          (e.currentTarget as HTMLElement).style.borderColor = "var(--ios-separator)";
        }}
      >
        <ChevronLeft
          className={cn("w-3.5 h-3.5 transition-transform duration-300", collapsed ? "rotate-180" : "")}
        />
      </button>
    </aside>
  );
}
