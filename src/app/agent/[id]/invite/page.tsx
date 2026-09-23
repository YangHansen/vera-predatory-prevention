import { AgentInvitation } from "@/components/workspace/AgentInvitation";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AgentInvitation id={id} />;
}
