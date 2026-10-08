"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Site-wide motion: soft reveals ([data-reveal]), easing counters ([data-count]),
 * and scroll-traced routes ([data-trace-wrap] with a [data-trace] path and [data-step] nodes).
 * Everything renders final state when the user prefers reduced motion.
 */
export default function Motion() {
  const path = usePathname();

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const reveals = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-in)"));
    const counters = Array.from(document.querySelectorAll<HTMLElement>("[data-count]"));
    const traces = Array.from(document.querySelectorAll<HTMLElement>("[data-trace-wrap]"));

    const finishCount = (el: HTMLElement) => {
      const to = Number(el.dataset.count);
      const dec = Number(el.dataset.dec || 0);
      if (reduce) { el.textContent = to.toFixed(dec); return; }
      const t0 = performance.now();
      const dur = 1400;
      const step = (t: number) => {
        const k = Math.min(1, (t - t0) / dur);
        const e = 1 - Math.pow(1 - k, 4);
        el.textContent = (to * e).toFixed(dec);
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    if (reduce || !("IntersectionObserver" in window)) {
      reveals.forEach((el) => el.classList.add("is-in"));
      counters.forEach(finishCount);
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          const el = en.target as HTMLElement;
          if (el.dataset.count !== undefined) finishCount(el);
          else el.classList.add("is-in");
          io.unobserve(el);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );
    if (!reduce) {
      reveals.forEach((el) => io.observe(el));
      counters.forEach((el) => io.observe(el));
    }
    // A fast flick or anchor jump can skip an element past the viewport; reveal anything already above it.
    const sweep = () => {
      const vh = window.innerHeight;
      reveals.forEach((el) => {
        if (!el.classList.contains("is-in") && el.getBoundingClientRect().top < vh) { el.classList.add("is-in"); io.unobserve(el); }
      });
    };
    if (!reduce) window.addEventListener("scroll", sweep, { passive: true });

    // Route traces: path draws with scroll, steps light up as the line reaches them.
    const prepared = traces.map((wrap) => {
      const p = wrap.querySelector<SVGPathElement>("[data-trace]");
      const len = p ? p.getTotalLength() : 0;
      if (p) { p.style.strokeDasharray = `${len}`; p.style.strokeDashoffset = reduce ? "0" : `${len}`; }
      return { wrap, p, len, steps: Array.from(wrap.querySelectorAll<HTMLElement>("[data-step]")) };
    });
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const vh = window.innerHeight;
        prepared.forEach(({ wrap, p, len, steps }) => {
          const r = wrap.getBoundingClientRect();
          const k = Math.min(1, Math.max(0, (vh * 0.62 - r.top) / r.height));
          if (p) p.style.strokeDashoffset = `${len * (1 - k)}`;
          wrap.style.setProperty("--trace", k.toFixed(3));
          steps.forEach((s) => {
            const sr = s.getBoundingClientRect();
            s.classList.toggle("is-lit", sr.top + sr.height * 0.3 < vh * 0.62);
          });
        });
      });
    };
    if (prepared.length) {
      if (reduce) prepared.forEach(({ steps }) => steps.forEach((s) => s.classList.add("is-lit")));
      else {
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll);
      }
    }

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", sweep);
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [path]);

  return null;
}
