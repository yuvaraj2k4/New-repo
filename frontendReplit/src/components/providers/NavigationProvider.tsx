"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface NavigationContextType {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const useNavigationLoader = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error("useNavigationLoader must be used within a NavigationProvider");
  }
  return context;
};

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Stop loading when pathname or searchParams change
  useEffect(() => {
    setIsLoading(false);
  }, [pathname, searchParams]);

  // Handle click events on <a> tags to detect navigation start
  useEffect(() => {
    const handleAnchorClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const anchor = target.closest("a");

      if (
        anchor &&
        anchor instanceof HTMLAnchorElement &&
        anchor.href &&
        anchor.target !== "_blank" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.shiftKey &&
        !event.altKey &&
        anchor.origin === window.location.origin &&
        anchor.pathname !== pathname // Only show if it's a new path
      ) {
        setIsLoading(true);
      }
    };

    document.addEventListener("click", handleAnchorClick);
    return () => document.removeEventListener("click", handleAnchorClick);
  }, [pathname]);

  // Safety timeout: hide loader after 10 seconds if navigation hangs
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (isLoading) {
      timeoutId = setTimeout(() => {
        setIsLoading(false);
      }, 10000);
    }
    return () => clearTimeout(timeoutId);
  }, [isLoading]);

  return (
    <NavigationContext.Provider value={{ isLoading, setIsLoading }}>
      {children}
      {isLoading && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/60 animate-in fade-in duration-200">
          <LoadingSpinner size="lg" color="#3a57e8" />
        </div>
      )}
    </NavigationContext.Provider>
  );
}
