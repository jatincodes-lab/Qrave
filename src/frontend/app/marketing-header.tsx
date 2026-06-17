"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

export function MarketingHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed left-0 right-0 top-0 z-50 px-4 pt-4">
      <nav
        className={[
          "mx-auto flex h-16 max-w-7xl items-center justify-between rounded-full px-3 transition-all duration-300 sm:px-4",
          scrolled
            ? "border border-white/70 bg-white/90 shadow-[0_18px_48px_rgba(15,35,26,0.14)] backdrop-blur-xl"
            : "border border-white/40 bg-white/52 shadow-none backdrop-blur-md"
        ].join(" ")}
      >
        <Link href="/" className="flex items-center gap-2 rounded-full pr-3" aria-label="Qrave home">
          <LogoMark />
          <span className="text-xl font-extrabold text-[#075335]">Qrave</span>
        </Link>
        <div className="hidden items-center gap-1 rounded-full bg-white/54 p-1 text-sm font-bold text-[#5f5a53] md:flex">
          <Link href="/#use-cases" className="rounded-full px-4 py-2 transition hover:bg-white hover:text-[#171514]">Use cases</Link>
          <Link href="/#features" className="rounded-full px-4 py-2 transition hover:bg-white hover:text-[#171514]">Features</Link>
          <Link href="/#product" className="rounded-full px-4 py-2 transition hover:bg-white hover:text-[#171514]">Product</Link>
          <Link href="/#results" className="rounded-full px-4 py-2 transition hover:bg-white hover:text-[#171514]">Results</Link>
          <Link href="/pricing" className="rounded-full px-4 py-2 transition hover:bg-white hover:text-[#171514]">Pricing</Link>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/login" className="hidden rounded-full px-4 py-2.5 text-sm font-extrabold text-[#171514] transition hover:bg-white sm:inline-flex">
            Login
          </Link>
          <Link href="/admin/register" className="inline-flex items-center gap-2 rounded-full bg-[#171514] px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-[#075335]">
            Start free
            <ArrowRight size={16} className="hidden sm:block" />
          </Link>
        </div>
      </nav>
    </header>
  );
}

function LogoMark() {
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#075335] text-white" aria-hidden="true">
      <svg viewBox="0 0 48 48" className="h-6 w-6" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="8" width="32" height="32" rx="9" stroke="currentColor" strokeWidth="4" />
        <path d="M16 16h7v7h-7v-7Zm9 0h7v7h-7v-7ZM16 25h7v7h-7v-7Zm9 0h4v4h4v4h-8v-8Z" fill="currentColor" />
      </svg>
    </span>
  );
}
