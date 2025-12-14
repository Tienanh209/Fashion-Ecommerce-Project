import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Upload,
  Plus,
  Search,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";
import { useNavigate } from "react-router";
import { listProducts, getProduct } from "../../services/products";
import { createPurchaseOrder } from "../../services/purchaseOrders";
import { listSuppliers, createSupplier } from "../../services/suppliers";

const fmtVND = (n) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);

const classifyStatus = (stock) => {
  if (stock <= 0) return "Out of Stock";
  if (stock < 3) return "Critical";
  if (stock < 10) return "Low Stock";
  return "In Stock";
};

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
      <div className="border-b border-neutral-200 px-5 py-3 text-sm text-neutral-500">
        {label}
      </div>
      <div className="px-5 py-6 text-2xl font-semibold text-neutral-900">
        {value}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    "In Stock":
      "inline-flex items-center rounded-md bg-black px-2.5 py-1 text-xs font-medium text-white",
    "Low Stock":
      "inline-flex items-center rounded-md bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900",
    Critical:
      "inline-flex items-center rounded-md bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700",
    "Out of Stock":
      "inline-flex items-center rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white",
  };

  const cls = map[status] ?? map["In Stock"];
  return <span className={cls}>{status}</span>;
}

const deriveRow = (product, detail) => {
  const basePrice = Number(detail?.price ?? product?.price ?? 0);
  const variants = Array.isArray(detail?.variants) ? detail.variants : [];
  const stockFromVariants = variants.reduce(
    (sum, v) => sum + Number(v?.stock ?? 0),
    0
  );
  const fallbackStock = Number(detail?.stock ?? product?.stock ?? 0);
  const totalStock = variants.length ? stockFromVariants : fallbackStock;
  const status = classifyStatus(totalStock);
  const sku =
    variants.length > 1
      ? `${variants.length} variants`
      : variants.length === 1
        ? variants[0]?.sku || "-"
        : detail?.sku || product?.sku || "-";

  return {
    product_id: detail?.product_id ?? product?.product_id,
    title: detail?.title ?? product?.title ?? "Unnamed product",
    category: detail?.category ?? product?.category ?? "Uncategorized",
    sku,
    stock: totalStock,
    status,
    price: fmtVND(basePrice),
    brand: detail?.brand ?? product?.brand ?? "",
    variants,
  };
};

