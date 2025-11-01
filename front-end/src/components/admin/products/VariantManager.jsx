import { useState } from "react";
import { Card } from "./Card";
import { Trash2, Pencil, X, Check, Plus } from "lucide-react";


export default function VariantManager({
  variants = [],
  variantForm,
  variantBusy,
  onVariantChange,
  onAddVariant,
  onDeleteVariant,
  onUpdateVariant,
  disableActions = false,
  sizeOptions,
  colorOptions,
}) {
  const [editingId, setEditingId] = useState(null);
  const [editingDraft, setEditingDraft] = useState({
    price: "",
    stock: "",
  });

  const startEdit = (variant) => {
    setEditingId(variant.variant_id);
    setEditingDraft({
      price: variant.price ?? "",
      stock: variant.stock ?? "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingDraft({ price: "", stock: "" });
  };

  const submitEdit = async () => {
    if (!editingId) return;
    await onUpdateVariant?.(editingId, editingDraft);
    cancelEdit();
  };

  return (
    <Card
      title="Variants"
      sub="Manage product variants, inventory, and pricing"
    >
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50 text-center text-neutral-600">
            <tr>
              <th className="px-4 py-2">SKU</th>
              <th className="px-4 py-2">Size</th>
              <th className="px-4 py-2">Color</th>
              <th className="px-4 py-2">Stock</th>
              <th className="px-4 py-2">Price</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {variants.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-6 text-center text-neutral-500"
                >
                  No variants yet.
                </td>
              </tr>
            ) : (
              variants.map((variant) => {
                const isEditing = editingId === variant.variant_id;
                return (
                  <tr key={variant.variant_id} className="text-center">
                    <td className="px-4 py-2 font-medium">{variant.sku}</td>
                    <td className="px-4 py-2">{variant.size || "—"}</td>
                    <td className="px-4 py-2">{variant.color || "—"}</td>
                    <td className="px-4 py-2 text-center">
                      {isEditing ? (
                        <input
                          type="number"
                          min="0"
                          value={editingDraft.stock}
                          onChange={(event) =>
                            setEditingDraft((prev) => ({
                              ...prev,
                              stock: event.target.value,
                            }))
                          }
                          className="h-8 w-20 rounded-md border border-neutral-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300"
                        />
                      ) : (
                        Number(variant.stock || 0).toLocaleString()
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {isEditing ? (
                        <input
                          type="number"
                          min="0"
                          value={editingDraft.price}
                          onChange={(event) =>
                            setEditingDraft((prev) => ({
                              ...prev,
                              price: event.target.value,
                            }))
                          }
                          className="h-8 w-24 rounded-md border border-neutral-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300"
                        />
                      ) : variant.price ? (
                        Number(variant.price).toLocaleString("vi-VN", {
                          style: "currency",
                          currency: "VND",
                          maximumFractionDigits: 0,
                        })
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {isEditing ? (
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                            onClick={submitEdit}
                            disabled={variantBusy || disableActions}
                          >
                            <Check className="h-4 w-4" />
                            Save
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50"
                            onClick={cancelEdit}
                          >
                            <X className="h-4 w-4" />
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                            onClick={() => startEdit(variant)}
                            disabled={variantBusy || disableActions}
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                            onClick={() => onDeleteVariant?.(variant.variant_id)}
                            disabled={variantBusy || disableActions}
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4 text-sm sm:grid-cols-[160px,110px,110px,90px,160px,90px]">
        <input
          placeholder="SKU*"
          value={variantForm.sku}
          onChange={onVariantChange("sku")}
          className="h-9 w-full rounded-md border border-neutral-300 bg-white px-3 focus:outline-none focus:ring-2 focus:ring-neutral-300"
          disabled={disableActions}
        />

        <select
          value={variantForm.size}
          onChange={onVariantChange("size")}
          className="h-9 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300"
          disabled={disableActions}
        >
          <option value="">Size</option>
          {sizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>

        <select
          value={variantForm.color}
          onChange={onVariantChange("color")}
          className="h-9 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300"
          disabled={disableActions}
        >
          <option value="">Color</option>
          {colorOptions.map((color) => (
            <option key={color} value={color}>
              {color}
            </option>
          ))}
        </select>

        <input
          placeholder="Stock"
          type="number"
          min="0"
          value={variantForm.stock}
          onChange={onVariantChange("stock")}
          className="h-9 w-full text-left rounded-md border border-neutral-300 bg-white px-3 text-center focus:outline-none focus:ring-2 focus:ring-neutral-300"
          disabled={disableActions}
        />

        <input
          placeholder="Price (₫)"
          type="number"
          min="0"
          value={variantForm.price}
          onChange={onVariantChange("price")}
          className="h-9 w-full rounded-md border border-neutral-300 bg-white px-3 focus:outline-none focus:ring-2 focus:ring-neutral-300"
          disabled={disableActions}
        />

        <button
          type="button"
          onClick={onAddVariant}
          className="inline-flex h-9 w-full items-center justify-center rounded-md bg-black px-3 text-xs font-medium text-white hover:bg-black/90 disabled:opacity-50"
          disabled={variantBusy || disableActions}
        >
          <Plus className="mr-1 h-4 w-4" />
          Add
        </button>
      </div>
    </Card>
  );
}
