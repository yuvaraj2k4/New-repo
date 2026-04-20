"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { FileUp, FileText, Sparkles, AlertCircle } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import ReactMarkdown from "react-markdown";

export default function BRDPage({ params }: { params: { id: string } }) {
  const [contextText, setContextText] = useState("");
  const projectId = params.id;

  // Ideally fetch the related document for this project
  const { data: docs, refetch } = useQuery({
    queryKey: ["documents", projectId],
    queryFn: async () => {
      const res = await api.get(`/documents/?project_id=${projectId}`);
      // Usually would find the specific BRD document, assuming the first one for now
      return res.data;
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      // Create a doc placeholder then kick off generation task
      const docRes = await api.post("/documents/", {
        title: "Generated BRD",
        doc_type: "brd",
        project_id: projectId
      });
      const docId = docRes.data.id;
      
      // Trigger extraction
      await api.post(`/documents/${docId}/generate-brd`, {
        context_text: contextText,
      });
      return docId;
    },
    onSuccess: () => {
      setContextText("");
      // refetch occasionally polling for completion in a real app
      refetch();
      alert("BRD Generation triggered! Check back in a few seconds.");
    }
  });

  const brdDoc = docs?.find((d: any) => d.doc_type === "brd");

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900" style={{ letterSpacing: "-0.02em" }}>Business Requirements (BRD)</h2>
          <p className="text-sm text-slate-500 mt-1">Refine and structure your project scope with AI-assisted drafting.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Context Input Panel */}
        <div className="flex flex-col bg-white border border-[#E5E5EA] rounded-[4px] p-6 shadow-ambient-sm">
          <div className="flex items-center mb-4 text-slate-900">
            <FileUp className="w-5 h-5 mr-2 text-[#3a57e8]" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Raw Context Source</h3>
          </div>
          
          <textarea
            className="w-full flex-1 min-h-[300px] p-4 bg-[#FAFAFA] border border-[#E5E5EA] rounded-[4px] text-slate-900 text-sm focus:outline-none focus:border-[#3a57e8] focus:ring-1 focus:ring-[#3a57e8] transition-all resize-none font-sans"
            placeholder="Paste your raw JIRA transcripts, client meeting notes, or unstructured ideas here..."
            value={contextText}
            onChange={(e) => setContextText(e.target.value)}
          />

          <Button 
            className="mt-6 w-full bg-[#3a57e8] hover:bg-[#2a47d8] text-white font-bold h-12 rounded-[4px] shadow-sm transition-all active:scale-[0.98]"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending || contextText.length < 10}
          >
            {generateMutation.isPending ? (
              <><LoadingSpinner size="sm" color="#FFFFFF" className="mr-2" /> Analyzing...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" /> Generate Formal BRD</>
            )}
          </Button>
        </div>

        {/* BRD Display Panel */}
        <div className="flex flex-col bg-white border border-[#E5E5EA] rounded-[4px] p-6 shadow-ambient-sm relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center text-slate-900">
              <FileText className="w-5 h-5 mr-2 text-[#3a57e8]" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Generated Specification</h3>
            </div>
            {brdDoc?.version && (
              <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-[#3a57e8] border border-blue-100 rounded-full">v{brdDoc.version}</span>
            )}
          </div>

          <div className="flex-1 w-full bg-[#FAFAFA] border border-[#E5E5EA] rounded-[4px] p-6 overflow-auto" style={{ minHeight: '300px' }}>
            {brdDoc?.content ? (
              <div className="prose prose-sm max-w-none prose-slate prose-headings:text-slate-900 prose-p:text-slate-700">
                <ReactMarkdown>{brdDoc.content}</ReactMarkdown>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-4">
                  <AlertCircle className="w-8 h-8 opacity-20" />
                </div>
                <p className="font-medium">No BRD generated yet.</p>
                <p className="text-[11px] mt-1 text-slate-400">Provide context and generate to see results here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
