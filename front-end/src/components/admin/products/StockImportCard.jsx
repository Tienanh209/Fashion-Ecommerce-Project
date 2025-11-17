import { Card } from "./Card";
import { Upload } from "lucide-react";

export default function StockImportCard({
  instructions,
  importing = false,
  onImport,
}) {
  return (
    <Card title="Import Stock" sub="Update or add variants from Excel">
      <p className="text-xs text-neutral-500">{instructions}</p>
      <label className="mt-3 inline-flex h-10 cursor-pointer items-center justify-center rounded-md border border-neutral-300 bg-white px-4 text-sm text-neutral-700 hover:bg-neutral-50">
        <Upload className="mr-2 h-4 w-4" />
        {importing ? "Importing..." : "Import Excel"}
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={onImport}
          className="hidden"
          disabled={importing}
        />
      </label>
    </Card>
  );
}
