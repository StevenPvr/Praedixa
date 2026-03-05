import { redirect } from "next/navigation";

interface ClientRedirectPageProps {
  params: Promise<{ orgId: string }>;
}

export default async function ClientRedirectPage({
  params,
}: ClientRedirectPageProps) {
  const { orgId } = await params;
  redirect(`/clients/${encodeURIComponent(orgId)}/dashboard`);
}
