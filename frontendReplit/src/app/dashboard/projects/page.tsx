"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Link from "next/link";
import { Layers, Plus, ArrowRight, Trash2, X } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { cn } from "@/lib/utils";

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  created_at: string;
}

const statusStyle: Record<string, { bg: string; color: string; label: string }> = {
  active: { bg: "rgba(26, 160, 83, 0.10)", color: "var(--brand-success)", label: "Active" },
  inactive: { bg: "rgba(138, 146, 166, 0.10)", color: "var(--brand-muted)", label: "Inactive" },
  archived: { bg: "rgba(58, 87, 232, 0.10)", color: "var(--brand-primary)", label: "Archived" },
};

export default function ProjectsPage() {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const { data: projects, isLoading, error } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await api.get("/projects/");
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return await api.post("/projects/bulk-delete", { project_ids: ids });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setSelectedIds([]);
    },
  });

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedIds.length} projects? This action cannot be undone.`)) {
      deleteMutation.mutate(selectedIds);
    }
  };

  return (
    <div className="p-6 md:p-8 pb-16">
      {/* Header & Selection Toolbar */}
      <div className="flex items-center justify-between mb-8 h-12">
        {selectedIds.length > 0 ? (
          <div className="flex items-center gap-4 animate-in slide-in-from-left-4 fade-in duration-300">
            <div className="flex items-center gap-2 px-4 py-2 bg-[var(--brand-primary-light)] border border-[var(--brand-primary)]/20 rounded-full">
              <span className="text-sm font-bold text-[var(--brand-primary)]">{selectedIds.length} selected</span>
              <button 
                onClick={() => setSelectedIds([])}
                className="p-1 hover:bg-[var(--brand-primary)]/10 rounded-full transition-colors"
                title="Clear selection"
              >
                <X className="w-3 h-3 text-[var(--brand-primary)]" />
              </button>
            </div>
            
            <button 
              onClick={handleBulkDelete}
              disabled={deleteMutation.isPending}
              className="ios-btn-interactive bg-red-500 hover:bg-red-600 border-red-400 group h-10 px-4"
            >
              <span className="text-white flex items-center gap-2">
                {deleteMutation.isPending ? (
                  <LoadingSpinner size="sm" color="#FFF" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Projects
                  </>
                )}
              </span>
            </button>
          </div>
        ) : (
          <>
            <div>
              <h1 className="ios-main-heading">
                Projects
              </h1>
              <p className="ios-page-description mt-1">
                Manage your active SDLC workspaces
              </p>
            </div>
            <Link href="/dashboard/projects/create">
              <button className="ios-btn-interactive">
                <span>
                  <Plus className="w-4 h-4" />
                  New Project
                </span>
              </button>
            </Link>
          </>
        )}
      </div>

      {/* States */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <LoadingSpinner size="md" color="#3a57e8" />
          <p className="text-sm font-medium" style={{ color: "#8E8E93" }}>Loading projects…</p>
        </div>
      ) : error ? (
        <div
          className="p-4 rounded-xl flex items-center gap-3 text-sm font-medium"
          style={{ background: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.2)", color: "#FF3B30" }}
        >
          Failed to load projects. Ensure your backend server is running.
        </div>
      ) : projects?.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 rounded-2xl border-2 border-dashed"
          style={{ borderColor: "#E5E5EA" }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "#F2F2F7" }}
          >
            <Layers className="w-8 h-8" style={{ color: "#C7C7CC" }} />
          </div>
          <h3 className="text-base font-semibold" style={{ color: "var(--brand-navy)" }}>No Projects Found</h3>
          <p className="small mt-1.5 max-w-xs text-center" style={{ color: "var(--brand-muted)" }}>
            Create your first project to start generating SDLC artifacts.
          </p>
          <Link href="/dashboard/projects/create">
            <button className="ios-btn-interactive mt-6">
              <span>
                <Plus className="w-4 h-4" />
                Create Project
              </span>
            </button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects?.map((project) => {
            const s = statusStyle[project.status] ?? statusStyle.inactive;
            return (
              <div 
                key={project.id} 
                className={cn(
                  "ios-project-card rounded-xl group shadow-ambient-sm transition-all relative overflow-hidden",
                  selectedIds.includes(project.id) && "ring-2 ring-[#3a57e8] ring-inset"
                )}
              >
                {/* Checkbox Overlay */}
                <div className="absolute top-4 left-4 z-20">
                  <label className="container-checkbox" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      checked={selectedIds.includes(project.id)}
                      onChange={() => toggleSelection(project.id)}
                    />
                    <svg viewBox="0 0 64 64" height="1.25em" width="1.25em">
                      <path 
                        d="M 0 16 V 56 A 8 8 90 0 0 8 64 H 56 A 8 8 90 0 0 64 56 V 8 A 8 8 90 0 0 56 0 H 8 A 8 8 90 0 0 0 8 V 16 L 32 48 L 64 16 V 8 A 8 8 90 0 0 56 0 H 8 A 8 8 90 0 0 0 8 v 56 a 8 8 90 0 0 8 8 h 48 a 8 8 90 0 0 8 -8 V 8" 
                        className="path-checkbox"
                        style={{ stroke: selectedIds.includes(project.id) ? '#3a57e8' : '#E5E5EA' }}
                      ></path>
                    </svg>
                  </label>
                </div>

                <div className="ios-project-card-details pl-10">
                  {/* Status Badge */}
                  <div className="flex justify-between items-start mb-1">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ background: "rgba(58, 87, 232, 0.08)" }}
                    >
                      <Layers className="w-5 h-5" style={{ color: "#3a57e8" }} />
                    </div>
                    <span
                      className="text-[0.625rem] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider"
                      style={{ background: s.bg, color: s.color }}
                    >
                      {s.label}
                    </span>
                  </div>

                  <h3 className="ios-project-card-title truncate">{project.name}</h3>
                  
                  <p className="ios-project-card-body line-clamp-4">
                    {project.description || "-"}
                  </p>

                  <div className="mt-auto pt-4 flex items-center justify-between border-t" style={{ borderColor: "var(--ios-separator)" }}>
                    <div className="flex flex-col">
                      <span className="text-[0.6rem] font-bold uppercase tracking-widest" style={{ color: "var(--brand-muted)" }}>Created</span>
                      <span className="text-[0.7rem] font-medium" style={{ color: "var(--brand-navy)" }}>
                        {new Date(project.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Restore UI but disable navigation as requested */}
                <button 
                  className="ios-project-card-button cursor-default opacity-80"
                  onClick={() => alert("This workspace feature is currently under final development and will be available soon.")}
                >
                  <span>Open Project</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
