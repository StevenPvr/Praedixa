"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function ClientRedirectPage() {
  const params = useParams<{ orgId: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/clients/${encodeURIComponent(params.orgId)}/vue-client`);
  }, [params.orgId, router]);

  return null;
}
