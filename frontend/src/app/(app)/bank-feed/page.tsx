"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { apiGet, apiPost, apiDelete } from "@/lib/api";
import type { BankFeedCreate, BankFeedResponse } from "@/types/bank_feed";
import { useActivity } from "@/context/ActivityContext";
import { BulkUpload } from "@/components/BulkUpload";
import { DateField } from "@/components/DateField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const TEXT_FIELDS = ["Bank_Row_ID", "Transaction_Text_Narrative", "Amount", "Running_Balance"] as const;
const DATE_FIELDS = ["Booking_Date", "Value_Date"] as const;

const ALL_FIELDS = [...TEXT_FIELDS, ...DATE_FIELDS] as const;
type FieldName = (typeof ALL_FIELDS)[number];
type FormState = Record<FieldName, string>;

const EMPTY_FORM: FormState = ALL_FIELDS.reduce((acc, f) => ({ ...acc, [f]: "" }), {} as FormState);

function isNumeric(value: string): boolean {
  if (value.trim() === "") return false;
  return !isNaN(Number(value.replace(/,/g, "")));
}

function LedgerFigure({ value }: { value?: string }) {
  if (!value) return <span className="ledger-figure text-slatetext">—</span>;
  const num = Number(value.replace(/,/g, ""));
  const isNegative = !isNaN(num) && num < 0;
  return <span className={`ledger-figure ${isNegative ? "text-debit" : "text-credit"}`}>{value}</span>;
}

export default function BankFeedPage() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [records, setRecords] = useState<BankFeedResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const { logActivity } = useActivity();

  async function loadRecords() {
    try {
      const data = await apiGet<BankFeedResponse[]>("/api/v1/bank-feed?skip=0&limit=25");
      setRecords(data);
    } catch (err) {
      toast.error(`Couldn't load records: ${(err as Error).message}`);
    }
  }

  useEffect(() => { loadRecords(); }, []);

  function handleChange(field: FieldName, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate(): boolean {
    const e: Partial<Record<FieldName, string>> = {};
    if (form.Bank_Row_ID.trim() === "") e.Bank_Row_ID = "Bank Row ID is required";
    if (form.Amount.trim() === "") e.Amount = "Amount is required";
    else if (!isNumeric(form.Amount)) e.Amount = "Amount must be a number";
    if (form.Running_Balance.trim() !== "" && !isNumeric(form.Running_Balance))
      e.Running_Balance = "Running Balance must be numeric";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) { toast.error("Please fix the highlighted fields"); return; }
    setLoading(true);
    try {
      await apiPost<BankFeedResponse>("/api/v1/bank-feed", form as BankFeedCreate);
      toast.success("Bank feed record saved");
      logActivity({ action: "Create", resource: "Bank Feed", status: "success", detail: `Row ${form.Bank_Row_ID}` });
      setForm(EMPTY_FORM);
      setErrors({});
      await loadRecords();
    } catch (err) {
      toast.error(`Couldn't save: ${(err as Error).message}`);
      logActivity({ action: "Create", resource: "Bank Feed", status: "error", detail: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await apiDelete(`/api/v1/bank-feed/${id}`);
      toast.success(`Removed record ${id}`);
      logActivity({ action: "Delete", resource: "Bank Feed", status: "success", detail: `Removed record ${id}` });
      await loadRecords();
    } catch (err) {
      toast.error(`Couldn't remove: ${(err as Error).message}`);
    }
  }

  return (
    <main className="max-w-5xl mx-auto px-8 py-10 space-y-8">
      <header className="border-b border-rule pb-5">
        <p className="font-mono text-xs uppercase tracking-widest text-ledger mb-1">Ledgers · Bronze</p>
        <h1 className="font-display text-3xl text-ink">Bank Feed</h1>
        <p className="text-slatetext mt-1">Record raw bank statement lines before reconciliation.</p>
      </header>

      <Card className="p-6 bg-surface border-rule">
        <h2 className="font-display text-lg text-ink mb-5">New bank feed record</h2>
        <div className="grid grid-cols-2 gap-5">
          {TEXT_FIELDS.map((field) => (
            <div key={field} className="space-y-1">
              <Label htmlFor={field}>{field.replace(/_/g, " ")}</Label>
              <Input
                id={field}
                value={form[field]}
                onChange={(e) => handleChange(field, e.target.value)}
                placeholder={field.replace(/_/g, " ")}
                className={errors[field] ? "border-debit" : ""}
              />
              {errors[field] && <p className="text-sm text-debit">{errors[field]}</p>}
            </div>
          ))}
          {DATE_FIELDS.map((field) => (
            <DateField key={field} label={field.replace(/_/g, " ")} value={form[field]}
              onChange={(v) => handleChange(field, v)} error={errors[field]} />
          ))}
        </div>
        <div className="mt-6">
          <Button onClick={handleSubmit} disabled={loading} className="bg-ledger hover:bg-ledger/90 text-white">
            {loading ? "Saving…" : "Save record"}
          </Button>
        </div>
      </Card>

      <BulkUpload
        uploadPath="/api/v1/bank-feed/upload"
        onSuccess={loadRecords}
        expectedColumns={["Bank_Row_ID", "Booking_Date", "Value_Date", "Transaction_Text_Narrative", "Amount", "Running_Balance"]}
      />

      <Card className="p-6 bg-surface border-rule">
        <h2 className="font-display text-lg text-ink mb-5">
          Recent records <span className="ml-2 font-mono text-sm text-slatetext">({records.length})</span>
        </h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-mono text-xs uppercase tracking-wider">ID</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider">Bank Row</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider text-right">Amount</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider text-right">Balance</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider">Booking Date</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-slatetext py-8">No records yet. Add a bank feed line above to get started.</TableCell></TableRow>
              ) : (
                records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="ledger-figure text-slatetext">{r.id}</TableCell>
                    <TableCell className="font-mono text-xs max-w-[160px] truncate">{r.Bank_Row_ID}</TableCell>
                    <TableCell><LedgerFigure value={r.Amount} /></TableCell>
                    <TableCell><LedgerFigure value={r.Running_Balance} /></TableCell>
                    <TableCell>{r.Booking_Date}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="text-debit hover:bg-debit/10" onClick={() => handleDelete(r.id)}>Remove</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </main>
  );
}