import { redirect } from "next/navigation";

export default function ProjectRootRedirect({ params }: { params: { id: string } }) {
  redirect(`/dashboard/projects/${params.id}/brd`);
}
