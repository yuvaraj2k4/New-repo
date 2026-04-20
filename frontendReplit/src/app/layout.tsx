import type { Metadata } from "next";
import "./globals.css";
import React from "react";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { NavigationProvider } from "@/components/providers/NavigationProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "MidnightArchitect AI",
  description: "AI-Powered SDLC Automation Workspace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <QueryProvider>
            <React.Suspense fallback={null}>
              <NavigationProvider>
                {children}
              </NavigationProvider>
            </React.Suspense>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
