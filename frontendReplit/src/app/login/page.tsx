"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";
import { useNavigationLoader } from "@/components/providers/NavigationProvider";
import { cn } from "@/lib/utils";
import type { AxiosError } from "axios";
import { Eye, EyeOff, Cpu } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const { setIsLoading } = useNavigationLoader();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const login = useAuthStore((state) => state.login);
  const router = useRouter();

  const validateEmail = (email: string) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError("");
    setPasswordError("");

    let hasError = false;

    if (!username) {
      setEmailError("Email address is required");
      hasError = true;
    } else if (!validateEmail(username)) {
      setEmailError("Please enter a valid email address");
      hasError = true;
    }

    if (!password) {
      setPasswordError("Password is required");
      hasError = true;
    }

    if (hasError) return;

    setIsLoading(true);
    setIsSubmitting(true);

    try {
      const formData = new URLSearchParams();
      formData.append("username", username);
      formData.append("password", password);

      await api.post("/auth/login", formData, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      });

      const meRes = await api.get("/auth/me");

      login(meRes.data);
      router.push("/dashboard");
    } catch (err: unknown) {
      const detail = ((err as AxiosError<{ detail?: string }>)?.response?.data?.detail) || "Login failed";
      if (detail.toLowerCase().includes("username") || detail.toLowerCase().includes("password") || detail.toLowerCase().includes("incorrect")) {
        setEmailError(" ");
        setPasswordError(detail);
      } else {
        setPasswordError(detail);
      }
    } finally {
      setIsLoading(false);
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--ios-bg-secondary)" }}
    >
      {/* Top nav */}
      <nav className="flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm"
            style={{ background: "var(--brand-primary)" }}
          >
            <Cpu className="w-5 h-5 text-white" strokeWidth={2} />
          </div>
          <span className="text-[0.9375rem] font-bold tracking-tight" style={{ color: "var(--brand-navy)" }}>
            SDLC Architect AI
          </span>
        </div>
        <div className="flex items-center gap-6">
          <a
            href="#"
            className="hidden md:block text-sm font-medium transition-colors"
            style={{ color: "var(--brand-muted)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--brand-primary)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--brand-muted)")}
          >
            Documentation
          </a>
          <a
            href="#"
            className="hidden md:block text-sm font-medium transition-colors"
            style={{ color: "var(--brand-muted)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--brand-primary)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--brand-muted)")}
          >
            Enterprise
          </a>
        </div>
      </nav>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left — Branding */}
          <div className="hidden lg:flex flex-col space-y-10">
            <div className="space-y-5">
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full small font-semibold"
                style={{ background: "rgba(52,199,89,0.12)", color: "#1AA053" }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                All Systems Operational
              </div>
              <h1
                className="text-5xl font-bold tracking-tight leading-tight h1"
                style={{ color: "var(--brand-navy)", letterSpacing: "-0.03em" }}
              >
                Your intelligent software delivery workspace
              </h1>
              <p
                className="text-lg leading-relaxed font-normal"
                style={{ color: "var(--brand-muted)" }}
              >
                AI-powered SDLC acceleration for high-performance engineering teams. From BRD to test cases, streamlined.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-5">
              {[
                { icon: "📋", title: "BRD Studio", desc: "Automated business requirement generation from any context." },
                { icon: "⚙️", title: "FRS Engine", desc: "Functional mapping with predictive AI analysis." },
                { icon: "📦", title: "PRS Builder", desc: "Product specs structured and ready to ship." },
                { icon: "🧪", title: "QA Generator", desc: "Full test case and data suites, instantly." },
              ].map(f => (
                <div
                   key={f.title}
                   className="rounded-xl p-4"
                   style={{ background: "var(--ios-card-bg)", border: "1px solid var(--ios-separator)", boxShadow: "var(--ios-shadow-sm)" }}
                 >
                   <div className="text-2xl mb-2">{f.icon}</div>
                   <h3 className="small font-semibold h5" style={{ color: "var(--brand-navy)" }}>{f.title}</h3>
                   <p className="small mt-1 leading-relaxed" style={{ color: "var(--brand-muted)" }}>{f.desc}</p>
                 </div>
              ))}
            </div>
          </div>

          {/* Right — Login card */}
          <div className="flex justify-center lg:justify-end">
            <div
              className="w-full max-w-md rounded-xl p-8"
              style={{
                background: "var(--ios-card-bg)",
                border: "1px solid var(--ios-separator)",
                boxShadow: "var(--ios-shadow-lg)"
              }}
            >
              {/* Icon */}
              <div className="flex justify-center mb-6">
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center shadow-md"
                  style={{ background: "var(--brand-primary)" }}
                >
                  <Cpu className="w-8 h-8 text-white" strokeWidth={1.5} />
                </div>
              </div>

              <div className="text-center mb-8">
                <h2
                  className="text-2xl font-bold tracking-tight h3"
                  style={{ color: "var(--brand-navy)", letterSpacing: "-0.02em" }}
                >
                  Sign In
                </h2>
                <p className="small mt-1" style={{ color: "var(--brand-muted)" }}>
                  Access your SDLC workspace
                </p>
              </div>

              <form className="space-y-4" onSubmit={handleLogin} noValidate>
                {/* Email */}
                <div className="space-y-1.5">
                  <label
                    className="text-xs font-semibold uppercase tracking-wide ml-1"
                    style={{ color: "var(--brand-muted)" }}
                  >
                    Email Address
                  </label>
                  <input
                    className={cn("ios-input", emailError && emailError !== " " ? "error" : "")}
                    placeholder="you@example.com"
                    type="email"
                    autoComplete="email"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (emailError) setEmailError("");
                    }}
                  />
                  <div className="h-4">
                    {emailError && emailError !== " " && (
                      <p className="text-xs font-medium ml-1 animate-in fade-in slide-in-from-top-1 duration-200" style={{ color: "var(--brand-danger)" }}>
                        {emailError}
                      </p>
                    )}
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center ml-1">
                    <label
                      className="small font-semibold uppercase tracking-wide"
                      style={{ color: "var(--brand-muted)" }}
                    >
                      Password
                    </label>
                    <a
                      href="#"
                      className="small font-semibold"
                      style={{ color: "var(--brand-primary)" }}
                    >
                      Forgot Password?
                    </a>
                  </div>
                  <div className="relative">
                    <input
                      className={cn("ios-input pr-12", passwordError ? "error" : "")}
                      placeholder="••••••••"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (passwordError) setPasswordError("");
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors focus:outline-none"
                      style={{ color: "var(--brand-muted)" }}
                    >
                      {showPassword
                        ? <EyeOff className="w-4.5 h-4.5" />
                        : <Eye className="w-4.5 h-4.5" />
                      }
                    </button>
                  </div>
                  <div className="h-4">
                    {passwordError && (
                      <p className="text-xs font-medium ml-1 animate-in fade-in slide-in-from-top-1 duration-200" style={{ color: "var(--brand-danger)" }}>
                        {passwordError}
                      </p>
                    )}
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="ios-btn-primary w-full mt-2"
                  style={{ borderRadius: "4px" }}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <LoadingSpinner size="sm" color="#FFFFFF" className="mr-1" />
                      Signing in...
                    </span>
                  ) : "Sign In"}
                </button>

                <p className="text-center text-sm mt-4" style={{ color: "#8E8E93" }}>
                  New to the platform?{" "}
                  <a href="#" className="font-semibold" style={{ color: "#3a57e8" }}>
                    Request Access
                  </a>
                </p>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-8 py-6 flex flex-col md:flex-row justify-between items-center gap-3">
        <div className="flex items-center gap-6 small font-medium" style={{ color: "var(--brand-muted)" }}>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
            All Systems Nominal
          </div>
          <span>Latency: 24ms</span>
        </div>
        <p className="small" style={{ color: "var(--brand-muted)" }}>
          © 2024 MidnightArchitect AI · V2.4.1
        </p>
      </footer>
    </div>
  );
}
