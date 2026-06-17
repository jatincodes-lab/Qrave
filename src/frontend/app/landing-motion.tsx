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

    if (reduceMotion) {
      revealItems.forEach((item) => item.classList.add("is-visible"));
      if (hero) {
        hero.style.setProperty("--hero-y", "0px");
        hero.style.setProperty("--hero-scale", "1");
        hero.style.setProperty("--hero-opacity", "1");
        hero.style.setProperty("--hero-blur", "0px");
        hero.style.setProperty("--hero-brightness", "1");
        hero.style.setProperty("--hero-tilt", "0deg");
        hero.style.setProperty("--hero-sheen-y", "140%");
        hero.style.setProperty("--hero-sheen-opacity", "0");
      }
      return;
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
        rootMargin: "0px 0px -12% 0px",
        threshold: 0.16
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
        const progress = easeOutCubic(clamp((scrollY - 18) / 420, 0, 1));
        hero.style.setProperty("--hero-y", `${Math.round(92 - progress * 92)}px`);
        hero.style.setProperty("--hero-scale", `${0.88 + progress * 0.12}`);
        hero.style.setProperty("--hero-opacity", `${0.5 + progress * 0.5}`);
        hero.style.setProperty("--hero-blur", `${Math.round(16 - progress * 16)}px`);
        hero.style.setProperty("--hero-brightness", `${0.72 + progress * 0.28}`);
        hero.style.setProperty("--hero-tilt", `${12 - progress * 12}deg`);
        hero.style.setProperty("--hero-sheen-y", `${-130 + progress * 275}%`);
        hero.style.setProperty("--hero-sheen-opacity", `${progress > 0.08 && progress < 0.98 ? 0.42 : 0.08}`);
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
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, []);

  return null;
}
