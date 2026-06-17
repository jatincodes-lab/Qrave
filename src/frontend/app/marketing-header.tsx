"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";

const navLinks = [
  ["Business types", "/#businesses"],
  ["Products", "/#tools"],
  ["Operations", "/#operations"],
  ["Pricing", "/pricing"],
  ["Contact", "/contact"]
];

export function MarketingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-black/10 bg-white/95 backdrop-blur-xl">
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
          {navLinks.map(([label, href]) => (
            <Link key={label} href={href} className="transition hover:text-[#006aff]">
              {label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/login" className="hidden px-4 py-2.5 text-sm font-extrabold text-black transition hover:text-[#006aff] sm:inline-flex">
            Sign in
          </Link>
          <Link href="/admin/register" className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-[#1f1f1f]">
            Start free
            <ArrowRight size={16} className="hidden sm:block" />
          </Link>
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-full border border-black/10 bg-white text-black lg:hidden"
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>
      <div className={menuOpen ? "border-t border-black/10 bg-white px-5 py-4 shadow-[0_18px_50px_rgba(0,0,0,0.08)] sm:px-8 lg:hidden" : "hidden"}>
        <div className="mx-auto grid max-w-[1560px] gap-1">
          {navLinks.map(([label, href]) => (
            <Link key={label} href={href} className="rounded-lg px-2 py-3 text-base font-extrabold text-black transition hover:bg-[#f7f6f2]" onClick={() => setMenuOpen(false)}>
              {label}
            </Link>
          ))}
          <Link href="/admin/login" className="rounded-lg px-2 py-3 text-base font-extrabold text-black transition hover:bg-[#f7f6f2]" onClick={() => setMenuOpen(false)}>
            Sign in
          </Link>
        </div>
      </div>
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
