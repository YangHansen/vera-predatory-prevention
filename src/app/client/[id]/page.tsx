import { ClientExperience } from "@/components/workspace/ClientExperience";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ClientExperience id={id} />;
}
