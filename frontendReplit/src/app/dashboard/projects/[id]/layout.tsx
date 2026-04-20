"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { FolderGit2, ArrowLeft } from "lucide-react";

export default function ProjectDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const pathname = usePathname();
  const projectId = params.id;

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}`);
      return res.data;
    },
  });

  const tabs = [
    { name: "BRD Studio", href: `/dashboard/projects/${projectId}/brd` },
    { name: "Test Cases", href: `/dashboard/projects/${projectId}/test-cases` },
    { name: "Test Data", href: `/dashboard/projects/${projectId}/test-data` },
  ];

  return (
    <div className="flex flex-col h-full bg-[#F5F5F7]">
      <div className="bg-white border-b border-[#E5E5EA] px-8 pt-6 pb-0 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto w-full">
          <Link 
            href="/dashboard/projects" 
            className="inline-flex items-center text-[13px] font-medium text-slate-500 hover:text-[#3a57e8] transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Link>
          
          <div className="flex items-center gap-5 mb-8">
            <div 
              className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-ambient-sm"
              style={{ background: "#FFF", border: "1px solid rgba(58, 87, 232, 0.1)" }}
            >
              <FolderGit2 className="w-8 h-8 text-[#3a57e8]" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="ios-main-heading">
                  {project?.name || "Loading..."}
                </h1>
                {project?.project_key && (
                  <span className="px-2 py-0.5 bg-blue-50 text-[#3a57e8] border border-blue-100 rounded text-[10px] font-bold tracking-widest uppercase">
                    {project.project_key}
                  </span>
                )}
              </div>
              <p className="ios-page-description mt-2">{project?.description || "-"}</p>
            </div>
          </div>

          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const isActive = pathname.includes(tab.href);
              return (
                <Link
                  key={tab.name}
                  href={tab.href}
                  className={cn(
                    "relative py-4 text-sm font-bold transition-all",
                    isActive
                      ? "text-[#3a57e8]"
                      : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  {tab.name}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3a57e8] rounded-t-full shadow-[0_-2px_6px_rgba(58,87,232,0.3)]" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
      
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full overflow-y-auto custom-scrollbar">
        {children}
      </main>
    </div>
  );
}
