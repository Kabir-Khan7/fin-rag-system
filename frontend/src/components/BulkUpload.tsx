"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";

import { apiUpload } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface BulkUploadResult {
  inserted_count: number;
  message: string;
}

interface BulkUploadProps {
  /** The upload endpoint, e.g. "/api/v1/transactions/upload". */
  uploadPath: string;
  /** Called after a successful upload so the parent can refresh its list. */
  onSuccess?: () => void;
  /** Expected column headers, shown as a hint to the user. */
  expectedColumns: string[];
}

export function BulkUpload({ uploadPath, onSuccess, expectedColumns }: BulkUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
  }

  async function handleUpload() {
    if (!file) {
      toast.error("Please choose a file first");
      return;
    }

    setUploading(true);
    try {
      const result = await apiUpload<BulkUploadResult>(uploadPath, file);
      toast.success(result.message || `Inserted ${result.inserted_count} records`);
      setFile(null);
      if (inputRef.current) inputRef.current.value = ""; // reset the input
      onSuccess?.();
    } catch (err) {
      toast.error(`Upload failed: ${(err as Error).message}`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-2">Bulk Upload (Excel / CSV)</h2>
      <p className="text-sm text-gray-500 mb-4">
        File headers must match: {expectedColumns.join(", ")}
      </p>
      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx"
          onChange={handleFileChange}
          className="block text-sm"
        />
        <Button onClick={handleUpload} disabled={uploading || !file}>
          {uploading ? "Uploading..." : "Upload File"}
        </Button>
      </div>
      {file && (
        <p className="text-sm text-gray-600 mt-2">Selected: {file.name}</p>
      )}
    </Card>
  );
}