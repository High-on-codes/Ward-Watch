"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Mark } from "@/components/Icon";
import { NAV } from "@/lib/site";

export default function SiteHeader() {
  const path = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <header className={"topbar" + (scrolled ? " is-scrolled" : "")}>
      <a href="#main" className="skip">Skip to content</a>
      <Link href="/" className="brand" aria-label="Ward Watch home">
        <Mark />
        <span>Ward Watch</span>
      </Link>
      <nav aria-label="Main">
        {NAV.map((n) => {
          const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
          return (
            <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined}>
              {n.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
