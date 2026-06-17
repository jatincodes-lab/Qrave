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
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-black/10 bg-white/94 backdrop-blur">
      <nav
        className={[
          "mx-auto flex h-20 max-w-[1560px] items-center justify-between px-5 transition-all duration-300 sm:px-8 lg:px-12",
          scrolled ? "shadow-[0_10px_30px_rgba(0,0,0,0.06)]" : "shadow-none"
        ].join(" ")}
      >
        <Link href="/" className="flex items-center gap-2 rounded-full pr-3" aria-label="Qrave home">
          <LogoMark />
          <span className="text-xl font-extrabold text-black">Qrave</span>
        </Link>
        <div className="hidden items-center gap-8 text-sm font-extrabold text-black lg:flex">
          <Link href="/#businesses" className="transition hover:text-[#006aff]">Business types</Link>
          <Link href="/#tools" className="transition hover:text-[#006aff]">Products</Link>
          <Link href="/#operations" className="transition hover:text-[#006aff]">Operations</Link>
          <Link href="/pricing" className="transition hover:text-[#006aff]">Pricing</Link>
          <Link href="/contact" className="transition hover:text-[#006aff]">Contact</Link>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/login" className="hidden px-4 py-2.5 text-sm font-extrabold text-black transition hover:text-[#006aff] sm:inline-flex">
            Sign in
          </Link>
          <Link href="/admin/register" className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-[#1f1f1f]">
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
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-black text-white" aria-hidden="true">
      <svg viewBox="0 0 48 48" className="h-6 w-6" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="8" width="32" height="32" rx="6" stroke="currentColor" strokeWidth="4" />
        <path d="M16 16h7v7h-7v-7Zm9 0h7v7h-7v-7ZM16 25h7v7h-7v-7Zm9 0h4v4h4v4h-8v-8Z" fill="currentColor" />
      </svg>
    </span>
  );
}
