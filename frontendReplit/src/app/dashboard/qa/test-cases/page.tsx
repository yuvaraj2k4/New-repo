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
    const isHeader = cells.some((c) => c.toLowerCase().replace(/\s+/g, "") === "testcaseid");
    if (isHeader) { headers = cells; continue; }
    if (headers.length > 0 && cells.length > 0) {
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = cells[i] ?? ""; });
      allRows.push(row);
    }
  }
  if (allRows.length === 0) { alert("No parsable test case table data found."); return; }
  const ws = XLSX.utils.json_to_sheet(allRows);
  ws["!cols"] = [{ wch: 18 }, { wch: 42 }, { wch: 24 }, { wch: 48 }, { wch: 36 }, { wch: 55 }, { wch: 32 }, { wch: 48 }, { wch: 20 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Test Cases");
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

const sanitizeResult = (text: string): string => {
  if (!text) return text;
  return text.replace(/<br\s*\/?>/gi, " ").replace(/  +/g, " ");
};

const StepCell = ({ children, ...props }: React.TdHTMLAttributes<HTMLTableCellElement> & { children?: React.ReactNode }) => {
  const text = typeof children === "string" ? children : "";
  const stepPattern = /^1\.\s.+?(\s+\d+\.\s.+)+$/;
  if (stepPattern.test(text.trim())) {
    const steps = text.trim().split(/(?=\s*\d+\.\s)/).map(s => s.replace(/^\s*\d+\.\s*/, "").trim()).filter(Boolean);
    return (
      <td {...props} style={{ verticalAlign: "top", padding: "8px 12px" }}>
        <ol style={{ margin: 0, paddingLeft: "1.2em", listStyleType: "decimal" }}>
          {steps.map((step, i) => <li key={i} style={{ marginBottom: i < steps.length - 1 ? "4px" : 0, lineHeight: "1.5" }}>{step}</li>)}
        </ol>
      </td>
    );
  }
  return <td {...props}>{children}</td>;
};

export default function TestCaseGeneratorPage() {
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
    queryKey: ["historicalTcDocs", projectId],
    queryFn: async () => { if (!projectId) return []; const res = await api.get(`/documents/project/${projectId}`); return res.data.filter((doc: any) => doc.doc_type === "test_case"); },
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
      const docRes = await api.post(`/documents/project/${projectId}`, { title: "AI Generated Test Cases", doc_type: "test_case", version: 1, content: "Pending analysis..." });
      const genRes = await api.post(`/documents/${docRes.data.id}/generate-test-case-doc/${projectId}`, { context_text: contextText });
      return genRes.data;
    },
    onSuccess: (data) => { setTaskId(data.task_id); setActiveDocId(data.document_id); setStatus("POLLING"); },
    onError: (err: any) => { setStatus("ERROR"); setErrorMsg(err.response?.data?.detail || "Failed to trigger test case generation."); },
  });

  const generateByFileMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("file", selectedFile as File);
      formData.append("title", selectedFile?.name || "Uploaded Test Source");
      const res = await api.post(`/documents/project/${projectId}/generate-test-case-doc-from-file`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      return res.data;
    },
    onSuccess: (data) => { setTaskId(data.task_id); setActiveDocId(data.document_id); setStatus("POLLING"); },
    onError: (err: any) => { setStatus("ERROR"); setErrorMsg(err.response?.data?.detail || "Failed to trigger test case generation."); },
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
      title="Test Case Generator"
      subtitle="Transform BRD, FRS, or any specification into a comprehensive, module-wise test suite."
      accentColor="#34C759"
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
      contextPlaceholder="Describe the system under test — modules, user roles, workflows, API endpoints, business rules, and edge conditions to cover…"
      quickTags={[{ label: "Full Coverage" }, { label: "Risk-Based" }]}
      isGenerating={isGenerating}
      onGenerate={handleGenerate}
      generateLabel="Generate Test Cases"
      status={status}
      result={sanitizedResult}
      errorMsg={errorMsg}
      errorRef={errorRef}
      isDeleteModalOpen={isDeleteModalOpen}
      setIsDeleteModalOpen={setIsDeleteModalOpen}
      docToDelete={docToDelete}
      onDeleteConfirm={() => docToDelete && deleteDocMutation.mutate(docToDelete)}
      deleteIsPending={deleteDocMutation.isPending}
      outputTitle="Test Suite Output"
      outputSuccessLabel="Test Cases Generated Successfully"
      onExport={() => downloadAsExcel(typeof result === "string" ? result : "", "Architect_TestCases")}
      exportLabel="Export Excel"
    >
      {typeof sanitizedResult === "string" ? (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{ td: StepCell as any }}
        >
          {sanitizedResult}
        </ReactMarkdown>
      ) : (
        <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(sanitizedResult, null, 2)}</pre>
      )}
    </StudioPageLayout>
  );
}
