"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/upload", label: "Upload Receipt" },
  { href: "/receipts", label: "History" },
];

function Avatars() {
  return (
    <div className="flex items-center gap-1.5">
      <div
        style={{ width: 26, height: 26, borderRadius: "50%", background: "#00B8B8" }}
        className="flex items-center justify-center"
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: "#FFF" }}>R</span>
      </div>
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: "50%",
          background: "#1A1A18",
          marginLeft: -8,
          border: "2px solid #FFF",
        }}
        className="flex items-center justify-center"
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: "#FFF" }}>B</span>
      </div>
    </div>
  );
}

export default function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <div style={{ background: "#FFFFFF", borderBottom: "1px solid #ECEAE4" }}>
      <div className="px-4 sm:px-8 flex items-center justify-between" style={{ height: 60 }}>
        <Link href="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <div
            style={{ width: 30, height: 30, borderRadius: 8, background: "#00B8B8" }}
            className="flex items-center justify-center flex-none"
          >
            <span className="font-serif" style={{ fontSize: 12, color: "#FFF" }}>
              21P
            </span>
          </div>
          <span className="font-serif" style={{ fontSize: 17, color: "#1A1A18" }}>
            Build Budget
          </span>
        </Link>

        <div className="hidden sm:flex items-center gap-0.5">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                fontSize: 14,
                fontWeight: isActive(link.href) ? 600 : 400,
                color: isActive(link.href) ? "#1A1A18" : "#6B6B65",
                padding: "6px 14px",
                borderRadius: 8,
                background: isActive(link.href) ? "#F0EFE9" : "transparent",
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden sm:block">
          <Avatars />
        </div>

        <button
          type="button"
          aria-label="Menu"
          className="sm:hidden flex items-center justify-center"
          style={{ width: 32, height: 32 }}
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#1A1A18" strokeWidth="1.8" strokeLinecap="round">
            {open ? (
              <path d="M5 5l10 10M15 5L5 15" />
            ) : (
              <path d="M3 6h14M3 10h14M3 14h14" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <div className="sm:hidden flex flex-col px-4 pb-4" style={{ borderTop: "1px solid #ECEAE4" }}>
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              style={{
                fontSize: 15,
                fontWeight: isActive(link.href) ? 600 : 400,
                color: isActive(link.href) ? "#1A1A18" : "#6B6B65",
                padding: "10px 8px",
                borderRadius: 8,
                background: isActive(link.href) ? "#F0EFE9" : "transparent",
                marginTop: 8,
              }}
            >
              {link.label}
            </Link>
          ))}
          <div style={{ marginTop: 12 }}>
            <Avatars />
          </div>
        </div>
      )}
    </div>
  );
}
