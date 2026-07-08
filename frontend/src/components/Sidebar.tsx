"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_SECTIONS = [
  {
    heading: "Overview",
    items: [{ label: "Dashboard", href: "/dashboard" }],
  },
  {
    heading: "Ledgers",
    items: [
      { label: "Subledger", href: "/subledger" },
      { label: "Bank Feed", href: "/bank-feed" },
      { label: "Chart of Accounts", href: "/chart-of-accounts" },
      { label: "Master Directory", href: "/master-directory" },
      { label: "Raw Invoices", href: "/raw-invoices" },
    ],
  },
  {
    heading: "System",
    items: [{ label: "Activity Log", href: "/activity" }],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 min-h-screen bg-[var(--color-ink)] text-parchment/90 flex flex-col">
      <div className="px-6 py-7 border-b border-white/10">
        <h1 className="font-display text-xl text-white leading-tight">
          Source Collection
        </h1>
        <p className="text-xs text-white/50 mt-1 font-mono tracking-wide">
          FIN · BRONZE LAYER
        </p>
      </div>

      <nav className="flex-1 px-3 py-6 space-y-6">
        {NAV_SECTIONS.map((section) => (
          <div key={section.heading}>
            <p className="px-3 mb-2 text-[10px] font-mono uppercase tracking-widest text-white/40">
              {section.heading}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                      active
                        ? "bg-white/10 text-white font-medium"
                        : "text-white/70 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-white/10">
        <Link
          href="/login"
          className="block px-3 py-2 rounded-md text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
        >
          Sign out
        </Link>
        <p className="px-3 mt-2 text-[10px] font-mono text-white/30">v0.1.0</p>
      </div>
    </aside>
  );
}