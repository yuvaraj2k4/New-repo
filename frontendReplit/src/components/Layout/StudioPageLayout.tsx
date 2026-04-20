"use client";

import React, { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { SmartUpload } from "@/components/ui/SmartUpload";
import { Folder, FolderOpen, Trash2, ArrowRight, Sparkles, FileText, AlertCircle, CheckCircle2, ChevronDown, Download } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface HistoricalDoc {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

interface Project {
  id: string;
  name: string;
}

interface StudioPageLayoutProps {
  title: string;
  subtitle: string;
  accentColor?: string;
  projects: Project[] | undefined;
  projectId: string;
  setProjectId: (id: string) => void;
  historicalDocs: HistoricalDoc[] | undefined;
  docsLoading: boolean;
  activeDocId: string | null;
  onDocSelect: (doc: HistoricalDoc) => void;
  onDocDelete: (id: string) => void;
  selectedFile: File | null;
  onFileSelect: (f: File | null) => void;
  accept?: string;
  contextText: string;
  setContextText: (t: string) => void;
  contextPlaceholder?: string;
  quickTags: { label: string; icon?: string }[];
  isGenerating: boolean;
  onGenerate: () => void;
  generateLabel?: string;
  status: string;
  result: any;
  errorMsg: string;
  errorRef: React.RefObject<HTMLDivElement | null>;
  isDeleteModalOpen: boolean;
  setIsDeleteModalOpen: (v: boolean) => void;
  docToDelete: string | null;
  onDeleteConfirm: () => void;
  deleteIsPending: boolean;
  outputTitle?: string;
  outputSuccessLabel?: string;
  onExport?: () => void;
  exportLabel?: string;
  children?: React.ReactNode;
}

export function StudioPageLayout({
  title,
  subtitle,
  accentColor = "#3a57e8",
  projects,
  projectId,
  setProjectId,
  historicalDocs,
  docsLoading,
  activeDocId,
  onDocSelect,
  onDocDelete,
  selectedFile,
  onFileSelect,
  accept,
  contextText,
  setContextText,
  contextPlaceholder,
  quickTags,
  isGenerating,
  onGenerate,
  generateLabel = "Generate",
  status,
  result,
  errorMsg,
  errorRef,
  isDeleteModalOpen,
  setIsDeleteModalOpen,
  docToDelete,
  onDeleteConfirm,
  deleteIsPending,
  outputTitle = "Output Canvas",
  outputSuccessLabel = "Generated Successfully",
  onExport,
  exportLabel = "Export",
  children,
}: StudioPageLayoutProps) {
  const [showSelector, setShowSelector] = useState(false);
  const closeTimeout = useRef<NodeJS.Timeout | null>(null);

  return (
    <div className="flex-1 flex flex-col">
      {/* Page Header */}
      <div className="px-6 pt-6 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="ios-main-heading">{title}</h1>
          <p className="ios-page-description">{subtitle}</p>
        </div>

        {/* Project Selector */}
        <div className="flex items-center gap-3 shrink-0 ml-auto">
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--brand-muted)" }}>Select Project</span>
          <div 
            className={cn("ios-select", showSelector ? "show" : "")}
            onMouseEnter={() => {
              if (closeTimeout.current) clearTimeout(closeTimeout.current);
              setShowSelector(true);
            }}
            onMouseLeave={() => {
              closeTimeout.current = setTimeout(() => setShowSelector(false), 150);
            }}
          >
            <div className="ios-selected">
              <span>{projects?.find((p) => String(p.id) === String(projectId))?.name || "Select Project…"}</span>
              <ChevronDown className="ios-arrow" />
            </div>
            <div className={cn("ios-options custom-scrollbar max-h-60 overflow-y-auto", showSelector ? "show" : "")}>
              <div 
                className={cn("ios-option", !projectId ? "active" : "")} 
                onClick={() => { setProjectId(""); setShowSelector(false); }}
              >
                <Folder className="w-3.5 h-3.5 shrink-0" />
                <span>None</span>
              </div>
              {projects?.map((p) => (
                <div
                  key={p.id}
                  className={cn("ios-option", String(p.id) === String(projectId) ? "active" : "")}
                  onClick={() => { setProjectId(p.id); setShowSelector(false); }}
                >
                  <FolderOpen className="w-3.5 h-3.5 shrink-0" />
                  <span>{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 px-6 pb-12 space-y-5">
        {/* Error Banner */}
        {errorMsg && (
          <div
            ref={errorRef as React.RefObject<HTMLDivElement>}
            className="flex items-center gap-3 p-4 rounded text-sm font-medium animate-in fade-in slide-in-from-top-2"
            style={{ background: "rgba(255,59,48,0.07)", border: "1px solid rgba(255,59,48,0.2)", color: "var(--brand-danger)" }}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            {typeof errorMsg === "string" ? errorMsg : JSON.stringify(errorMsg)}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left Panel */}
          <div className="flex flex-col gap-5">
            {/* Source Input */}
            <div
              className="rounded-xl p-5"
              style={{ background: "var(--ios-card-bg)", border: "1px solid var(--ios-separator)", boxShadow: "var(--ios-shadow-sm)" }}
            >
              <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--brand-muted)" }}>Source Document</p>
              <SmartUpload selectedFile={selectedFile} onFileSelect={onFileSelect} accept={accept} />
            </div>

            {/* History */}
            <div
              className="rounded-xl flex flex-col flex-1 min-h-[280px]"
              style={{ background: "var(--ios-card-bg)", border: "1px solid var(--ios-separator)", boxShadow: "var(--ios-shadow-sm)" }}
            >
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--brand-muted)" }}>History</p>
                <span
                  className="small font-bold px-2 py-0.5 rounded-full"
                  style={{ background: `${accentColor}14`, color: "var(--brand-primary)" }}
                >
                  {historicalDocs?.length || 0}
                </span>
              </div>
              <div className="flex-1 px-3 pb-3 overflow-y-auto custom-scrollbar">
                {!projectId ? (
                  <div className="flex flex-col items-center justify-center h-32 text-center">
                    <Folder className="w-8 h-8 mb-2" style={{ color: "#D1D1D6" }} />
                    <p className="text-xs" style={{ color: "#C7C7CC" }}>Select a project to view history</p>
                  </div>
                ) : docsLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <LoadingSpinner size="md" color={accentColor} />
                  </div>
                ) : historicalDocs?.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-center">
                    <FolderOpen className="w-8 h-8 mb-2" style={{ color: "#D1D1D6" }} />
                    <p className="text-xs" style={{ color: "#C7C7CC" }}>No artifacts yet</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {historicalDocs?.map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() => onDocSelect(doc)}
                        className="flex items-center gap-3 p-3 rounded-lg cursor-pointer group transition-all"
                        style={{
                          background: activeDocId === doc.id ? `${accentColor}0D` : "transparent",
                          border: activeDocId === doc.id ? `1px solid ${accentColor}33` : "1px solid transparent"
                        }}
                        onMouseEnter={e => { if (activeDocId !== doc.id) (e.currentTarget as HTMLElement).style.background = "#F5F6FA"; }}
                        onMouseLeave={e => { if (activeDocId !== doc.id) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                      >
                        <div
                          className="w-8 h-8 rounded flex items-center justify-center shrink-0"
                          style={{ background: activeDocId === doc.id ? `${accentColor}1A` : "#F5F6FA" }}
                        >
                          <FileText className="w-4 h-4" style={{ color: activeDocId === doc.id ? accentColor : "#8A92A6" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[0.8rem] font-semibold truncate" style={{ color: "var(--brand-navy)" }}>{doc.title}</p>
                          <p className="small mt-0.5" style={{ color: "var(--brand-muted)" }}>
                            {new Date(doc.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={e => { e.stopPropagation(); onDocDelete(doc.id); }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                            style={{ color: "#C7C7CC" }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#FF3B30"; (e.currentTarget as HTMLElement).style.background = "rgba(255,59,48,0.08)"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#C7C7CC"; (e.currentTarget as HTMLElement).style.background = ""; }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <ArrowRight className="w-3.5 h-3.5" style={{ color: "#C7C7CC" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel */}
            <div
              className="rounded-xl flex flex-col"
              style={{ background: "var(--ios-card-bg)", border: "1px solid var(--ios-separator)", boxShadow: "var(--ios-shadow-sm)" }}
            >
            <div className="px-5 pt-5 pb-3">
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--brand-muted)" }}>Synthesis Context</p>
              <p className="small mt-0.5" style={{ color: "var(--brand-navy)" }}>Provide requirements context</p>
            </div>
            <div className="flex-1 px-5 pb-0">
              <textarea
                value={contextText}
                onChange={(e) => setContextText(e.target.value)}
                disabled={!!selectedFile}
                className={cn("w-full rounded p-4 text-sm leading-relaxed resize-none focus:outline-none transition-all min-h-[280px]", selectedFile ? "opacity-50 cursor-not-allowed" : "")}
                style={{ background: "var(--ios-bg-secondary)", border: "1px solid var(--ios-separator)", color: "var(--brand-navy)", fontFamily: "inherit" }}
                onFocus={e => { e.currentTarget.style.border = `1px solid var(--brand-primary)`; e.currentTarget.style.boxShadow = `0 0 0 3px rgba(58, 87, 232, 0.12)`; }}
                onBlur={e => { e.currentTarget.style.border = "1px solid transparent"; e.currentTarget.style.boxShadow = ""; }}
                placeholder={selectedFile ? "Using file as context source." : contextPlaceholder}
              />
            </div>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderTop: "1px solid var(--ios-separator)" }}>
              <div className="flex gap-2 flex-wrap">
                {quickTags.map(tag => (
                  <button key={tag.label} className="ios-tag" disabled={!!selectedFile}>{tag.label}</button>
                ))}
              </div>
              <button
                onClick={onGenerate}
                disabled={isGenerating}
                className="magic-btn shrink-0"
              >
                <span className="inner font-semibold">
                  {isGenerating ? (
                    <>
                      <LoadingSpinner size="sm" color="#FFFFFF" />
                      <span>Generating…</span>
                    </>
                  ) : (
                    <span>{generateLabel}</span>
                  )}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Output Canvas */}
        <div
          className="rounded-xl overflow-hidden flex flex-col min-h-[480px]"
          style={{ background: "var(--ios-card-bg)", border: "1px solid var(--ios-separator)", boxShadow: "var(--ios-shadow-sm)" }}
        >
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--ios-separator)" }}>
            <div>
              <h3 className="text-sm font-semibold h3" style={{ color: "var(--brand-navy)", fontSize: "16px" }}>{outputTitle}</h3>
              <p className="small mt-0.5" style={{ color: "var(--brand-muted)" }}>
                {status === "SUCCESS" ? (outputSuccessLabel || "Document generated successfully") : "Awaiting generation…"}
              </p>
            </div>
            {status === "SUCCESS" && onExport && (
              <button
                onClick={onExport}
                className="ios-btn-interactive"
                style={{ fontSize: "0.8125rem", height: "32px", padding: 0 }}
              >
                <span>
                  <Download className="w-3.5 h-3.5" />
                  {exportLabel}
                </span>
              </button>
            )}
          </div>

          <div className="flex-1 relative">
            {status === "IDLE" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4" style={{ background: "var(--ios-bg-secondary)" }}>
                  <FileText className="w-7 h-7" style={{ color: "#C7C7CC" }} />
                </div>
                <h4 className="text-base font-semibold" style={{ color: "var(--brand-navy)" }}>Awaiting Context</h4>
                <p className="small mt-1.5" style={{ color: "var(--brand-muted)" }}>{subtitle}</p>
              </div>
            )}

            {status === "POLLING" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                <div className="relative w-14 h-14 mb-5 flex items-center justify-center">
                  <LoadingSpinner size="lg" color="var(--brand-primary)" />
                </div>
                <h4 className="text-base font-semibold" style={{ color: "var(--brand-navy)" }}>Generating…</h4>
                <p className="small mt-1.5" style={{ color: "var(--brand-muted)" }}>Analyzing and structuring your document…</p>
              </div>
            )}

            {status === "ERROR" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: "rgba(255,59,48,0.08)" }}>
                  <AlertCircle className="w-7 h-7" style={{ color: "var(--brand-danger)" }} />
                </div>
                <h4 className="text-base font-semibold" style={{ color: "var(--brand-navy)" }}>Generation Failed</h4>
                <p className="small mt-1.5" style={{ color: "var(--brand-muted)" }}>Please check your configuration and try again.</p>
              </div>
            )}

            {status === "SUCCESS" && (
              <div className="p-6 overflow-y-auto">
                <div className="flex items-center gap-2 mb-5 pb-4" style={{ borderBottom: "1px solid var(--ios-separator)" }}>
                  <CheckCircle2 className="w-4 h-4" style={{ color: "var(--brand-success)" }} />
                  <span className="text-[0.8125rem] font-semibold" style={{ color: "var(--brand-success)" }}>
                    {outputSuccessLabel || "Document Generated"}
                  </span>
                </div>
                <div className="prose max-w-none" style={{ color: "var(--brand-navy)" }}>
                  {children ? children : typeof result === "string" ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
                  ) : (
                    <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(result, null, 2)}</pre>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-xl" style={{ background: "var(--ios-card-bg)", border: "none", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "var(--brand-navy)" }}>Delete Artifact?</DialogTitle>
            <DialogDescription className="pt-1" style={{ color: "var(--brand-muted)" }}>
              This action cannot be undone. The artifact will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-5 flex-col sm:flex-row gap-2">
            <Button variant="outline" className="rounded-xl w-full sm:w-auto" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              className="rounded-xl w-full sm:w-auto"
              onClick={onDeleteConfirm}
              disabled={deleteIsPending}
            >
              {deleteIsPending ? <LoadingSpinner size="sm" className="mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
