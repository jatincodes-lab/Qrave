"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import { useEffect, useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";

const navLinks = [
  ["Features", "/#features"],
  ["How it Works", "/#how-it-works"],
  ["Pricing", "/#pricing"],
  ["Testimonials", "/#testimonials"],
  ["FAQ", "/#faq"]
];

export function MarketingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
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
    const top = target.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top: Math.max(0, top), behavior: reduceMotion ? "auto" : "smooth" });
  };

  return (
    <header className="pointer-events-none fixed left-0 right-0 top-0 z-50 px-3 pt-3 sm:px-4">
      <nav
        className={[
          "pointer-events-auto mx-auto flex h-16 w-full max-w-7xl items-center justify-between rounded-full border px-3 transition-all duration-300 sm:h-[4.25rem] sm:px-4",
          scrolled || menuOpen
            ? "border-[#E2E8F0] bg-white/94 shadow-[0_18px_50px_rgba(15,23,42,0.12)] backdrop-blur-xl"
            : "border-white/30 bg-white/88 shadow-[0_16px_40px_rgba(15,23,42,0.12)] backdrop-blur-xl"
        ].join(" ")}
        style={{ width: "min(100%, calc(100vw - 1.5rem))" }}
      >
        <Link href="/" className="flex items-center gap-2 rounded-full pr-2" aria-label="Qrave home" onClick={() => setMenuOpen(false)}>
          <img src="/brand/qrave-icon-mark-transparent.png" alt="" className="h-10 w-10 object-contain" />
          <span className="text-xl font-extrabold text-[#0F172A]">Qrave</span>
        </Link>

        <div className="hidden items-center gap-5 text-sm font-extrabold text-[#334155] lg:flex">
          {navLinks.map(([label, href]) => (
            <Link key={label} href={href} className="transition hover:text-[#F97316]" onClick={handleAnchorClick(href)}>
              {label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/login" className="hidden px-3 py-2 text-sm font-extrabold text-[#334155] transition hover:text-[#F97316] sm:inline-flex">
            Login
          </Link>
          <Link href="/contact" className="hidden items-center gap-2 rounded-full bg-[#0F172A] px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-[#1E293B] sm:inline-flex">
            Book Demo
            <ArrowRight size={16} />
          </Link>
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-full border border-[#E2E8F0] bg-white text-[#0F172A] lg:hidden"
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      <div className={menuOpen ? "pointer-events-auto mx-auto mt-2 w-full max-w-[28rem] rounded-3xl border border-[#E2E8F0] bg-white/96 p-3 shadow-[0_18px_50px_rgba(15,23,42,0.14)] backdrop-blur-xl lg:hidden" : "hidden"}>
        <div className="grid gap-1">
          {navLinks.map(([label, href]) => (
            <Link key={label} href={href} className="rounded-2xl px-4 py-3 text-base font-extrabold text-[#0F172A] transition hover:bg-orange-50 hover:text-[#F97316]" onClick={handleAnchorClick(href)}>
              {label}
            </Link>
          ))}
          <Link href="/admin/login" className="rounded-2xl px-4 py-3 text-base font-extrabold text-[#0F172A] transition hover:bg-orange-50 hover:text-[#F97316]" onClick={() => setMenuOpen(false)}>
            Login
          </Link>
          <Link href="/contact" className="mt-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0F172A] px-4 py-3 text-base font-extrabold text-white transition hover:bg-[#1E293B]" onClick={() => setMenuOpen(false)}>
            Book Demo
            <ArrowRight size={17} />
          </Link>
        </div>
      </div>
    </header>
  );
}
