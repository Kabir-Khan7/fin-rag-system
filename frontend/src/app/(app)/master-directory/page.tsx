"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { apiGet, apiPost, apiDelete } from "@/lib/api";
import type { MasterDirectoryCreate, MasterDirectoryResponse } from "@/types/master_directory";
import { useActivity } from "@/context/ActivityContext";
import { DateField } from "@/components/DateField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const TEXT_FIELDS = ["Legal_Name", "Trade_Name", "Tax_Registration_Number", "Country_Code", "Is_Active", "Entity_ID"] as const;
const DATE_FIELDS = ["Account_Creation_Date"] as const;
const ALL_FIELDS = [...TEXT_FIELDS, ...DATE_FIELDS] as const;
type FieldName = (typeof ALL_FIELDS)[number];
type FormState = Record<FieldName, string>;
const EMPTY_FORM: FormState = ALL_FIELDS.reduce((acc, f) => ({ ...acc, [f]: "" }), {} as FormState);

export default function MasterDirectoryPage() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [records, setRecords] = useState<MasterDirectoryResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const { logActivity } = useActivity();

  async function loadRecords() {
    try {
      const data = await apiGet<MasterDirectoryResponse[]>("/api/v1/master-directory?skip=0&limit=25");
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
    if (form.Entity_ID.trim() === "") e.Entity_ID = "Entity ID is required";
    if (form.Legal_Name.trim() === "") e.Legal_Name = "Legal Name is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) { toast.error("Please fix the highlighted fields"); return; }
    setLoading(true);
    try {
      await apiPost<MasterDirectoryResponse>("/api/v1/master-directory", form as MasterDirectoryCreate);
      toast.success("Entity saved");
      logActivity({ action: "Create", resource: "Master Directory", status: "success", detail: `Entity ${form.Entity_ID}` });
      setForm(EMPTY_FORM);
      setErrors({});
      await loadRecords();
    } catch (err) {
      toast.error(`Couldn't save: ${(err as Error).message}`);
      logActivity({ action: "Create", resource: "Master Directory", status: "error", detail: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await apiDelete(`/api/v1/master-directory/${id}`);
      toast.success(`Removed record ${id}`);
      logActivity({ action: "Delete", resource: "Master Directory", status: "success", detail: `Removed record ${id}` });
      await loadRecords();
    } catch (err) {
      toast.error(`Couldn't remove: ${(err as Error).message}`);
    }
  }

  return (
    <main className="max-w-5xl mx-auto px-8 py-10 space-y-8">
      <header className="border-b border-rule pb-5">
        <p className="font-mono text-xs uppercase tracking-widest text-ledger mb-1">Reference · Bronze</p>
        <h1 className="font-display text-3xl text-ink">Master Directory</h1>
        <p className="text-slatetext mt-1">Maintain the registry of entities and counterparties.</p>
      </header>

      <Card className="p-6 bg-surface border-rule">
        <h2 className="font-display text-lg text-ink mb-5">New entity</h2>
        <div className="grid grid-cols-2 gap-5">
          {TEXT_FIELDS.map((field) => (
            <div key={field} className="space-y-1">
              <Label htmlFor={field}>{field.replace(/_/g, " ")}</Label>
              <Input id={field} value={form[field]} onChange={(e) => handleChange(field, e.target.value)}
                placeholder={field.replace(/_/g, " ")} className={errors[field] ? "border-debit" : ""} />
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
            {loading ? "Saving…" : "Save entity"}
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
                <TableHead className="font-mono text-xs uppercase tracking-wider">Entity ID</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider">Legal Name</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider">Country</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider">Active</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-slatetext py-8">No entities yet. Add one above to get started.</TableCell></TableRow>
              ) : (
                records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="ledger-figure text-slatetext">{r.id}</TableCell>
                    <TableCell className="font-mono text-xs">{r.Entity_ID}</TableCell>
                    <TableCell className="max-w-[180px] truncate">{r.Legal_Name}</TableCell>
                    <TableCell>{r.Country_Code}</TableCell>
                    <TableCell>{r.Is_Active}</TableCell>
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