export default function Inventory() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [availableCategories, setAvailableCategories] = useState([]);
  const [reloadToken, setReloadToken] = useState(0);
  const [importingStock, setImportingStock] = useState(false);
  const [importMessage, setImportMessage] = useState({ ok: "", err: "" });
  const [showImportModal, setShowImportModal] = useState(false);
  const [receiptForm, setReceiptForm] = useState({
    supplier_id: "",
    note: "",
    items: [
      {
        variant_id: "",
        cost_price: "",
        selling_price: "",
        quantity: 1,
      },
    ],
  });
  const [formErrors, setFormErrors] = useState({});
  const [suppliers, setSuppliers] = useState([]);
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [suppliersError, setSuppliersError] = useState("");
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: "", address: "" });
  const [supplierFormError, setSupplierFormError] = useState("");
  const [creatingSupplier, setCreatingSupplier] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 350);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const res = await listProducts({
          page: 1,
          limit: 200,
          title: debouncedSearch || undefined,
          category: category !== "all" ? category : undefined,
        });

        if (cancel) return;

        const productList = res?.products || res?.data?.products || [];
        const meta = res?.metadata || res?.data?.metadata || null;

        const detailList = await Promise.all(
          productList.map(async (p) => {
            try {
              const detail = await getProduct(p.product_id);
              return detail || p;
            } catch (err) {
              console.warn("[Inventory] Failed to fetch product detail", err);
              return p;
            }
          })
        );

        if (cancel) return;

        const merged = productList.map((product, idx) =>
          deriveRow(product, detailList[idx])
        );

        const uniqueCategories = Array.from(
          new Set(
            productList
              .map((p) => p?.category)
              .filter((c) => typeof c === "string" && c.length)
          )
        ).sort((a, b) => a.localeCompare(b));

        setAvailableCategories(uniqueCategories);
        setItems(merged);
        setMetadata(meta);
      } catch (e) {
        console.error(e);
        if (!cancel) {
          setError(e?.message || "Failed to load inventory");
          setItems([]);
          setMetadata(null);
        }
      } finally {
        if (!cancel) setLoading(false);
      }
    })();

    return () => {
      cancel = true;
    };
  }, [category, debouncedSearch, reloadToken]);

  const stats = useMemo(() => {
    const totalProducts = metadata?.totalRecords ?? items.length;
    const inStock = items.filter((it) => it.status === "In Stock").length;
    const lowStock = items.filter((it) => it.status === "Low Stock").length;
    const outOfStock = items.filter(
      (it) => it.status === "Out of Stock" || it.status === "Critical"
    ).length;

    return [
      { label: "Total Products", value: totalProducts.toLocaleString() },
      { label: "In Stock", value: inStock.toLocaleString() },
      { label: "Low Stock", value: lowStock.toLocaleString() },
      { label: "Out of Stock", value: outOfStock.toLocaleString() },
    ];
  }, [items, metadata]);

  const variantOptions = useMemo(() => {
    return items.flatMap((item) =>
      (item.variants || [])
        .filter((variant) => Number(variant?.variant_id))
        .map((variant) => {
          const parts = [item.title];
          if (variant.sku) parts.push(`SKU ${variant.sku}`);
          const attributes = [variant.color, variant.size]
            .filter((v) => v && String(v).trim().length)
            .join(" / ");
          if (attributes) parts.push(attributes);
          return {
            variant_id: Number(variant.variant_id),
            label: parts.join(" • "),
          };
        })
    );
  }, [items]);

  const supplierCount = suppliers.length;

  const lowStockAlert = useMemo(() => {
    const lowOrCritical = items.filter(
      (it) => it.status === "Low Stock" || it.status === "Critical"
    ).length;
    if (!items.length) {
      return "No inventory data available yet.";
    }
    if (!lowOrCritical) {
      return "All tracked products are adequately stocked.";
    }
    return `${lowOrCritical} product${lowOrCritical > 1 ? "s" : ""} running low on stock. Consider restocking soon.`;
  }, [items]);

  const categoryOptions = useMemo(() => {
    const base = ["all", ...availableCategories];
    return Array.from(new Set(base));
  }, [availableCategories]);

  const resetReceiptForm = useCallback(() => {
    setReceiptForm({
      supplier_id: "",
      note: "",
      items: [
        {
          variant_id: "",
          cost_price: "",
          selling_price: "",
          quantity: 1,
        },
      ],
    });
    setFormErrors({});
    setShowSupplierForm(false);
    setNewSupplier({ name: "", address: "" });
    setSupplierFormError("");
    setSuppliersError("");
  }, []);

  const loadSuppliers = useCallback(async () => {
    try {
      setSuppliersLoading(true);
      setSuppliersError("");
      const list = await listSuppliers();
      const sorted = [...list].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      );
      setSuppliers(sorted);
    } catch (error) {
      console.error(error);
      setSuppliersError(error?.message || "Unable to load suppliers.");
    } finally {
      setSuppliersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showImportModal) {
      loadSuppliers();
    }
  }, [showImportModal, loadSuppliers]);

  useEffect(() => {
    if (showImportModal && variantOptions.length) {
      setReceiptForm((prev) => {
        if (!prev.items.length) {
          return {
            ...prev,
            items: [
              {
                variant_id: variantOptions[0].variant_id,
                cost_price: "",
                selling_price: "",
                quantity: 1,
              },
            ],
          };
        }
        const items = prev.items.map((item, idx) => {
          if (idx === 0 && !item.variant_id) {
            return { ...item, variant_id: variantOptions[0].variant_id };
          }
          return item;
        });
        return { ...prev, items };
      });
    }
  }, [showImportModal, variantOptions]);

  useEffect(() => {
    if (showImportModal && !suppliersLoading && supplierCount === 0) {
      setShowSupplierForm(true);
    }
  }, [showImportModal, suppliersLoading, supplierCount]);

  const handleAddProductClick = () => {
    navigate("/admin/addproduct");
  };

  const handleImportButtonClick = () => {
    if (importingStock) return;
    setImportMessage({ ok: "", err: "" });
    if (!items.length) {
      setImportMessage({
        ok: "",
        err: "No products available. Please add a product first.",
      });
      return;
    }
    if (!variantOptions.length) {
      setImportMessage({
        ok: "",
        err: "No product variants available to import.",
      });
      return;
    }
    resetReceiptForm();
    setShowImportModal(true);
  };

  const handleCloseModal = () => {
    if (importingStock) return;
    setShowImportModal(false);
    resetReceiptForm();
  };

  const handleReceiptChange = (field) => (event) => {
    const value = event.target.value;
    setReceiptForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleNewSupplierChange = (field) => (event) => {
    const value = event.target.value;
    setNewSupplier((prev) => ({ ...prev, [field]: value }));
  };

  const handleReceiptItemChange = (index, field) => (event) => {
    const value = event.target.value;
    setReceiptForm((prev) => {
      const items = prev.items.map((item, idx) =>
        idx === index ? { ...item, [field]: value } : item
      );
      return { ...prev, items };
    });
  };

  const handleAddItemRow = () => {
    setReceiptForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          variant_id: variantOptions[0]?.variant_id || "",
          cost_price: "",
          selling_price: "",
          quantity: 1,
        },
      ],
    }));
  };

  const handleRemoveItemRow = (index) => () => {
    setReceiptForm((prev) => {
      if (prev.items.length <= 1) return prev;
      const items = prev.items.filter((_, idx) => idx !== index);
      return { ...prev, items };
    });
  };

  const validateReceiptForm = () => {
    const errors = {};
    if (!receiptForm.supplier_id) {
      errors.supplier_id = "Supplier is required.";
    }
    if (!Array.isArray(receiptForm.items) || receiptForm.items.length === 0) {
      errors.items = [{ variant_id: "At least one variant is required." }];
      return errors;
    }
    const itemErrors = receiptForm.items.map((item) => {
      const entryErrors = {};
      if (!item.variant_id) {
        entryErrors.variant_id = "Variant is required.";
      }
      const cost = Number(item.cost_price);
      if (!Number.isFinite(cost) || cost <= 0) {
        entryErrors.cost_price = "Enter a valid cost price.";
      }
      const selling = Number(item.selling_price);
      if (!Number.isFinite(selling) || selling <= 0) {
        entryErrors.selling_price = "Enter a valid selling price.";
      }
      if (
        entryErrors.cost_price === undefined &&
        entryErrors.selling_price === undefined &&
        cost >= selling
      ) {
        entryErrors.cost_price = "Cost price must be lower than selling price.";
        entryErrors.selling_price = "Cost price must be lower than selling price.";
      }
      const qty = Number(item.quantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        entryErrors.quantity = "Quantity must be greater than 0.";
      }
      return entryErrors;
    });
    if (itemErrors.some((entry) => Object.keys(entry).length > 0)) {
      errors.items = itemErrors;
    }
    return errors;
  };

  const handleSubmitReceipt = async (event) => {
    event.preventDefault();
    const errors = validateReceiptForm();
    if (Object.keys(errors).length) {
      setFormErrors(errors);
      return;
    }
    try {
      setImportingStock(true);
      setFormErrors({});
      await createPurchaseOrder({
        supplier_id: Number(receiptForm.supplier_id),
        note: receiptForm.note,
        items: receiptForm.items.map((item) => ({
          variant_id: Number(item.variant_id),
          cost_price: Number(item.cost_price),
          selling_price: Number(item.selling_price),
          quantity: Number(item.quantity),
        })),
      });
      setImportMessage({
        ok: "Import stock saved and stock updated.",
        err: "",
      });
      setShowImportModal(false);
      resetReceiptForm();
      setReloadToken((token) => token + 1);
    } catch (error) {
      console.error(error);
      setFormErrors({
        general: error?.message || "Failed to import stock.",
      });
    } finally {
      setImportingStock(false);
    }
  };

  const handleCreateSupplier = async () => {
    if (!newSupplier.name.trim()) {
      setSupplierFormError("Supplier name is required.");
      return;
    }
    try {
      setCreatingSupplier(true);
      setSupplierFormError("");
      const created = await createSupplier({
        name: newSupplier.name.trim(),
        address: newSupplier.address.trim(),
      });
      if (created?.supplier_id) {
        setSuppliers((prev) =>
          [...prev, created].sort((a, b) =>
            a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
          )
        );
        setReceiptForm((prev) => ({
          ...prev,
          supplier_id: String(created.supplier_id),
        }));
        setShowSupplierForm(false);
        setNewSupplier({ name: "", address: "" });
      }
    } catch (error) {
      console.error(error);
      setSupplierFormError(error?.message || "Failed to create supplier.");
    } finally {
      setCreatingSupplier(false);
    }
  };

  return (
    <>
      <div className="min-h-[calc(100vh-64px)] w-full bg-neutral-50">
      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">
              Inventory
            </h1>
            <p className="text-sm text-neutral-500">
              Manage your product stock and inventory levels
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-3.5 py-2 text-sm text-neutral-800 hover:bg-neutral-50 disabled:opacity-50"
              onClick={handleImportButtonClick}
              disabled={importingStock}
            >
              <Upload className="h-4 w-4" />
              {importingStock ? "Importing..." : "Import Stock"}
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-3.5 py-2 text-sm text-neutral-800 hover:bg-neutral-50"
              onClick={() => navigate("/admin/purchase-orders")}
            >
              Import Stocks History
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/90"
              onClick={handleAddProductClick}
            >
              <Plus className="h-4 w-4" />
              Add Product
            </button>
          </div>
        </div>
        <p className="mb-4 text-xs text-neutral-500">
          Use the import flow to create import stocks with suppliers, record quantities,
          and update variant prices in one step.
        </p>

        {importMessage.err ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {importMessage.err}
          </div>
        ) : null}

        {importMessage.ok ? (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {importMessage.ok}
          </div>
        ) : null}

        <div className="mb-4 rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="flex items-start gap-3 px-5 py-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-neutral-700" />
            <div>
              <div className="text-sm font-medium text-neutral-900">
                Low Stock Alert
              </div>
              <div className="text-sm text-neutral-600">{lowStockAlert}</div>
            </div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="flex flex-col items-start justify-between gap-3 border-b border-neutral-200 px-5 py-4 sm:flex-row sm:items-center">
            <div>
              <div className="text-sm font-medium text-neutral-900">
                Product Inventory
              </div>
              <div className="text-sm text-neutral-500">
                Current stock levels for tracked products
              </div>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products..."
                  className="h-9 w-full rounded-md border border-neutral-300 bg-neutral-50 pl-9 pr-3 text-sm placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-300"
                />
              </div>
              <div className="relative w-full sm:w-48">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="h-9 w-full appearance-none rounded-md border border-neutral-300 bg-white px-3 pr-8 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-300"
                >
                  {categoryOptions.map((c) => (
                    <option key={c} value={c}>
                      {c === "all" ? "All Categories" : c}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-neutral-600">
                <tr className="[&>th]:px-5 [&>th]:py-3">
                  <th>Product ID</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>SKU / Variants</th>
                  <th>Stock</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {loading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-6 text-center text-neutral-500"
                    >
                      Loading…
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-6 text-center text-red-600"
                    >
                      {error}
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-6 text-center text-neutral-500"
                    >
                      No products found.
                    </td>
                  </tr>
                ) : (
                  items.map((row) => (
                    <tr key={row.product_id} className="text-neutral-800">
                      <td className="px-5 py-4 font-medium">
                        #{row.product_id}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span>{row.title}</span>
                          {row.brand ? (
                            <span className="text-xs text-neutral-500">
                              {row.brand}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-neutral-600">
                        {row.category}
                      </td>
                      <td className="px-5 py-4 text-neutral-700">
                        {row.sku}
                      </td>
                      <td className="px-5 py-4">{row.stock}</td>
                      <td className="px-5 py-4">{row.price}</td>
                      <td className="px-5 py-4">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-5 py-4">
                        <button className="text-sm font-medium text-neutral-700 hover:underline">
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="h-6" />
      </div>
      </div>
      {showImportModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8">
          <div className="flex w-full max-w-2xl max-h-[90vh] flex-col rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-neutral-900">
                  Import Stock
                </h2>
                <p className="text-sm text-neutral-500">
                  Record a supplier delivery and update stock quantities.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100"
              >
                ✕
              </button>
            </div>
            {suppliersError ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                {suppliersError}
              </div>
            ) : null}
            {formErrors.general ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                {formErrors.general}
              </div>
            ) : null}
            <form
              className="mt-6 flex-1 overflow-y-auto space-y-6 pr-1"
              onSubmit={handleSubmitReceipt}
            >
              <div>
                <label className="text-sm font-medium text-neutral-800">
                  Supplier
                </label>
                <div className="mt-2 flex flex-col gap-2">
                  <select
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
                    value={receiptForm.supplier_id}
                    onChange={handleReceiptChange("supplier_id")}
                  >
                    <option value="">Select supplier</option>
                    {suppliers.map((supplier) => (
                      <option
                        key={supplier.supplier_id}
                        value={supplier.supplier_id}
                      >
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                  {suppliersLoading ? (
                    <p className="text-xs text-neutral-500">
                      Loading suppliers...
                    </p>
                  ) : null}
                  {formErrors.supplier_id ? (
                    <p className="text-xs text-red-600">
                      {formErrors.supplier_id}
                    </p>
                  ) : null}
                  {showSupplierForm ? (
                    <div className="rounded-lg border border-dashed border-neutral-300 p-3">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <label className="text-xs text-neutral-500">
                            Supplier name
                          </label>
                          <input
                            type="text"
                            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
                            value={newSupplier.name}
                            onChange={handleNewSupplierChange("name")}
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-xs text-neutral-500">
                            Address
                          </label>
                          <input
                            type="text"
                            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
                            value={newSupplier.address}
                            onChange={handleNewSupplierChange("address")}
                          />
                        </div>
                      </div>
                      {supplierFormError ? (
                        <p className="mt-2 text-xs text-red-600">
                          {supplierFormError}
                        </p>
                      ) : null}
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                          onClick={handleCreateSupplier}
                          disabled={creatingSupplier}
                        >
                          {creatingSupplier ? "Saving..." : "Save supplier"}
                        </button>
                        <button
                          type="button"
                          className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700"
                          onClick={() => {
                            setShowSupplierForm(false);
                            setNewSupplier({ name: "", address: "" });
                            setSupplierFormError("");
                          }}
                          disabled={creatingSupplier}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="text-left text-sm font-semibold text-neutral-700 underline"
                      onClick={() => {
                        setShowSupplierForm(true);
                        setSupplierFormError("");
                      }}
                    >
                      + Add supplier
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-800">
                  Internal note (optional)
                </label>
                <textarea
                  className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
                  rows={3}
                  value={receiptForm.note}
                  onChange={handleReceiptChange("note")}
                />
              </div>
              <div className="space-y-4">
                {receiptForm.items.map((item, idx) => {
                  const itemErrors = formErrors.items?.[idx] || {};
                  return (
                    <div
                      key={`po-item-${idx}`}
                      className="rounded-2xl border border-neutral-200 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-neutral-800">
                          Variant #{idx + 1}
                        </div>
                        {receiptForm.items.length > 1 ? (
                          <button
                            type="button"
                            onClick={handleRemoveItemRow(idx)}
                            className="text-xs font-medium text-red-500 hover:underline"
                          >
                            Remove
                          </button>
                        ) : null}
                      </div>
                      <div className="mt-3">
                        <label className="text-xs font-medium text-neutral-500">
                          Variant
                        </label>
                        <select
                          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
                          value={item.variant_id}
                          onChange={handleReceiptItemChange(idx, "variant_id")}
                        >
                          <option value="">Select variant</option>
                          {variantOptions.map((variant) => (
                            <option
                              key={variant.variant_id}
                              value={variant.variant_id}
                            >
                              {variant.label}
                            </option>
                          ))}
                        </select>
                        {itemErrors.variant_id ? (
                          <p className="text-xs text-red-600">
                            {itemErrors.variant_id}
                          </p>
                        ) : null}
                      </div>
                      <div className="mt-3 grid gap-4 sm:grid-cols-3">
                        <div>
                          <label className="text-xs font-medium text-neutral-500">
                            Cost price (VND)
                          </label>
                          <input
                            type="number"
                            min="1"
                            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
                            value={item.cost_price}
                            onChange={handleReceiptItemChange(idx, "cost_price")}
                          />
                          {itemErrors.cost_price ? (
                            <p className="text-xs text-red-600">
                              {itemErrors.cost_price}
                            </p>
                          ) : null}
                        </div>
                        <div>
                          <label className="text-xs font-medium text-neutral-500">
                            Selling price (VND)
                          </label>
                          <input
                            type="number"
                            min="1"
                            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
                            value={item.selling_price}
                            onChange={handleReceiptItemChange(
                              idx,
                              "selling_price"
                            )}
                          />
                          {itemErrors.selling_price ? (
                            <p className="text-xs text-red-600">
                              {itemErrors.selling_price}
                            </p>
                          ) : null}
                        </div>
                        <div>
                          <label className="text-xs font-medium text-neutral-500">
                            Quantity
                          </label>
                          <input
                            type="number"
                            min="1"
                            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
                            value={item.quantity}
                            onChange={handleReceiptItemChange(idx, "quantity")}
                          />
                          {itemErrors.quantity ? (
                            <p className="text-xs text-red-600">
                              {itemErrors.quantity}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <button
                  type="button"
                  className="w-full rounded-xl border border-dashed border-neutral-300 px-4 py-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                  onClick={handleAddItemRow}
                  disabled={!variantOptions.length}
                >
                  + Add another variant
                </button>
                {formErrors.items && typeof formErrors.items === "string" ? (
                  <p className="text-xs text-red-600">{formErrors.items}</p>
                ) : null}
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-full border border-neutral-300 px-5 py-2 text-sm font-semibold text-neutral-600"
                  disabled={importingStock}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-black px-6 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  disabled={importingStock}
                >
                  {importingStock ? "Saving..." : "Save receipt"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
