"use client";

import { useAuthStore } from "@/store/authStore";
import { Activity, BookOpen, Clock, Users, ArrowUpRight, Sparkles, FileCode, TestTube } from "lucide-react";
import Link from "next/link";

const statCards = [
  { label: "Active Projects", value: "0", sub: "No projects yet", icon: Activity, color: "var(--brand-primary)", bg: "var(--brand-primary-light)" },
  { label: "Documents Generated", value: "0", sub: "Start with BRD Studio", icon: BookOpen, color: "#5AC8FA", bg: "rgba(90,200,250,0.08)" },
  { label: "Team Members", value: "1", sub: "Solo workspace", icon: Users, color: "var(--brand-success)", bg: "rgba(26, 160, 83, 0.08)" },
  { label: "Time Saved", value: "0h", sub: "Calculated via AI", icon: Clock, color: "var(--brand-primary)", bg: "var(--brand-primary-light)" },
];

const quickActions = [
  { label: "BRD Studio", desc: "Generate business requirements from any context document", href: "/dashboard/requirements/brd", icon: FileCode, color: "var(--brand-primary)" },
  { label: "FRS Studio", desc: "Transform system requirements into functional specs", href: "/dashboard/requirements/frs", icon: Sparkles, color: "#5856D6" },
  { label: "PRS Studio", desc: "Build structured product requirement specifications", href: "/dashboard/requirements/prs", icon: Activity, color: "#AF52DE" },
  { label: "Test Cases", desc: "Generate comprehensive test suites automatically", href: "/dashboard/qa/test-cases", icon: TestTube, color: "var(--brand-success)" },
];

