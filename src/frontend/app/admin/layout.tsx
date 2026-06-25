"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AdminShellHost } from "../../components/admin-shell";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (isAdminAuthRoute(pathname)) {
    return <>{children}</>;
  }

  return <AdminShellHost>{children}</AdminShellHost>;
}

function isAdminAuthRoute(pathname: string): boolean {
  return pathname === "/admin/login" || pathname.startsWith("/admin/login/") || pathname === "/admin/register" || pathname.startsWith("/admin/register/");
}
