"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  color?: string;
}

export const LoadingSpinner = ({ 
  size = "md", 
  className,
  color
}: LoadingSpinnerProps) => {
  const sizeClass = {
    sm: "ios-loader-sm",
    md: "ios-loader-md",
    lg: "ios-loader-lg",
  }[size];

  return (
    <div 
      className={cn("ios-loader", sizeClass, className)} 
      style={color ? { color } : undefined}
    >
      <div className="bar1"></div>
      <div className="bar2"></div>
      <div className="bar3"></div>
      <div className="bar4"></div>
      <div className="bar5"></div>
      <div className="bar6"></div>
      <div className="bar7"></div>
      <div className="bar8"></div>
      <div className="bar9"></div>
      <div className="bar10"></div>
      <div className="bar11"></div>
      <div className="bar12"></div>
    </div>
  );
};
