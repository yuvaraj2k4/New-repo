"use client";

import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, setUser, logout } = useAuthStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    let isActive = true;
    const bootstrapSession = async () => {
      setMounted(true);
      try {
        const meRes = await api.get("/auth/me");
        if (isActive) {
          setUser(meRes.data);
        }
      } catch {
        if (isActive) {
          logout();
          router.replace("/login");
        }
      } finally {
        if (isActive) {
          setIsCheckingAuth(false);
        }
      }
    };

    bootstrapSession();
    return () => {
      isActive = false;
    };
  }, [logout, router, setUser]);

  useEffect(() => {
    if (!isCheckingAuth && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isCheckingAuth, router]);

  if (!mounted) return null;

  if (isCheckingAuth) {
    return (
      <div
        className="flex h-screen items-center justify-center"
        style={{ background: "#F2F2F7" }}
      >
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner size="lg" color="#8E8E93" />
          <p className="text-sm font-medium" style={{ color: "#8E8E93" }}>Loading workspace…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "#EBEBF0", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif" }}
    >
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
