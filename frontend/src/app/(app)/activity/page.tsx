"use client";

import { useActivity } from "@/context/ActivityContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export default function ActivityPage() {
  const { entries, clearActivity } = useActivity();

  return (
    <main className="max-w-6xl mx-auto px-8 py-10 space-y-8">
      <header className="border-b border-rule pb-5 flex items-end justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-ledger mb-1">
            System
          </p>
          <h1 className="font-display text-3xl text-ink">Activity Log</h1>
          <p className="text-slatetext mt-1">
            Actions recorded during this session.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={clearActivity}
          disabled={entries.length === 0}
          className="border-rule"
        >
          Clear log
        </Button>
      </header>

      <Card className="p-6 bg-surface border-rule">
        {entries.length === 0 ? (
          <p className="text-slatetext text-center py-12">
            Nothing logged yet. Create, upload, or remove a record and it appears here.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-mono text-xs uppercase tracking-wider">Time</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider">Action</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider">Resource</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider">Status</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider">Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-xs text-slatetext">{e.timestamp}</TableCell>
                  <TableCell className="font-medium">{e.action}</TableCell>
                  <TableCell>{e.resource}</TableCell>
                  <TableCell>
                    <span className={`font-mono text-xs ${e.status === "success" ? "text-credit" : "text-debit"}`}>
                      {e.status === "success" ? "● success" : "● error"}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[320px] truncate text-slatetext">{e.detail}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </main>
  );
}