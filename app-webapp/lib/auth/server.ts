import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  type AuthSessionData,
  isSessionExpired,
  verifySession,
  getOidcEnv,
} from "@/lib/auth/oidc";

export async function getSession(): Promise<AuthSessionData | null> {
  const cookieStore = await cookies();
  const signed = cookieStore.get(SESSION_COOKIE)?.value;
  if (!signed) return null;

  try {
    const { sessionSecret } = getOidcEnv();
    const session = await verifySession(signed, sessionSecret);
    return session && !isSessionExpired(session) ? session : null;
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
    organization_id: session.organizationId,
    site_id: session.siteId,
  };
}

export async function getSafeCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  return {
    id: session.sub,
    email: session.email,
    firstName: session.email.split("@")[0] || "Utilisateur",
    organizationId: session.organizationId,
    role: session.role,
    siteId: session.siteId,
  };
}
