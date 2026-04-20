"use client";

import React, { useRef } from "react";
import { cn } from "@/lib/utils";
import { Upload, CheckCircle2, X } from "lucide-react";

interface SmartUploadProps {
  selectedFile: File | null;
  onFileSelect: (file: File | null) => void;
  className?: string;
  accept?: string;
}

export const SmartUpload: React.FC<SmartUploadProps> = ({
  selectedFile,
  onFileSelect,
  className,
  accept = ".txt,.docx,.pdf",
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    onFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0] || null;
    onFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <div className={cn("relative w-full", className)}>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept={accept}
        onChange={handleFileChange}
      />

      <div
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="relative flex flex-col items-center justify-center cursor-pointer rounded-2xl transition-all duration-200 min-h-[180px] p-6 group"
        style={{
          background: selectedFile ? "rgba(var(--brand-success-rgb, 26, 160, 83), 0.05)" : "var(--ios-bg-secondary)",
          border: selectedFile
            ? "1.5px solid var(--brand-success)"
            : "1.5px dashed var(--ios-separator)",
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLDivElement;
          if (!selectedFile) {
            el.style.background = "var(--ios-hover-bg)";
            el.style.borderColor = "var(--brand-primary)";
          }
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLDivElement;
          if (!selectedFile) {
            el.style.background = "var(--ios-bg-secondary)";
            el.style.borderColor = "var(--ios-separator)";
          }
        }}
      >
        {/* Icon */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-200 group-hover:scale-105"
          style={{
            background: selectedFile ? "rgba(var(--brand-success-rgb, 26, 160, 83), 0.12)" : "var(--brand-soft-blue)",
          }}
        >
          {selectedFile ? (
            <CheckCircle2 className="w-7 h-7" style={{ color: "var(--brand-success)" }} strokeWidth={2} />
          ) : (
            <Upload className="w-7 h-7" style={{ color: "var(--brand-primary)" }} strokeWidth={1.75} />
          )}
        </div>

        {/* Label */}
        <div className="text-center">
          <h3
            className="text-sm font-semibold truncate max-w-[260px]"
            style={{ color: selectedFile ? "var(--brand-success)" : "var(--brand-navy)" }}
          >
            {selectedFile ? selectedFile.name : "Drop files here or tap to browse"}
          </h3>
          <p
            className="text-[0.7rem] font-medium mt-1.5 uppercase tracking-wider"
            style={{ color: "var(--brand-muted)" }}
          >
            {selectedFile ? "File ready for synthesis" : accept.split(",").join(" · ").toUpperCase()}
          </p>
        </div>

        {/* Remove button */}
        {selectedFile && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onFileSelect(null);
            }}
            className="absolute top-3 right-3 w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-110"
            style={{ background: "rgba(var(--brand-danger-rgb, 255, 59, 48), 0.08)", color: "var(--brand-danger)" }}
            title="Remove file"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
