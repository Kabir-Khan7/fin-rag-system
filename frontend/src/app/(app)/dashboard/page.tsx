"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { apiGet } from "@/lib/api";
import { Card } from "@/components/ui/card";

const TABLES = [
  { label: "Subledger", path: "/api/v1/transactions", href: "/subledger", section: "Ledgers" },
  { label: "Bank Feed", path: "/api/v1/bank-feed", href: "/bank-feed", section: "Ledgers" },
  { label: "Raw Invoices", path: "/api/v1/raw-invoices", href: "/raw-invoices", section: "Ledgers" },
  { label: "Chart of Accounts", path: "/api/v1/chart-of-accounts", href: "/chart-of-accounts", section: "Reference" },
  { label: "Master Directory", path: "/api/v1/master-directory", href: "/master-directory", section: "Reference" },
];

export default function DashboardPage() {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    TABLES.forEach(async (table) => {
      try {
        const data = await apiGet<unknown[]>(`${table.path}?skip=0&limit=100`);
        setCounts((prev) => ({ ...prev, [table.label]: data.length }));
      } catch {
        setCounts((prev) => ({ ...prev, [table.label]: -1 }));
      }
    });
  }, []);

  function renderCount(label: string): string {
    const c = counts[label];
    if (c === undefined) return "…";
    if (c === -1) return "—";
    return `${c}${c === 100 ? "+" : ""}`;
  }

  return (
    <main className="max-w-6xl mx-auto px-8 py-10 space-y-8">
      <header className="border-b border-rule pb-5">
        <p className="font-mono text-xs uppercase tracking-widest text-ledger mb-1">
          Source Collection
        </p>
        <h1 className="font-display text-3xl text-ink">Dashboard</h1>
        <p className="text-slatetext mt-1">
          Bronze-layer ingestion overview across all staging tables.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {TABLES.map((table) => (
          <Link key={table.href} href={table.href}>
            <Card className="p-6 bg-surface border-rule hover:border-ledger/40 hover:shadow-sm transition-all cursor-pointer group">
              <div className="flex items-center justify-between mb-3">
                <p className="font-mono text-[10px] uppercase tracking-widest text-slatetext">
                  {table.section}
                </p>
                <span className="text-slatetext group-hover:text-ledger transition-colors">→</span>
              </div>
              <h2 className="font-display text-lg text-ink">{table.label}</h2>
              <p className="ledger-figure text-4xl text-ledger mt-3 !text-left">
                {renderCount(table.label)}
              </p>
              <p className="text-xs text-slatetext mt-1">recent records</p>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}