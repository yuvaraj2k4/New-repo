"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { marked } from "marked";
import { StudioPageLayout } from "@/components/Layout/StudioPageLayout";

const downloadAsDoc = (text: string, filename: string) => {
  const htmlContent = marked.parse(text);
  const htmlStr = `<html><head><meta charset='utf-8'><style>body{font-family:'Arial',sans-serif;line-height:1.5;color:#1C1C1E;}h1{color:#000;font-size:22pt;border-bottom:1px solid #C6C6C8;}h2{color:#3a57e8;font-size:16pt;}table{border-collapse:collapse;width:100%;}th,td{border:1pt solid #C6C6C8;padding:6pt;}th{background:#F2F2F7;font-weight:bold;}</style></head><body style="padding:0.5in;">${htmlContent}</body></html>`;
  const blob = new Blob(["\ufeff", htmlStr], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function FRSStudioPage() {
  const [projectId, setProjectId] = useState<string>("");
  const [contextText, setContextText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("IDLE");
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const { data: projects } = useQuery({ queryKey: ["projects"], queryFn: async () => { const res = await api.get("/projects/"); return res.data; } });
  const { data: historicalDocs, isLoading: docsLoading, refetch: refetchDocs } = useQuery({
    queryKey: ["historicalFrsDocs", projectId],
    queryFn: async () => { if (!projectId) return []; const res = await api.get(`/documents/project/${projectId}`); return res.data.filter((doc: any) => doc.doc_type === "frs"); },
    enabled: !!projectId,
  });

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (taskId && status === "POLLING") {
      interval = setInterval(async () => {
        try {
          const res = await api.get(`/documents/task/${taskId}/status`);
          if (res.data.status === "SUCCESS") {
            try { const docRes = await api.get(`/documents/${activeDocId}?project_id=${projectId}`); setResult(docRes.data.content); setStatus("SUCCESS"); refetchDocs(); } catch { setStatus("ERROR"); }
            clearInterval(interval);
          } else if (res.data.status === "FAILURE") { setStatus("ERROR"); setErrorMsg(res.data.error || "Generation failed."); clearInterval(interval); }
        } catch (err) { console.error("Polling error", err); }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [taskId, status]);

  useEffect(() => { if (errorMsg) errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }, [errorMsg]);
  useEffect(() => { setIsDeleteModalOpen(false); setDocToDelete(null); }, [projectId]);

  const deleteDocMutation = useMutation({
    mutationFn: async (docId: string) => { await api.delete(`/documents/${docId}?project_id=${projectId}`); },
    onSuccess: (_, deletedId) => { refetchDocs(); setIsDeleteModalOpen(false); setDocToDelete(null); if (activeDocId === deletedId) { setResult(""); setStatus("IDLE"); setActiveDocId(null); } },
  });

  const generateByTextMutation = useMutation({
    mutationFn: async () => {
      const docRes = await api.post(`/documents/project/${projectId}`, { title: "AI Generated FRS", doc_type: "frs", version: 1, content: "Initial FRS Outline" });
      const genRes = await api.post(`/documents/${docRes.data.id}/generate-frs?project_id=${projectId}`, { context_text: contextText });
      return genRes.data;
    },
    onSuccess: (data) => { setTaskId(data.task_id); setActiveDocId(data.document_id); setStatus("POLLING"); },
    onError: (err: any) => { setStatus("ERROR"); setErrorMsg(err.response?.data?.detail || "Failed to trigger FRS generation."); },
  });

  const generateByFileMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("file", selectedFile as File);
      formData.append("title", selectedFile?.name || "Uploaded FRS Source");
      const res = await api.post(`/documents/project/${projectId}/generate-frs-from-file`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      return res.data;
    },
    onSuccess: (data) => { setTaskId(data.task_id); setActiveDocId(data.document_id); setStatus("POLLING"); },
    onError: (err: any) => { setStatus("ERROR"); setErrorMsg(err.response?.data?.detail || "Failed to trigger FRS generation."); },
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
    <StudioPageLayout
      title="FRS Studio"
      subtitle="Transform system requirements into structured Functional Requirement Specifications."
      accentColor="#5856D6"
      projects={projects}
      projectId={projectId}
      setProjectId={setProjectId}
      historicalDocs={historicalDocs}
      docsLoading={docsLoading}
      activeDocId={activeDocId}
      onDocSelect={(doc) => { setResult(doc.content); setStatus("SUCCESS"); setActiveDocId(doc.id); }}
      onDocDelete={(id) => { setDocToDelete(id); setIsDeleteModalOpen(true); }}
      selectedFile={selectedFile}
      onFileSelect={setSelectedFile}
      contextText={contextText}
      setContextText={setContextText}
      contextPlaceholder="Describe the system scope, modules, user roles, integration points, and compliance or performance requirements…"
      quickTags={[{ label: "System" }, { label: "Formal" }]}
      isGenerating={isGenerating}
      onGenerate={handleGenerate}
      generateLabel="Generate FRS"
      status={status}
      result={result}
      errorMsg={errorMsg}
      errorRef={errorRef}
      isDeleteModalOpen={isDeleteModalOpen}
      setIsDeleteModalOpen={setIsDeleteModalOpen}
      docToDelete={docToDelete}
      onDeleteConfirm={() => docToDelete && deleteDocMutation.mutate(docToDelete)}
      deleteIsPending={deleteDocMutation.isPending}
      outputSuccessLabel="FRS Generated Successfully"
      onExport={() => downloadAsDoc(result, "Architect_FRS_Output")}
      exportLabel="Export DOCX"
    />
  );
}
