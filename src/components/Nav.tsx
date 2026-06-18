"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/upload", label: "Upload Receipt" },
  { href: "/receipts", label: "History" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <div
      style={{
        background: "#FFFFFF",
        borderBottom: "1px solid #ECEAE4",
        height: 60,
      }}
      className="px-8 flex items-center justify-between"
    >
      <Link href="/" className="flex items-center gap-2.5">
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

      <div className="flex items-center gap-0.5">
        {LINKS.map((link) => {
          const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              style={{
                fontSize: 14,
                fontWeight: active ? 600 : 400,
                color: active ? "#1A1A18" : "#6B6B65",
                padding: "6px 14px",
                borderRadius: 8,
                background: active ? "#F0EFE9" : "transparent",
              }}
            >
              {link.label}
            </Link>
          );
        })}
      </div>

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
    </div>
  );
}
