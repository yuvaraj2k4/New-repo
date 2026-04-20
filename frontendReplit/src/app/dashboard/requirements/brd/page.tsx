"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { SmartUpload } from "@/components/ui/SmartUpload";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { marked } from 'marked';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Folder, FolderOpen, Trash2, ArrowRight,
  Sparkles, FileText, Download,
  AlertCircle, ChevronDown, CheckCircle2
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

const downloadAsDoc = (text: string, filename: string) => {
  const htmlContent = marked.parse(text);
  const htmlStr = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'>
    <style>
      body { font-family: 'Arial', sans-serif; line-height: 1.5; color: #1C1C1E; }
      h1 { color: #000; font-size: 24pt; margin-bottom: 12pt; border-bottom: 1px solid #C6C6C8; padding-bottom: 4pt; }
      h2 { color: #3a57e8; font-size: 18pt; margin-top: 18pt; margin-bottom: 10pt; }
      h3 { color: #1C1C1E; font-size: 14pt; margin-top: 14pt; margin-bottom: 8pt; }
      p { margin-bottom: 10pt; line-height: 1.6; }
      ul, ol { margin-bottom: 10pt; padding-left: 20pt; }
      li { margin-bottom: 5pt; }
      table { border-collapse: collapse; width: 100%; margin-bottom: 15pt; border: 1pt solid #C6C6C8; }
      th, td { border: 1pt solid #C6C6C8; padding: 8pt; text-align: left; }
      th { background: #F2F2F7; font-weight: bold; font-size: 10pt; color: #3C3C43; }
      blockquote { border-left: 3pt solid #3a57e8; padding-left: 10pt; color: #8E8E93; font-style: italic; }
      code { background-color: #F2F2F7; font-family: 'SF Mono', 'Menlo', monospace; font-size: 10pt; padding: 2pt 4pt; border-radius: 4px; }
    </style></head>
    <body style="padding: 0.5in;">${htmlContent}</body></html>`;
  const blob = new Blob(['\ufeff', htmlStr], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function BRDStudioPage() {
  const [projectId, setProjectId] = useState<string>("");
  const [contextText, setContextText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<string | null>(null);
  const [showSelector, setShowSelector] = useState(false);
  const closeTimeout = useRef<NodeJS.Timeout | null>(null);

  const errorRef = useRef<HTMLDivElement>(null);

  const [taskId, setTaskId] = useState<string | null>(null);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("IDLE");
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => { const res = await api.get("/projects/"); return res.data; }
  });

  const { data: historicalDocs, isLoading: docsLoading, refetch: refetchDocs } = useQuery({
    queryKey: ["historicalDocs", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const res = await api.get(`/documents/project/${projectId}`);
      // Filter to only show BRDs for this studio
      return res.data.filter((d: any) => d.doc_type === "brd");
    },
    enabled: !!projectId
  });

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (taskId && status === "POLLING") {
      interval = setInterval(async () => {
        try {
          const res = await api.get(`/documents/task/${taskId}/status`);
          const currentStatus = res.data.status;
          if (currentStatus === "SUCCESS") {
            try {
              const docRes = await api.get(`/documents/${activeDocId}?project_id=${projectId}`);
              setResult(docRes.data.content);
              setStatus("SUCCESS");
              refetchDocs();
            } catch { setStatus("ERROR"); }
            clearInterval(interval);
          } else if (currentStatus === "FAILURE") {
            setStatus("ERROR");
            setErrorMsg(res.data.error || "Generation failed.");
            clearInterval(interval);
          }
        } catch (err) { console.error("Polling error", err); }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [taskId, status]);

  useEffect(() => { if (errorMsg) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, [errorMsg]);
  useEffect(() => { setIsDeleteModalOpen(false); setDocToDelete(null); }, [projectId]);

  const deleteDocMutation = useMutation({
    mutationFn: async (docId: string) => { await api.delete(`/documents/${docId}?project_id=${projectId}`); },
    onSuccess: (_, deletedId) => {
      refetchDocs(); setIsDeleteModalOpen(false); setDocToDelete(null);
      if (activeDocId === deletedId) { setResult(""); setStatus("IDLE"); setActiveDocId(null); }
    }
  });

  const generateByTextMutation = useMutation({
    mutationFn: async () => {
      const docRes = await api.post(`/documents/project/${projectId}`, { title: "AI Generated BRD", doc_type: "brd", version: 1, content: "Initial BRD Outline" });
      const documentId = docRes.data.id;
      const genRes = await api.post(`/documents/${documentId}/generate/${projectId}`, { context_text: contextText });
      return genRes.data;
    },
    onSuccess: (data) => { setTaskId(data.task_id); setActiveDocId(data.document_id); setStatus("POLLING"); },
    onError: (err: any) => { setStatus("ERROR"); setErrorMsg(err.response?.data?.detail || "Failed to trigger generation."); }
  });

  const generateByFileMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("file", selectedFile as File);
      formData.append("title", selectedFile?.name || "Uploaded BRD Source");
      const res = await api.post(`/documents/project/${projectId}/generate-brd-from-file`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      return res.data;
    },
    onSuccess: (data) => { setTaskId(data.task_id); setActiveDocId(data.document_id); setStatus("POLLING"); },
    onError: (err: any) => { setStatus("ERROR"); setErrorMsg(err.response?.data?.detail || "Failed to trigger generation."); }
  });

  const handleGenerate = () => {
    if (!projectId) { setErrorMsg("Please select a target project first."); return; }
    setErrorMsg("");
    if (selectedFile) { setStatus("POLLING"); generateByFileMutation.mutate(); }
    else if (contextText.trim()) { setStatus("POLLING"); generateByTextMutation.mutate(); }
    else { setErrorMsg("Please either upload a document or provide context text."); }
  };

  const isGenerating = status === "POLLING" || generateByTextMutation.isPending || generateByFileMutation.isPending;

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="ios-main-heading">BRD Studio</h1>
          <p className="ios-page-description">Generate professional Business Requirement Documents with AI.</p>
        </div>

        {/* Project selector */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--brand-muted)" }}>Select Project</span>
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
              <span>{projects?.find((p: any) => String(p.id) === String(projectId))?.name || "Select Project…"}</span>
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
              {projects?.map((p: any) => (
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
        {/* Error */}
        {errorMsg && (
          <div ref={errorRef} className="flex items-center gap-3 p-4 rounded text-sm font-medium animate-in fade-in slide-in-from-top-2"
            style={{ background: "rgba(255,59,48,0.07)", border: "1px solid rgba(255,59,48,0.2)", color: "var(--brand-danger)" }}>
            <AlertCircle className="w-4 h-4 shrink-0" />
            {typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg)}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left */}
          <div className="flex flex-col gap-5">
            {/* Source Input */}
            <div
              className="rounded-xl p-5"
              style={{ background: "#FFFFFF", border: "1px solid var(--ios-separator)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
            >
              <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--brand-muted)" }}>Source Document</p>
              <SmartUpload selectedFile={selectedFile} onFileSelect={setSelectedFile} />
            </div>

            {/* History */}
            <div
              className="rounded-xl flex flex-col flex-1 min-h-[280px]"
              style={{ background: "#FFFFFF", border: "1px solid var(--ios-separator)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
            >
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--brand-muted)" }}>History</p>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(58, 87, 232, 0.08)", color: "var(--brand-primary)" }}
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
                    <LoadingSpinner size="md" color="#3a57e8" />
                  </div>
                ) : historicalDocs?.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-center">
                    <FolderOpen className="w-8 h-8 mb-2" style={{ color: "#D1D1D6" }} />
                    <p className="text-xs" style={{ color: "#C7C7CC" }}>No artifacts yet</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {historicalDocs.map((doc: any) => (
                      <div
                        key={doc.id}
                        onClick={() => { setResult(doc.content); setStatus("SUCCESS"); setActiveDocId(doc.id); }}
                        className="flex items-center gap-3 p-3 rounded-xl cursor-pointer group transition-all"
                        style={{
                          background: activeDocId === doc.id ? "rgba(0,122,255,0.08)" : "transparent",
                          border: activeDocId === doc.id ? "1px solid rgba(0,122,255,0.2)" : "1px solid transparent"
                        }}
                        onMouseEnter={e => { if (activeDocId !== doc.id) (e.currentTarget as HTMLElement).style.background = "#E5E5EA"; }}
                        onMouseLeave={e => { if (activeDocId !== doc.id) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                      >
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: activeDocId === doc.id ? "rgba(0,122,255,0.15)" : "#E5E5EA" }}
                        >
                          <FileText className="w-4 h-4" style={{ color: activeDocId === doc.id ? "#3a57e8" : "#8E8E93" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12.5px] font-semibold truncate" style={{ color: "var(--brand-navy)" }}>{doc.title}</p>
                          <p className="text-[10.5px] mt-0.5" style={{ color: "var(--brand-muted)" }}>
                            {new Date(doc.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={e => { e.stopPropagation(); setDocToDelete(doc.id); setIsDeleteModalOpen(true); }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
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

          {/* Right */}
          <div
            className="rounded-xl flex flex-col"
            style={{ background: "#FFFFFF", border: "1px solid var(--ios-separator)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
          >
            <div className="px-5 pt-5 pb-3">
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--brand-muted)" }}>Synthesis Context</p>
              <p className="small mt-0.5" style={{ color: "var(--brand-navy)" }}>Provide context for generation</p>
            </div>
            <div className="flex-1 px-5 pb-0">
              <textarea
                value={contextText}
                onChange={(e) => setContextText(e.target.value)}
                disabled={!!selectedFile}
                className={cn("w-full rounded p-4 text-[14px] leading-relaxed resize-none focus:outline-none transition-all min-h-[280px]", selectedFile ? "opacity-50 cursor-not-allowed" : "")}
                style={{
                  background: "#EBEBF0",
                  border: "1px solid transparent",
                  color: "var(--brand-navy)",
                  fontFamily: "inherit"
                }}
                onFocus={e => { e.currentTarget.style.border = "1px solid var(--brand-primary)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(58, 87, 232, 0.12)"; }}
                onBlur={e => { e.currentTarget.style.border = "1px solid transparent"; e.currentTarget.style.boxShadow = ""; }}
                placeholder={selectedFile ? "Using file as context source." : "Describe the business requirements, target audience, and any architectural constraints…"}
              />
            </div>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderTop: "1px solid #E5E5EA" }}>
              <div className="flex gap-2">
                <button className="ios-tag" disabled={!!selectedFile}>FinTech</button>
                <button className="ios-tag" disabled={!!selectedFile}>Formal</button>
              </div>
              <button
                onClick={handleGenerate}
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
                    "Generate BRD"
                  )}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Output Canvas */}
        <div
          className="rounded-xl overflow-hidden flex flex-col min-h-[480px]"
          style={{ background: "#FFFFFF", border: "1px solid var(--ios-separator)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
        >
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--ios-separator)" }}>
            <div>
              <h3 className="text-[14px] font-semibold" style={{ color: "var(--brand-navy)" }}>Output Canvas</h3>
              <p className="small mt-0.5" style={{ color: "var(--brand-muted)" }}>
                {status === "SUCCESS" ? "Document generated successfully" : "Awaiting generation…"}
              </p>
            </div>
            {status === "SUCCESS" && (
              <button
                onClick={() => downloadAsDoc(result, "Architect_BRD_Output")}
                className="ios-btn-interactive"
                style={{ fontSize: "0.8125rem", height: "32px" }}
              >
                <span>
                  <Download className="w-3.5 h-3.5" />
                  Export DOCX
                </span>
              </button>
            )}
          </div>

          <div className="flex-1 relative p-6">
            {status === "IDLE" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                <div className="w-14 h-14 rounded flex items-center justify-center mb-4" style={{ background: "#F2F2F7" }}>
                  <FileText className="w-7 h-7" style={{ color: "#C7C7CC" }} />
                </div>
                <h4 className="text-base font-semibold" style={{ color: "var(--brand-navy)" }}>Awaiting Context</h4>
                <p className="small mt-1.5" style={{ color: "var(--brand-muted)" }}>Provide inputs above to begin generation.</p>
              </div>
            )}

            {status === "POLLING" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                <div className="relative w-14 h-14 mb-5 flex items-center justify-center">
                  <LoadingSpinner size="lg" color="#3a57e8" />
                </div>
                <h4 className="text-base font-semibold" style={{ color: "#1C1C1E" }}>Generating BRD</h4>
                <p className="text-sm mt-1.5" style={{ color: "#8E8E93" }}>Analyzing and structuring requirements…</p>
              </div>
            )}

            {status === "SUCCESS" && (
              <div>
                <div className="flex items-center gap-2 mb-5 pb-4" style={{ borderBottom: "1px solid var(--ios-separator)" }}>
                  <CheckCircle2 className="w-4.5 h-4.5" style={{ color: "var(--brand-success)" }} />
                  <span className="text-[13px] font-semibold" style={{ color: "var(--brand-success)" }}>BRD Generated</span>
                </div>
                <div className="prose max-w-none" style={{ color: "var(--brand-navy)" }}>
                  {typeof result === 'string' ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
                  ) : (
                    <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(result, null, 2)}</pre>
                  )}
                </div>
              </div>
            )}

            {status === "ERROR" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: "rgba(255,59,48,0.08)" }}>
                  <AlertCircle className="w-7 h-7" style={{ color: "#FF3B30" }} />
                </div>
                <h4 className="text-base font-semibold" style={{ color: "#1C1C1E" }}>Generation Failed</h4>
                <p className="text-sm mt-1.5" style={{ color: "#8E8E93" }}>Please check your configuration and try again.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-xl" style={{ background: "#FFFFFF", border: "none", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
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
              onClick={() => docToDelete && deleteDocMutation.mutate(docToDelete)}
              disabled={deleteDocMutation.isPending}
            >
              {deleteDocMutation.isPending ? <LoadingSpinner size="sm" className="mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
