"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { apiGet, apiPost, apiDelete } from "@/lib/api";
import type { ChartOfAccountsCreate, ChartOfAccountsResponse } from "@/types/chart_of_accounts";
import { useActivity } from "@/context/ActivityContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const FIELDS = ["GL_Account_Code", "Account_Name", "Account_Class", "Financial_Statement_Section"] as const;
type FieldName = (typeof FIELDS)[number];
type FormState = Record<FieldName, string>;
const EMPTY_FORM: FormState = FIELDS.reduce((acc, f) => ({ ...acc, [f]: "" }), {} as FormState);

function isNumeric(value: string): boolean {
  if (value.trim() === "") return false;
  return !isNaN(Number(value.replace(/,/g, "")));
}

export default function ChartOfAccountsPage() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [records, setRecords] = useState<ChartOfAccountsResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const { logActivity } = useActivity();

  async function loadRecords() {
    try {
      const data = await apiGet<ChartOfAccountsResponse[]>("/api/v1/chart-of-accounts?skip=0&limit=25");
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
    if (form.GL_Account_Code.trim() === "") e.GL_Account_Code = "GL Account Code is required";
    else if (!isNumeric(form.GL_Account_Code)) e.GL_Account_Code = "GL Account Code must be numeric";
    if (form.Account_Name.trim() === "") e.Account_Name = "Account Name is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) { toast.error("Please fix the highlighted fields"); return; }
    setLoading(true);
    try {
      await apiPost<ChartOfAccountsResponse>("/api/v1/chart-of-accounts", form as ChartOfAccountsCreate);
      toast.success("Account saved");
      logActivity({ action: "Create", resource: "Chart of Accounts", status: "success", detail: `Account ${form.GL_Account_Code}` });
      setForm(EMPTY_FORM);
      setErrors({});
      await loadRecords();
    } catch (err) {
      toast.error(`Couldn't save: ${(err as Error).message}`);
      logActivity({ action: "Create", resource: "Chart of Accounts", status: "error", detail: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await apiDelete(`/api/v1/chart-of-accounts/${id}`);
      toast.success(`Removed record ${id}`);
      logActivity({ action: "Delete", resource: "Chart of Accounts", status: "success", detail: `Removed record ${id}` });
      await loadRecords();
    } catch (err) {
      toast.error(`Couldn't remove: ${(err as Error).message}`);
    }
  }

  return (
    <main className="max-w-5xl mx-auto px-8 py-10 space-y-8">
      <header className="border-b border-rule pb-5">
        <p className="font-mono text-xs uppercase tracking-widest text-ledger mb-1">Reference · Bronze</p>
        <h1 className="font-display text-3xl text-ink">Chart of Accounts</h1>
        <p className="text-slatetext mt-1">Define the general ledger account structure.</p>
      </header>

      <Card className="p-6 bg-surface border-rule">
        <h2 className="font-display text-lg text-ink mb-5">New account</h2>
        <div className="grid grid-cols-2 gap-5">
          {FIELDS.map((field) => (
            <div key={field} className="space-y-1">
              <Label htmlFor={field}>{field.replace(/_/g, " ")}</Label>
              <Input id={field} value={form[field]} onChange={(e) => handleChange(field, e.target.value)}
                placeholder={field.replace(/_/g, " ")} className={errors[field] ? "border-debit" : ""} />
              {errors[field] && <p className="text-sm text-debit">{errors[field]}</p>}
            </div>
          ))}
        </div>
        <div className="mt-6">
          <Button onClick={handleSubmit} disabled={loading} className="bg-ledger hover:bg-ledger/90 text-white">
            {loading ? "Saving…" : "Save account"}
          </Button>
        </div>
      </Card>

      <Card className="p-6 bg-surface border-rule">
        <h2 className="font-display text-lg text-ink mb-5">
          Recent records <span className="ml-2 font-mono text-sm text-slatetext">({records.length})</span>
        </h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-mono text-xs uppercase tracking-wider">ID</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider">GL Code</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider">Account Name</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider">Class</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider">Section</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-slatetext py-8">No accounts yet. Add one above to get started.</TableCell></TableRow>
              ) : (
                records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="ledger-figure text-slatetext">{r.id}</TableCell>
                    <TableCell className="font-mono text-xs">{r.GL_Account_Code}</TableCell>
                    <TableCell>{r.Account_Name}</TableCell>
                    <TableCell>{r.Account_Class}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{r.Financial_Statement_Section}</TableCell>
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