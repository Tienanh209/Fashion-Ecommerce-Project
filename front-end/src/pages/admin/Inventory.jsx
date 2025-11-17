import { useEffect, useMemo, useRef, useState } from "react";
import {
  Upload,
  Plus,
  Search,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";
import { useNavigate } from "react-router";
import {
  listProducts,
  getProduct,
  importInventoryBulk,
} from "../../services/products";

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
  const importInputRef = useRef(null);

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

  const handleAddProductClick = () => {
    navigate("/admin/addproduct");
  };

  const handleImportButtonClick = () => {
    if (importingStock) return;
    setImportMessage({ ok: "", err: "" });
    if (!items.length) {
      setImportMessage({
        ok: "",
        err: "Không có sản phẩm nào để nhập kho. Vui lòng thêm sản phẩm trước.",
      });
      return;
    }
    if (importInputRef.current) {
      importInputRef.current.value = "";
      importInputRef.current.click();
    }
  };

  const handleImportFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const isExcelFile =
      /\.(xlsx|xls)$/i.test(file.name) ||
      [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
      ].includes(file.type);

    if (!isExcelFile) {
      setImportMessage({
        ok: "",
        err: "File không hợp lệ. Chỉ chấp nhận Excel (.xlsx hoặc .xls).",
      });
      event.target.value = "";
      return;
    }

    try {
      setImportingStock(true);
      setImportMessage({ ok: "", err: "" });
      const report = await importInventoryBulk(file);
      const processed = report?.processedProducts || 0;
      const productMsg =
        processed > 0
          ? `${processed} sản phẩm đã được cập nhật.`
          : "Không có sản phẩm nào được nhập.";
      setImportMessage({
        ok: `Nhập kho thành công. ${productMsg}`,
        err: "",
      });
      setReloadToken((token) => token + 1);
    } catch (e) {
      console.error(e);
      setImportMessage({
        ok: "",
        err: e?.message || "Không thể nhập kho. Vui lòng thử lại.",
      });
    } finally {
      setImportingStock(false);
      if (event.target) event.target.value = "";
    }
  };

  return (
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
              className="inline-flex items-center gap-2 rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/90"
              onClick={handleAddProductClick}
            >
              <Plus className="h-4 w-4" />
              Add Product
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleImportFileChange}
            />
          </div>
        </div>
        <p className="mb-4 text-xs text-neutral-500">
          Excel import template must include columns: product_id, SKU, Size, Color,
          Cost Price, Selling Price, Import Inventory (Qty).
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
  );
}
