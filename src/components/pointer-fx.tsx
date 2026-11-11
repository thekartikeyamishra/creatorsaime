"use client";

import { useEffect } from "react";

/**
 * Site-wide micro-interactions, ~1 KB, zero dependencies:
 *  - [data-spotlight]  soft light that follows the cursor across a card
 *  - [data-magnetic]   buttons that lean a few pixels towards the cursor
 *  - [data-tilt]       gentle 3-D tilt on hover
 *  - [data-reveal]     fade/slide in once when scrolled into view
 *
 * Progressive enhancement: content is fully visible without JS. Pointer effects run only on devices
 * with a fine pointer that can hover; everything is disabled for prefers-reduced-motion. One passive,
 * rAF-throttled listener — no React re-renders, so it cannot hurt INP.
 */
export function PointerFX() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const root = document.documentElement;

    // Scroll reveal
    let io: IntersectionObserver | null = null;
    if (!reduce && "IntersectionObserver" in window) {
      root.classList.add("fx-reveal");
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              e.target.classList.add("is-in");
              io?.unobserve(e.target);
            }
          }
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
      );
      const observe = () => document.querySelectorAll("[data-reveal]:not(.is-in)").forEach((el) => io!.observe(el));
      observe();
      // Pick up content rendered after navigation.
      const mo = new MutationObserver(observe);
      mo.observe(document.body, { childList: true, subtree: true });
      const stop = () => mo.disconnect();
      window.addEventListener("pagehide", stop, { once: true });
    }

    if (reduce || !fine) return () => io?.disconnect();

    let frame = 0;
    let last: PointerEvent | null = null;
    let lastMag: HTMLElement | null = null;
    let lastTilt: HTMLElement | null = null;

    const reset = (el: HTMLElement | null) => {
      if (el) el.style.transform = "";
    };

    const apply = () => {
      frame = 0;
      const e = last;
      if (!e) return;
      const t = e.target as Element | null;

      const spot = t?.closest<HTMLElement>("[data-spotlight]");
      if (spot) {
        const r = spot.getBoundingClientRect();
        spot.style.setProperty("--mx", `${e.clientX - r.left}px`);
        spot.style.setProperty("--my", `${e.clientY - r.top}px`);
      }

      const mag = t?.closest<HTMLElement>("[data-magnetic]") ?? null;
      if (mag !== lastMag) reset(lastMag);
      lastMag = mag;
      if (mag) {
        const r = mag.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        mag.style.transform = `translate(${dx * 6}px, ${dy * 5}px)`;
      }

      const tilt = t?.closest<HTMLElement>("[data-tilt]") ?? null;
      if (tilt !== lastTilt) reset(lastTilt);
      lastTilt = tilt;
      if (tilt) {
        const r = tilt.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        tilt.style.transform = `perspective(900px) rotateX(${(-py * 4).toFixed(2)}deg) rotateY(${(px * 5).toFixed(2)}deg) translateY(-2px)`;
      }
    };

    const onMove = (e: PointerEvent) => {
      last = e;
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const onLeave = () => {
      reset(lastMag);
      reset(lastTilt);
      lastMag = lastTilt = null;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      if (frame) cancelAnimationFrame(frame);
      io?.disconnect();
    };
  }, []);
  return null;
}
