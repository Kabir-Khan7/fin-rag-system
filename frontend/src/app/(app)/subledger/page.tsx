"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { apiGet, apiPost, apiDelete } from "@/lib/api";
import type { SubledgerCreate, SubledgerResponse } from "@/types/subledger";
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

// Text fields (rendered as plain inputs).
const TEXT_FIELDS = [
  "Transaction_ID",
  "GL_Account_Code",
  "Entity_ID",
  "Amount",
  "Transaction_Type",
  "Description",
] as const;

// Date fields (rendered with the date picker).
const DATE_FIELDS = ["System_Timestamp", "Document_Date"] as const;

// Status options for the dropdown.
const STATUS_OPTIONS = ["Posted", "Draft", "Pending"];

const ALL_FIELDS = [...TEXT_FIELDS, ...DATE_FIELDS, "Status"] as const;
type FieldName = (typeof ALL_FIELDS)[number];
type FormState = Record<FieldName, string>;

const EMPTY_FORM: FormState = ALL_FIELDS.reduce(
  (acc, f) => ({ ...acc, [f]: "" }), {} as FormState
);

function isNumeric(value: string): boolean {
  if (value.trim() === "") return false;
  return !isNaN(Number(value.replace(/,/g, "")));
}

// Render a figure (amount) in ledger style: mono, colored by sign.
function LedgerFigure({ value }: { value?: string }) {
  if (!value) return <span className="ledger-figure text-slatetext">—</span>;
  const num = Number(value.replace(/,/g, ""));
  const isNegative = !isNaN(num) && num < 0;
  return (
    <span className={`ledger-figure ${isNegative ? "text-debit" : "text-credit"}`}>
      {value}
    </span>
  );
}

export default function SubledgerPage() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [records, setRecords] = useState<SubledgerResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const { logActivity } = useActivity();

  async function loadRecords() {
    try {
      const data = await apiGet<SubledgerResponse[]>(
        "/api/v1/transactions?skip=0&limit=25"
      );
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
    if (form.Transaction_ID.trim() === "") e.Transaction_ID = "Transaction ID is required";
    if (form.Amount.trim() === "") e.Amount = "Amount is required";
    else if (!isNumeric(form.Amount)) e.Amount = "Amount must be a number";
    if (form.GL_Account_Code.trim() !== "" && !isNumeric(form.GL_Account_Code))
      e.GL_Account_Code = "GL Account Code must be numeric";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) { toast.error("Please fix the highlighted fields"); return; }
    setLoading(true);
    try {
      await apiPost<SubledgerResponse>("/api/v1/transactions", form as SubledgerCreate);
      toast.success("Transaction saved");
      logActivity({
        action: "Create", resource: "Subledger", status: "success",
        detail: `Transaction ${form.Transaction_ID}`,
      });
      setForm(EMPTY_FORM);
      setErrors({});
      await loadRecords();
    } catch (err) {
      toast.error(`Couldn't save: ${(err as Error).message}`);
      logActivity({
        action: "Create", resource: "Subledger", status: "error",
        detail: (err as Error).message,
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await apiDelete(`/api/v1/transactions/${id}`);
      toast.success(`Removed record ${id}`);
      logActivity({
        action: "Delete", resource: "Subledger", status: "success",
        detail: `Removed record ${id}`,
      });
      await loadRecords();
    } catch (err) {
      toast.error(`Couldn't remove: ${(err as Error).message}`);
    }
  }

  return (
    <main className="max-w-5xl mx-auto px-8 py-10 space-y-8">
      {/* Header */}
      <header className="border-b border-rule pb-5">
        <p className="font-mono text-xs uppercase tracking-widest text-ledger mb-1">
          Ledgers · Bronze
        </p>
        <h1 className="font-display text-3xl text-ink">Subledger</h1>
        <p className="text-slatetext mt-1">
          Record raw subledger transactions before transformation.
        </p>
      </header>

      {/* Entry Form */}
      <Card className="p-6 bg-surface border-rule">
        <h2 className="font-display text-lg text-ink mb-5">New transaction</h2>
        <div className="grid grid-cols-2 gap-5">
          {/* Text fields */}
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

          {/* Date fields */}
          {DATE_FIELDS.map((field) => (
            <DateField
              key={field}
              label={field.replace(/_/g, " ")}
              value={form[field]}
              onChange={(v) => handleChange(field, v)}
              error={errors[field]}
            />
          ))}

          {/* Status dropdown */}
          <div className="space-y-1">
            <Label htmlFor="Status">Status</Label>
            <select
              id="Status"
              value={form.Status}
              onChange={(e) => handleChange("Status", e.target.value)}
              className="w-full h-9 rounded-md border border-rule bg-surface px-3 text-sm"
            >
              <option value="">Select status</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-6">
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-ledger hover:bg-ledger/90 text-white"
          >
            {loading ? "Saving…" : "Save transaction"}
          </Button>
        </div>
      </Card>

      {/* Bulk Upload */}
      <BulkUpload
        uploadPath="/api/v1/transactions/upload"
        onSuccess={loadRecords}
        expectedColumns={[
          "Transaction_ID", "System_Timestamp", "Document_Date",
          "GL_Account_Code", "Entity_ID", "Amount",
          "Transaction_Type", "Status", "Description",
        ]}
      />

      {/* Records Table */}
      <Card className="p-6 bg-surface border-rule">
        <h2 className="font-display text-lg text-ink mb-5">
          Recent records
          <span className="ml-2 font-mono text-sm text-slatetext">
            ({records.length})
          </span>
        </h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-mono text-xs uppercase tracking-wider">ID</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider">Transaction</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider text-right">Amount</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider">Status</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider">Description</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slatetext py-8">
                    No records yet. Add a transaction above to get started.
                  </TableCell>
                </TableRow>
              ) : (
                records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="ledger-figure text-slatetext">{r.id}</TableCell>
                    <TableCell className="font-mono text-xs max-w-[180px] truncate">
                      {r.Transaction_ID}
                    </TableCell>
                    <TableCell><LedgerFigure value={r.Amount} /></TableCell>
                    <TableCell>{r.Status}</TableCell>
                    <TableCell className="max-w-[220px] truncate">{r.Description}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-debit hover:bg-debit/10"
                        onClick={() => handleDelete(r.id)}
                      >
                        Remove
                      </Button>
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