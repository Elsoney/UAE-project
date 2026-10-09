"use client";

import { useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { NavLinks, type NavItem } from "./nav-links";

/** Disclosure menu for small screens: Escape closes it and focus returns to the button. */
export function MobileNav({ items, openLabel, closeLabel, navLabel }: { items: NavItem[]; openLabel: string; closeLabel: string; navLabel: string }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);

  // Close when the page changes.
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>("a")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border-2 border-indigo/15 text-indigo"
      >
        <span className="sr-only">{open ? closeLabel : openLabel}</span>
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>
      <div
        id={panelId}
        ref={panelRef}
        hidden={!open}
        className="absolute inset-x-0 top-full z-40 border-b-4 border-madder bg-plaster px-4 pb-6 pt-2 shadow-lg"
      >
        <nav aria-label={navLabel}>
          <NavLinks items={items} onNavigate={() => setOpen(false)} className="flex flex-col gap-1 text-lg" />
        </nav>
      </div>
    </div>
  );
}
