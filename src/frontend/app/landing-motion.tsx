"use client";

import { useEffect } from "react";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3);
}

export function LandingMotion() {
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const revealItems = Array.from(document.querySelectorAll<HTMLElement>("[data-landing-reveal]"));
    const hero = document.querySelector<HTMLElement>("[data-hero-wake]");
    const floatItems = Array.from(document.querySelectorAll<HTMLElement>("[data-scroll-float]"));

    const handleSmoothAnchorClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href]");
      const href = link?.getAttribute("href");

      if (!href || (!href.startsWith("#") && !href.startsWith("/#"))) {
        return;
      }

      if (href.startsWith("/#") && window.location.pathname !== "/") {
        return;
      }

      const hash = href.slice(href.indexOf("#") + 1);
      const target = document.getElementById(decodeURIComponent(hash));

      if (!target) {
        return;
      }

      event.preventDefault();
      window.history.pushState(null, "", href.startsWith("/#") ? `/#${hash}` : `#${hash}`);
      const top = target.getBoundingClientRect().top + window.scrollY - 116;
      window.scrollTo({ top: Math.max(0, top), behavior: reduceMotion ? "auto" : "smooth" });
    };

    document.addEventListener("click", handleSmoothAnchorClick);

    if (reduceMotion) {
      revealItems.forEach((item) => item.classList.add("is-visible"));
      if (hero) {
        hero.style.setProperty("--hero-y", "0px");
        hero.style.setProperty("--hero-scale", "1");
        hero.style.setProperty("--hero-opacity", "1");
        hero.style.setProperty("--hero-brightness", "1");
        hero.style.setProperty("--hero-tilt", "0deg");
        hero.style.setProperty("--hero-sheen-y", "140%");
        hero.style.setProperty("--hero-sheen-opacity", "0");
      }
      return () => document.removeEventListener("click", handleSmoothAnchorClick);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        rootMargin: "0px 0px -15% 0px",
        threshold: 0
      }
    );

    revealItems.forEach((item, index) => {
      if (!item.style.getPropertyValue("--reveal-delay")) {
        item.style.setProperty("--reveal-delay", `${Math.min((index % 5) * 70, 280)}ms`);
      }
      observer.observe(item);
    });

    let ticking = false;

    const updateScrollMotion = () => {
      const scrollY = window.scrollY;

      if (hero) {
        const progress = easeOutCubic(clamp((scrollY - 150) / 760, 0, 1));
        hero.style.setProperty("--hero-y", `${Math.round(148 - progress * 148)}px`);
        hero.style.setProperty("--hero-scale", `${0.82 + progress * 0.18}`);
        hero.style.setProperty("--hero-opacity", `${0.28 + progress * 0.72}`);
        hero.style.setProperty("--hero-brightness", `${0.58 + progress * 0.42}`);
        hero.style.setProperty("--hero-tilt", `${18 - progress * 18}deg`);
        hero.style.setProperty("--hero-sheen-y", `${-165 + progress * 310}%`);
        hero.style.setProperty("--hero-sheen-opacity", `${progress > 0.12 && progress < 0.96 ? 0.36 : 0.04}`);
      }

      floatItems.forEach((item, index) => {
        const rect = item.getBoundingClientRect();
        const centerOffset = (rect.top + rect.height / 2 - window.innerHeight / 2) / window.innerHeight;
        const direction = index % 2 === 0 ? -1 : 1;
        const distance = clamp(centerOffset * 36 * direction, -28, 28);
        item.style.setProperty("--float-y", `${distance.toFixed(1)}px`);
      });

      ticking = false;
    };

    const requestUpdate = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollMotion);
        ticking = true;
      }
    };

    updateScrollMotion();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      observer.disconnect();
      document.removeEventListener("click", handleSmoothAnchorClick);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, []);

  return null;
}
