"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { BarChart3, Building2, LogOut, Shield } from "lucide-react";
import { Button } from "../../components/ui/button";
import { clearSuperAdminSession, getSuperAdminAccessToken, getSuperAdminSession } from "../../lib/auth";

const navItems = [
  { href: "/superadmin/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/superadmin/restaurants", label: "Restaurants", icon: Building2 }
];

export function SuperAdminShell({ children, title }: { children: ReactNode; title: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);
  const session = getSuperAdminSession();

  useEffect(() => {
    if (!getSuperAdminAccessToken()) {
      router.replace("/superadmin/login");
      return;
    }

    setChecked(true);
  }, [router]);

  function logout() {
    clearSuperAdminSession();
    router.replace("/superadmin/login");
  }

  if (!checked) {
    return <div className="grid min-h-screen place-items-center bg-background text-sm font-bold text-on-surface-variant">Loading platform admin...</div>;
  }

  return (
    <div className="min-h-screen bg-background text-on-background lg:grid lg:grid-cols-[17rem_1fr]">
      <aside className="border-b border-outline-variant/60 bg-primary text-white lg:min-h-screen lg:border-b-0 lg:border-r lg:border-white/10">
        <div className="flex h-16 items-center justify-between px-4 lg:h-20 lg:px-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10">
              <Shield size={21} />
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-wide">Qrave</p>
              <p className="text-xs font-semibold text-white/60">Super Admin</p>
            </div>
          </div>
          <Button type="button" variant="ghost" size="icon" className="text-white hover:bg-white/10 lg:hidden" onClick={logout} aria-label="Logout">
            <LogOut size={18} />
          </Button>
        </div>

        <nav className="flex gap-2 overflow-x-auto px-3 pb-3 lg:grid lg:gap-1 lg:overflow-visible lg:px-3 lg:py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-11 shrink-0 items-center gap-3 rounded-xl px-3 text-sm font-bold transition ${
                  active ? "bg-white text-primary shadow-sm" : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden border-t border-white/10 p-4 lg:block">
          <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3">
            <p className="truncate text-sm font-bold">{session?.user.displayName ?? "Super admin"}</p>
            <p className="mt-1 truncate text-xs font-semibold text-white/55">{session?.user.email}</p>
          </div>
          <Button type="button" variant="ghost" className="mt-3 w-full justify-start text-white/75 hover:bg-white/10 hover:text-white" onClick={logout}>
            <LogOut size={17} />
            Logout
          </Button>
        </div>
      </aside>

      <main className="min-w-0 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <header className="mb-6">
          <p className="text-xs font-black uppercase tracking-wide text-primary">Platform control</p>
          <h1 className="mt-2 text-3xl font-black text-on-surface">{title}</h1>
        </header>
        {children}
      </main>
    </div>
  );
}

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value);
}

export function statusTone(status: string): string {
  if (["Active", "ManualActive", "Trialing"].includes(status)) {
    return "bg-emerald-50 text-emerald-800 border-emerald-200";
  }

  if (["PastDue", "Expired"].includes(status)) {
    return "bg-amber-50 text-amber-900 border-amber-200";
  }

  return "bg-red-50 text-red-800 border-red-200";
}

export function StatusPill({ value }: { value: string }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${statusTone(value)}`}>{value}</span>;
}
