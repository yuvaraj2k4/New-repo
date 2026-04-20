"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Database, Sparkles, ShieldAlert, Cpu } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function TestCasesPage({ params }: { params: { id: string } }) {
  const projectId = params.id;

  const { data: testCases, refetch, isLoading } = useQuery({
    queryKey: ["testcases", projectId],
    queryFn: async () => {
      const res = await api.get(`/test-cases/?project_id=${projectId}`);
      return res.data;
    },
  });

  const { data: docs } = useQuery({
    queryKey: ["documents", projectId],
    queryFn: async () => {
      const res = await api.get(`/documents/?project_id=${projectId}`);
      return res.data;
    },
  });

  const brdDoc = docs?.find((d: any) => d.doc_type === "brd");

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!brdDoc?.id) throw new Error("No BRD found");
      await api.post(`/test-cases/generate/${brdDoc.id}`);
    },
    onSuccess: () => {
      alert("Test Case generation started! Polling... (refresh soon)");
      refetch();
    }
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">System Test Cases</h2>
          <p className="text-sm text-zinc-400 mt-1">AI extracted test plans mapping specifically to your BRD requirements.</p>
        </div>
        <Button 
          className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-900/20"
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending || !brdDoc}
        >
          {generateMutation.isPending ? (
            <><LoadingSpinner size="sm" color="#FFFFFF" className="mr-2" /> Mining Test Cases...</>
          ) : (
            <><Cpu className="w-4 h-4 mr-2" /> Auto-Generate from BRD</>
          )}
        </Button>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex justify-center"><LoadingSpinner size="md" color="#8E8E93" /></div>
        ) : testCases?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <ShieldAlert className="w-12 h-12 text-zinc-600 mb-4" />
            <h3 className="text-lg font-medium text-zinc-200">No Test Cases found</h3>
            <p className="text-sm text-zinc-500 mt-2">Generate them from the parent BRD to populate this interface.</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-400 bg-zinc-900 border-b border-zinc-800 uppercase">
              <tr>
                <th className="px-6 py-4 font-medium">Scenario Module</th>
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium">Format Status</th>
                <th className="px-6 py-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {testCases?.map((tc: any) => (
                <tr key={tc.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                  <td className="px-6 py-4 font-medium text-zinc-200">
                    {tc.title || tc.content?.module || "Unknown Component"}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-indigo-500/10 text-indigo-400 rounded text-xs border border-indigo-500/20">
                      {tc.test_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-zinc-400 font-mono text-xs">
                    JSON Payload
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
                      View JSON
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
