import { Card, Field } from "./Card";
import { Search, RefreshCw } from "lucide-react";

export default function ProductSelector({
  products = [],
  loading = false,
  search = "",
  onSearchChange,
  selected,
  onSelect,
  onReload,
  mode,
  productId,
  onReset,
  saving = false,
}) {
  return (
    <Card
      title="Select Existing Product"
      sub="Load a product to update or continue with a blank form"
    >
      <div className="grid gap-3 sm:grid-cols-[1.5fr,1fr,auto]">
        <div className="relative flex items-center">
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-neutral-500" />
          <input
            value={search}
            onChange={(event) => onSearchChange?.(event.target.value)}
            placeholder="Search products..."
            className="h-9 w-full rounded-md border border-neutral-300 bg-neutral-50 pl-9 pr-3 text-sm placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-300"
          />
        </div>
        <Field label="Products">
          <select
            className="h-9 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-300 disabled:opacity-50"
            value={selected}
            onChange={(event) => onSelect?.(event.target.value)}
            disabled={loading}
          >
            <option value="">New product</option>
            {products.map((product) => (
              <option key={product.product_id} value={product.product_id}>
                #{product.product_id} • {product.title}
              </option>
            ))}
          </select>
        </Field>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReload}
            className="inline-flex h-9 items-center justify-center rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            disabled={!selected || loading}
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              "Load"
            )}
          </button>
          {mode === "edit" ? (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex h-9 items-center justify-center rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
              disabled={saving}
              title={productId ? `Editing product #${productId}` : undefined}
            >
              Reset
            </button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