export default function DashboardPage() {
  const { user } = useAuthStore();
  const firstName = user?.full_name?.split(" ")[0] || "Architect";

  return (
    <div className="pb-16 w-full">

      {/* Welcome Banner - Modern Iridescent Waves */}
      <div className="relative overflow-hidden w-full h-[260px] md:h-[300px] shadow-2xl">
        <div className="absolute inset-0 z-0">
          <svg 
            viewBox="0 0 1200 200" 
            xmlns="http://www.w3.org/2000/svg" 
            width="100%" 
            height="100%" 
            preserveAspectRatio="none" 
            className="w-full h-full object-cover"
          >
            <defs>
              {/* Backlit Iridescent Gradients */}
              <linearGradient id="bgGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="var(--brand-navy)"/>
                <stop offset="100%" stopColor="#1E1E2F"/>
              </linearGradient>

              {/* Wave 1: Electric Blue to Violet (Backlit Glow) */}
              <linearGradient id="wave1Gradient" x1="0" y1="0" x2="1" y2="0.2">
                <stop offset="0%" stopColor="var(--brand-primary)" stopOpacity="0.9"/>
                <stop offset="60%" stopColor="#8B5CF6" stopOpacity="0.7"/>
                <stop offset="100%" stopColor="var(--brand-navy)" stopOpacity="0.2"/>
              </linearGradient>

              {/* Wave 2: Cyan to Deep Indigo (High Vibrancy) */}
              <linearGradient id="wave2Gradient" x1="0" y1="0" x2="0.5" y2="1">
                <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.8"/>
                <stop offset="50%" stopColor="var(--brand-primary)" stopOpacity="0.6"/>
                <stop offset="100%" stopColor="var(--brand-navy)" stopOpacity="0.1"/>
              </linearGradient>
            </defs>

            {/* Base Background */}
            <rect width="1200" height="200" fill="url(#bgGradient)" />

            {/* Glowing Restored Animated Waves */}
            <path d="M0,120 C300,180 600,40 1200,120 L1200,200 L0,200 Z" fill="url(#wave1Gradient)">
              <animate attributeName="d" dur="14s" repeatCount="indefinite" values="M0,120 C300,180 600,40 1200,120 L1200,200 L0,200 Z; M0,140 C300,60 700,180 1200,100 L1200,200 L0,200 Z; M0,120 C300,180 600,40 1200,120 L1200,200 L0,200 Z" />
            </path>

            <path d="M0,140 C400,100 800,200 1200,140 L1200,200 L0,200 Z" fill="url(#wave2Gradient)">
              <animate attributeName="d" dur="18s" repeatCount="indefinite" values="M0,140 C400,100 800,200 1200,140 L1200,200 L0,200 Z; M0,160 C500,220 900,80 1200,160 L1200,200 L0,200 Z; M0,140 C400,100 800,200 1200,140 L1200,200 L0,200 Z" />
            </path>
          </svg>
        </div>

        <div className="relative z-10 px-6 md:px-10 pt-6 md:pt-8 space-y-4 max-w-3xl">
          <h1 className="tracking-tight text-white h1" style={{ textShadow: "0 4px 12px rgba(0,0,0,0.25)" }}>
            Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">{firstName}</span>
          </h1>
          <p className="text-base md:text-xl text-white/90 max-w-2xl font-medium leading-relaxed drop-shadow-md">
            Your high-performance SDLC tracker is fully synchronized. Scale your software delivery with precision-engineered AI studios.
          </p>
        </div>
      </div>

      <div className="px-6 md:px-8 space-y-8 -mt-12 md:-mt-16 relative z-20">

        {/* Stats */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="rounded-xl p-5 transition-all hover:shadow-xl hover:-translate-y-1"
              style={{ background: "var(--ios-card-bg)", border: "1px solid var(--ios-separator)", boxShadow: "var(--ios-shadow-sm)" }}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--brand-muted)" }}>{card.label}</p>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: card.bg }}
                >
                  <card.icon className="w-4 h-4" style={{ color: card.color }} strokeWidth={2} />
                </div>
              </div>
              <p className="text-3xl font-bold tracking-tight" style={{ color: "var(--brand-navy)" }}>{card.value}</p>
              <p className="small mt-1.5 font-medium" style={{ color: "var(--brand-muted)" }}>{card.sub}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div>
          <h5 className="text-[11px] font-bold uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: "var(--brand-muted)" }}>
            <Activity className="w-4 h-4 text-[var(--brand-primary)]" />
            Quick Actions
          </h5>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => (
              <Link key={action.href} href={action.href}>
                <div
                  className="rounded-xl p-5 h-full flex flex-col gap-3 cursor-pointer transition-all hover:shadow-2xl hover:-translate-y-1 group border border-transparent hover:border-[var(--brand-primary)]/20"
                  style={{ background: "var(--ios-card-bg)", border: "1px solid var(--ios-separator)", boxShadow: "var(--ios-shadow-sm)" }}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ background: `${action.color}14` }}
                    >
                      <action.icon className="w-5 h-5" style={{ color: action.color }} strokeWidth={1.75} />
                    </div>
                    <ArrowUpRight
                      className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 text-[var(--brand-primary)]"
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold" style={{ color: "var(--brand-navy)" }}>{action.label}</h3>
                    <p className="text-sm mt-1 leading-relaxed" style={{ color: "var(--brand-muted)" }}>{action.desc}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Activity & Analytics row */}
        <div className="grid gap-4 md:grid-cols-7">
          {/* Activity */}
          <div
            className="md:col-span-4 rounded-xl p-6 flex flex-col items-center justify-center text-center min-h-[240px]"
            style={{ background: "var(--ios-card-bg)", border: "1px solid var(--ios-separator)", boxShadow: "var(--ios-shadow-sm)" }}
          >
            <div
              className="w-14 h-14 rounded-lg flex items-center justify-center mb-4"
              style={{ background: "#F2F2F7" }}
            >
              <Activity className="w-7 h-7" style={{ color: "#C7C7CC" }} strokeWidth={1.5} />
            </div>
            <h3 className="text-base font-semibold" style={{ color: "var(--brand-navy)" }}>No Active Generations</h3>
            <p className="small mt-1.5 max-w-xs" style={{ color: "var(--brand-muted)" }}>
              Upload a scope document in BRD Studio to start generating SDLC artifacts.
            </p>
            <Link href="/dashboard/requirements/brd">
              <button
                className="ios-btn-interactive mt-5"
              >
                <span>Open BRD Studio</span>
              </button>
            </Link>
          </div>

          {/* Analytics placeholder */}
          <div
            className="md:col-span-3 rounded-xl p-6 flex flex-col items-center justify-center min-h-[240px] border-2 border-dashed"
            style={{ borderColor: "var(--ios-separator)", background: "var(--ios-card-bg)" }}
          >
            <p className="small font-bold uppercase tracking-widest" style={{ color: "#D1D1D6" }}>
              Analytics — Coming Soon
            </p>
          </div>
        </div>

        {/* End grid wrapper */}
      </div>

    </div>
  );
}
