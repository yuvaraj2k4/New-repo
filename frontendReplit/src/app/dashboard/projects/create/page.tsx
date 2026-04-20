"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import {
  ArrowLeft,
  FolderPlus,
  Key,
  Globe,
  Users,
  Hash,
  CheckCircle2,
  ChevronRight,
  PartyPopper,
  ExternalLink,
  AlertCircle
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { cn } from "@/lib/utils";

interface User {
  id: string;
  full_name: string;
  email: string;
}

export default function CreateProjectPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const [isKeyManual, setIsKeyManual] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [newProjectId, setNewProjectId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    project_key: "",
    description: "",
    project_url: "",
  });

  // Fetch users for assignment (Only works for org_admins currently)
  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["org-users"],
    queryFn: async () => {
      try {
        const res = await api.get("/users/");
        return res.data;
      } catch (err) {
        console.error("Failed to fetch users. You might not be an org admin.", err);
        return [];
      }
    },
  });

  // Auto-generate key logic
  useEffect(() => {
    if (!isKeyManual && formData.name) {
      const words = formData.name.trim().split(/\s+/);
      let generatedKey = "";
      if (words.length > 1) {
        generatedKey = words.map(w => w[0]).join("").toUpperCase();
      } else {
        generatedKey = formData.name.substring(0, 3).toUpperCase();
      }
      // sanitize
      generatedKey = generatedKey.replace(/[^A-Z0-9]/g, "");
      setFormData(prev => ({ ...prev, project_key: generatedKey }));
    }
  }, [formData.name, isKeyManual]);

  const createProjectMutation = useMutation({
    mutationFn: async (data: any) => {
      return await api.post("/projects/", {
        ...data,
        member_ids: selectedMembers,
      });
    },
    onSuccess: (res) => {
      setNewProjectId(res.data.id);
      setIsSuccessOpen(true);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || "Failed to create project.";
      setFormError(msg);
    }
  });

  // Auto-navigate to projects list after 3 seconds on success
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isSuccessOpen) {
      timer = setTimeout(() => {
        router.push("/dashboard/projects");
        router.refresh();
      }, 3000);
    }
    return () => clearTimeout(timer);
  }, [isSuccessOpen, router]);

  const toggleMember = (userId: string) => {
    setSelectedMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formData.name || !formData.project_key) return;
    createProjectMutation.mutate(formData);
  };

  const filteredUsers = users?.filter(u => u.id !== currentUser?.id) || [];

  return (
    <div className="min-h-screen p-6 md:p-8 pb-16 bg-[var(--ios-bg)]">
      {/* Navigation & Header */}
      <div className="max-w-4xl mx-auto mb-8">
        <Link
          href="/dashboard/projects"
          className="inline-flex items-center gap-2 text-sm font-medium mb-6 transition-colors hover:text-[var(--brand-primary)]"
          style={{ color: "var(--brand-muted)" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </Link>

        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shadow-ambient-sm"
            style={{ background: "#FFF", border: "1px solid rgba(58, 87, 232, 0.15)" }}
          >
            <FolderPlus className="w-6 h-6" style={{ color: "var(--brand-primary)" }} />
          </div>
          <div>
            <h1 className="ios-main-heading">
              New Project
            </h1>
            <p className="ios-page-description mt-2">
              Initialize a new workspace with custom artifact tracking.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main Configuration Card */}
          <div className="md:col-span-2 space-y-6">
            {formError && (
              <div className="flex items-center gap-3 p-4 rounded-[4px] text-sm font-bold bg-red-50 border border-red-200 text-red-600 animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                {formError}
              </div>
            )}
            <div className="bg-white rounded-xl border border-[var(--ios-separator)] p-8 shadow-ambient-sm">
              <h2 className="text-lg font-semibold mb-6 flex items-center gap-2" style={{ color: "var(--brand-navy)" }}>
                <Hash className="w-5 h-5 text-[var(--brand-primary)]" />
                Identity & Details
              </h2>

              <div className="space-y-6">
                {/* Project Name */}
                <div className="space-y-2">
                  <label className="text-[0.7rem] font-bold uppercase tracking-widest text-[var(--brand-muted)] flex items-center gap-1">
                    Project Name <span className="text-[var(--brand-primary)] text-lg leading-none" title="Required">*</span>
                  </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. NextGen Mobile Banking"
                      className="w-full bg-[#FAFAFA] border border-[var(--ios-separator)] rounded px-4 py-3 text-sm transition-all focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)] outline-none"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Project Key */}
                  <div className="space-y-2">
                    <label className="text-[0.7rem] font-bold uppercase tracking-widest text-[var(--brand-muted)] flex items-center gap-1">
                      Project Key <span className="text-[var(--brand-primary)] text-lg leading-none" title="Required">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="NMB"
                        className="w-full bg-[#FAFAFA] border border-[var(--ios-separator)] rounded px-4 py-3 text-sm transition-all focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)] outline-none font-mono"
                        value={formData.project_key}
                        onChange={(e) => {
                          setIsKeyManual(true);
                          setFormData(prev => ({ ...prev, project_key: e.target.value.toUpperCase() }));
                        }}
                      />
                      <Key className="absolute right-3 top-3.5 w-4 h-4 text-[#C7C7CC]" />
                    </div>
                    {!isKeyManual && (
                      <p className="text-[0.625rem] text-[#3a57e8] font-medium italic">Auto-generated from name</p>
                    )}
                  </div>

                  {/* Project URL */}
                  <div className="space-y-2">
                    <label className="text-[0.7rem] font-bold uppercase tracking-widest text-[var(--brand-muted)]">
                      Project URL (Optional)
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        placeholder="https://github.com/org/repo"
                        className="w-full bg-[#FAFAFA] border border-[var(--ios-separator)] rounded px-4 py-3 text-sm transition-all focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)] outline-none"
                        value={formData.project_url}
                        onChange={(e) => setFormData(prev => ({ ...prev, project_url: e.target.value }))}
                      />
                      <Globe className="absolute right-3 top-3.5 w-4 h-4 text-[#C7C7CC]" />
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="text-[0.7rem] font-bold uppercase tracking-widest text-[var(--brand-muted)]">
                    Description
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Briefly describe the mission of this project..."
                    className="w-full bg-[#FAFAFA] border border-[var(--ios-separator)] rounded px-4 py-3 text-sm transition-all focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)] outline-none resize-none"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* User Assignment Card */}
            <div className="bg-white rounded-xl border border-[var(--ios-separator)] p-8 shadow-ambient-sm">
              <h2 className="text-lg font-semibold mb-2 flex items-center gap-2" style={{ color: "var(--brand-navy)" }}>
                <Users className="w-5 h-5 text-[var(--brand-primary)]" />
                Member Assignment
              </h2>
              <p className="text-xs mb-6" style={{ color: "var(--brand-muted)" }}>
                Select colleagues to join this project workspace.
              </p>

              {usersLoading ? (
                <div className="py-8 flex justify-center">
                  <LoadingSpinner size="sm" color="#3a57e8" />
                </div>
              ) : filteredUsers && filteredUsers.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => toggleMember(user.id)}
                      className={cn(
                        "flex items-center justify-between p-4 rounded border cursor-pointer transition-all",
                        selectedMembers.includes(user.id)
                          ? "bg-blue-50 border-[var(--brand-primary)] shadow-sm"
                          : "bg-[#FAFAFA] border-[var(--ios-separator)] hover:border-[#C7C7CC]"
                      )}
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold truncate" style={{ color: "var(--brand-navy)" }}>{user.full_name}</span>
                        <span className="text-[0.625rem] truncate" style={{ color: "var(--brand-muted)" }}>{user.email}</span>
                      </div>

                      {/* Custom Animated Checkbox */}
                      <div className="flex items-center">
                        <label className="container-checkbox" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedMembers.includes(user.id)}
                            onChange={() => toggleMember(user.id)}
                          />
                          <svg viewBox="0 0 64 64" height="1.25em" width="1.25em">
                            <path
                              d="M 0 16 V 56 A 8 8 90 0 0 8 64 H 56 A 8 8 90 0 0 64 56 V 8 A 8 8 90 0 0 56 0 H 8 A 8 8 90 0 0 0 8 V 16 L 32 48 L 64 16 V 8 A 8 8 90 0 0 56 0 H 8 A 8 8 90 0 0 0 8 v 56 a 8 8 90 0 0 8 8 h 48 a 8 8 90 0 0 8 -8 V 8"
                              className="path-checkbox"
                              style={{ stroke: selectedMembers.includes(user.id) ? '#3a57e8' : '#C7C7CC' }}
                            ></path>
                          </svg>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center border border-dashed rounded-[4px] border-[#C7C7CC]">
                  <p className="text-xs font-medium text-[#8E8E93]">No organization users found.</p>
                  <p className="text-[0.625rem] mt-1 text-[#C7C7CC]">Only Organization Admins can see the user directory.</p>
                </div>
              )}
            </div>
          </div>

          {/* Action Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 text-[var(--brand-navy)] border border-[var(--ios-separator)] shadow-ambient-sm">
              <h3 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[var(--brand-primary)]" />
                Finalize
              </h3>

              <ul className="space-y-4 mb-8">
                <li className="flex gap-3 text-xs opacity-80">
                  <div className="mt-0.5">•</div>
                  Initializes a dedicated environment for BRDs, FRS, and Testing.
                </li>
                <li className="flex gap-3 text-xs opacity-80">
                  <div className="mt-0.5">•</div>
                  Assigns management rights to your account.
                </li>
                <li className="flex gap-3 text-xs opacity-80">
                  <div className="mt-0.5">•</div>
                  Configures {selectedMembers.length} additional team members.
                </li>
              </ul>

              <button
                type="submit"
                disabled={!formData.name || !formData.project_key || createProjectMutation.isPending}
                className="w-full bg-[var(--brand-primary)] text-white font-bold py-4 rounded flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {createProjectMutation.isPending ? (
                  <LoadingSpinner size="sm" color="#FFF" />
                ) : (
                  <>
                    Initialize Project
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            <div className="bg-white rounded-xl border border-[var(--ios-separator)] p-6 shadow-ambient-sm">
              <h4 className="text-[0.625rem] font-bold uppercase tracking-widest text-[var(--brand-muted)] mb-3">Pro Tip</h4>
              <p className="text-xs leading-relaxed" style={{ color: "var(--brand-navy)" }}>
                Use meaningful Project Keys (e.g., <strong>FIN</strong> for Finance, <strong>OPS</strong> for Operations) to keep your artifacts organized.
              </p>
            </div>
          </div>
        </form>
      </div>

      {/* Success Dialog */}
      <Dialog open={isSuccessOpen} onOpenChange={setIsSuccessOpen}>
        <DialogContent className="sm:max-w-md border-none p-0 overflow-hidden shadow-2xl rounded-[12px]">
          <div className="bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary)]/80 p-8 text-white flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 animate-bounce">
              <PartyPopper className="w-8 h-8 text-white" />
            </div>
            <DialogTitle className="text-2xl font-bold mb-2">Project Initialized!</DialogTitle>
            <DialogDescription className="text-white/80 text-sm">
              Successfully established the workspace for <span className="font-bold text-white">"{formData.name}"</span>.
            </DialogDescription>
          </div>

          <div className="bg-white p-8">
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest mb-1">Project Key</p>
                <p className="text-sm font-mono font-bold text-slate-900">{formData.project_key}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest mb-1">Team Size</p>
                <p className="text-sm font-bold text-slate-900">{selectedMembers.length + 1} Members</p>
              </div>
            </div>

            <Button
              className="w-full bg-[var(--brand-primary)] hover:opacity-90 text-white font-bold h-12 rounded flex items-center justify-center gap-2 group transition-all"
              onClick={() => {
                router.push("/dashboard/projects");
                router.refresh();
              }}
            >
              Okay
              {/* No icon needed for a simple Okay confirmation */}
            </Button>

            <p className="text-center mt-4 text-[11px] text-slate-400">
              Artifact tracking and testing environment ready.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
