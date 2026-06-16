"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export function ScrollToTop() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });

    window.requestAnimationFrame(() => {
      document.querySelectorAll<HTMLElement>("main, [role='main'], .overflow-y-auto, .overflow-auto").forEach((element) => {
        if (element.scrollTop > 0) {
          element.scrollTo({ top: 0, left: 0, behavior: "auto" });
        }
      });
    });
  }, [pathname, searchParams]);

  return null;
}
