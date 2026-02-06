"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Menu } from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <div className="flex min-h-screen">
      <Sidebar
        currentPath={pathname}
        userRole="admin"
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((prev) => !prev)}
      />

      {/* Main content area */}
      <div
        className="flex flex-1 flex-col transition-[margin] duration-200"
        style={{
          marginLeft: collapsed
            ? "var(--sidebar-collapsed-width)"
            : "var(--sidebar-width)",
        }}
      >
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-topbar items-center justify-between border-b border-gray-200 bg-card px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCollapsed((prev) => !prev)}
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600 lg:hidden"
              aria-label="Ouvrir le menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-sm font-medium text-gray-500">
              Organisation
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-sm font-medium text-amber-700">
              U
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
