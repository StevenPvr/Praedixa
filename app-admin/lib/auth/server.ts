import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  type AuthSessionData,
  verifySession,
  getOidcEnv,
} from "@/lib/auth/oidc";

export async function getSession(): Promise<AuthSessionData | null> {
  const cookieStore = await cookies();
  const signed = cookieStore.get(SESSION_COOKIE)?.value;
  if (!signed) return null;

  try {
    const { sessionSecret } = getOidcEnv();
    return await verifySession(signed, sessionSecret);
  } catch {
    return null;
  }
}

export async function getUser() {
  const session = await getSession();
  if (!session) return null;

  return {
    id: session.sub,
    email: session.email,
    role: session.role,
    permissions: session.permissions,
    organization_id: session.organizationId,
    site_id: session.siteId,
  };
}
