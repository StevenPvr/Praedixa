import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin-shell";

type AdminLayoutProps = Readonly<{
  children: ReactNode;
}>;

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: AdminLayoutProps) {
  return <AdminShell>{children}</AdminShell>;
}
