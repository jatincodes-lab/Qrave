"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import { useEffect, useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";

const navLinks = [
  ["Restaurant platform", "/#overview"],
  ["Pricing", "/pricing"],
  ["FAQ", "/faq"],
  ["Contact", "/contact"]
];

export function MarketingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const compact = scrolled || menuOpen;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleAnchorClick = (href: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    setMenuOpen(false);

    if (!href.startsWith("/#") || window.location.pathname !== "/") {
      return;
    }

    const target = document.getElementById(href.slice(2));

    if (!target) {
      return;
    }

    event.preventDefault();
    window.history.pushState(null, "", href);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const top = target.getBoundingClientRect().top + window.scrollY - 116;
    window.scrollTo({ top: Math.max(0, top), behavior: reduceMotion ? "auto" : "smooth" });
  };

  return (
    <header className="fixed left-0 right-0 top-0 z-50 pointer-events-none">
      <nav
        className={[
          "pointer-events-auto mx-auto flex items-center justify-between transition-all duration-500 ease-[cubic-bezier(0.2,0.82,0.28,1)]",
          compact
            ? "mt-3 h-16 w-[calc(100%-1rem)] max-w-[980px] rounded-full border border-white/45 bg-white/[0.48] px-3 shadow-[0_18px_60px_rgba(0,0,0,0.12)] backdrop-blur-2xl sm:mt-4 sm:h-[4.25rem] sm:w-[calc(100%-2rem)] sm:px-4"
            : "h-20 w-full max-w-[1560px] border border-transparent bg-transparent px-5 sm:px-8 lg:px-12"
        ].join(" ")}
      >
        <Link href="/" className="flex items-center gap-2 rounded-full pr-3" aria-label="Qrave home" onClick={() => setMenuOpen(false)}>
          <LogoMark compact={compact} />
          <span className={compact ? "text-lg font-extrabold text-black" : "text-xl font-extrabold text-black"}>Qrave</span>
        </Link>
        <div className={compact ? "hidden items-center gap-5 text-sm font-extrabold text-black lg:flex" : "hidden items-center gap-8 text-sm font-extrabold text-black lg:flex"}>
          {navLinks.map(([label, href]) => (
            <Link key={label} href={href} className="transition hover:text-[#006aff]" onClick={handleAnchorClick(href)}>
              {label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/login" className="hidden px-4 py-2.5 text-sm font-extrabold text-black transition hover:text-[#006aff] sm:inline-flex">
            Sign in
          </Link>
          <Link href="/admin/register" className={compact ? "inline-flex items-center gap-2 rounded-full bg-black px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-[#1f1f1f]" : "inline-flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-[#1f1f1f]"}>
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
      <div className={menuOpen ? "pointer-events-auto mx-auto mt-2 w-[calc(100%-1rem)] max-w-[28rem] rounded-[1.75rem] border border-white/45 bg-white/[0.64] p-3 shadow-[0_18px_60px_rgba(0,0,0,0.12)] backdrop-blur-2xl sm:w-[calc(100%-2rem)] lg:hidden" : "hidden"}>
        <div className="grid gap-1">
          {navLinks.map(([label, href]) => (
            <Link key={label} href={href} className="rounded-2xl px-4 py-3 text-base font-extrabold text-black transition hover:bg-white/70" onClick={handleAnchorClick(href)}>
              {label}
            </Link>
          ))}
          <Link href="/admin/login" className="rounded-2xl px-4 py-3 text-base font-extrabold text-black transition hover:bg-white/70" onClick={() => setMenuOpen(false)}>
            Sign in
          </Link>
        </div>
      </div>
    </header>
  );
}

function LogoMark({ compact }: { compact: boolean }) {
  return (
    <span className={compact ? "grid h-9 w-9 shrink-0 place-items-center rounded-md bg-black text-white" : "grid h-10 w-10 shrink-0 place-items-center rounded-md bg-black text-white"} aria-hidden="true">
      <svg viewBox="0 0 48 48" className="h-6 w-6" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="8" width="32" height="32" rx="6" stroke="currentColor" strokeWidth="4" />
        <path d="M16 16h7v7h-7v-7Zm9 0h7v7h-7v-7ZM16 25h7v7h-7v-7Zm9 0h4v4h4v4h-8v-8Z" fill="currentColor" />
      </svg>
    </span>
  );
}
