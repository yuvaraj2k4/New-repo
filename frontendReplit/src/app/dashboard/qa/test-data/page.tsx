"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { api } from "@/lib/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { StudioPageLayout } from "@/components/Layout/StudioPageLayout";

const downloadAsExcel = (markdownText: string, filename: string) => {
  const lines = markdownText.split("\n");
  const allRows: Record<string, string>[] = [];
  let headers: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;
    const withoutPipes = trimmed.replace(/\|/g, "").trim();
    if (/^[-:\s]+$/.test(withoutPipes)) continue;
    const cells = trimmed.split("|").slice(1, -1).map((c) => c.trim());
    const isHeader = cells.some((c) => c.toLowerCase().replace(/\s+/g, "") === "testdataid");
    if (isHeader) { headers = cells; continue; }
    if (headers.length > 0 && cells.length > 0) {
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = cells[i] ?? ""; });
      allRows.push(row);
    }
  }
  if (allRows.length === 0) { alert("No parsable test data table found."); return; }
  const ws = XLSX.utils.json_to_sheet(allRows);
  ws["!cols"] = [{ wch: 18 }, { wch: 48 }, { wch: 22 }, { wch: 26 }, { wch: 16 }, { wch: 36 }, { wch: 36 }, { wch: 30 }, { wch: 34 }, { wch: 48 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Test Data");
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

const sanitizeResult = (text: string): string => {
  if (!text) return text;
  return text.replace(/<br\s*\/?>/gi, " ").replace(/  +/g, " ");
};

export default function TestDataForgePage() {
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
    queryKey: ["historicalTdDocs", projectId],
    queryFn: async () => { if (!projectId) return []; const res = await api.get(`/documents/project/${projectId}`); return res.data.filter((doc: any) => doc.doc_type === "test_data_doc"); },
    enabled: !!projectId,
  });

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (taskId && status === "POLLING") {
      interval = setInterval(async () => {
        try {
          const res = await api.get(`/documents/task/${taskId}/status`);
          if (res.data.status === "SUCCESS") {
            try { const docRes = await api.get(`/documents/${activeDocId}?project_id=${projectId}`); setResult(docRes.data.content); setStatus("SUCCESS"); refetchDocs(); } catch { setStatus("ERROR"); setErrorMsg("Failed to retrieve the generated document."); }
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
    onSuccess: (_, deletedId) => { refetchDocs(); setIsDeleteModalOpen(false); setDocToDelete(null); if (activeDocId === deletedId) { setResult(null); setStatus("IDLE"); setActiveDocId(null); } },
  });

  const generateByTextMutation = useMutation({
    mutationFn: async () => {
      const docRes = await api.post(`/documents/project/${projectId}`, { title: "AI Generated Test Data", doc_type: "test_data_doc", version: 1, content: "Pending analysis..." });
      const genRes = await api.post(`/documents/${docRes.data.id}/generate-test-data-doc/${projectId}`, { context_text: contextText });
      return genRes.data;
    },
    onSuccess: (data) => { setTaskId(data.task_id); setActiveDocId(data.document_id); setStatus("POLLING"); },
    onError: (err: any) => { setStatus("ERROR"); setErrorMsg(err.response?.data?.detail || "Failed to trigger test data generation."); },
  });

  const generateByFileMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("file", selectedFile as File);
      formData.append("title", selectedFile?.name || "Uploaded Test Data Source");
      const res = await api.post(`/documents/project/${projectId}/generate-test-data-doc-from-file`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      return res.data;
    },
    onSuccess: (data) => { setTaskId(data.task_id); setActiveDocId(data.document_id); setStatus("POLLING"); },
    onError: (err: any) => { setStatus("ERROR"); setErrorMsg(err.response?.data?.detail || "Failed to trigger test data generation."); },
  });

  const handleGenerate = () => {
    if (!projectId) { setErrorMsg("Please select a target project first."); return; }
    setErrorMsg("");
    if (selectedFile) { setStatus("POLLING"); generateByFileMutation.mutate(); }
    else if (contextText.trim()) { setStatus("POLLING"); generateByTextMutation.mutate(); }
    else { setErrorMsg("Please either upload a document or provide context text."); }
  };

  const isGenerating = status === "POLLING" || generateByTextMutation.isPending || generateByFileMutation.isPending;
  const sanitizedResult = typeof result === "string" ? sanitizeResult(result) : result;

  return (
    <StudioPageLayout
      title="Test Data Generator"
      subtitle="Generate comprehensive, field-level test data covering valid, invalid, boundary and edge-case values."
      accentColor="#5a75f0"
      projects={projects}
      projectId={projectId}
      setProjectId={setProjectId}
      historicalDocs={historicalDocs}
      docsLoading={docsLoading}
      activeDocId={activeDocId}
      onDocSelect={(doc) => { setResult(doc.content); setStatus("SUCCESS"); setActiveDocId(doc.id); }}
      onDocDelete={(id) => { setDocToDelete(id); setIsDeleteModalOpen(true); }}
      selectedFile={selectedFile}
      onFileSelect={(file) => {
        if (file) {
          const ext = file.name.toLowerCase().split(".").pop();
          if (ext !== "txt" && ext !== "docx") { setErrorMsg("Only .txt and .docx files are supported."); return; }
          setErrorMsg("");
        }
        setSelectedFile(file);
      }}
      accept=".txt,.docx"
      contextText={contextText}
      setContextText={setContextText}
      contextPlaceholder={`Describe the system under test — modules, fields, input forms, API parameters, validation rules, data types, and business constraints.\n\nExample:\n• User Registration: username (3–50 chars), email, password (min 8 chars, 1 special)\n• Product Catalogue: price (decimal, ≥0), stock quantity (integer), SKU (alphanumeric)`}
      quickTags={[{ label: "Full Coverage" }, { label: "Boundary Focus" }]}
      isGenerating={isGenerating}
      onGenerate={handleGenerate}
      generateLabel="Generate Test Data"
      status={status}
      result={sanitizedResult}
      errorMsg={errorMsg}
      errorRef={errorRef}
      isDeleteModalOpen={isDeleteModalOpen}
      setIsDeleteModalOpen={setIsDeleteModalOpen}
      docToDelete={docToDelete}
      onDeleteConfirm={() => docToDelete && deleteDocMutation.mutate(docToDelete)}
      deleteIsPending={deleteDocMutation.isPending}
      outputTitle="Test Data Output"
      outputSuccessLabel="Test Data Generated Successfully"
      onExport={() => downloadAsExcel(typeof result === "string" ? result : "", "Architect_TestData")}
      exportLabel="Export Excel"
    >
      {typeof sanitizedResult === "string" ? (
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{sanitizedResult}</ReactMarkdown>
      ) : (
        <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(sanitizedResult, null, 2)}</pre>
      )}
    </StudioPageLayout>
  );
}
