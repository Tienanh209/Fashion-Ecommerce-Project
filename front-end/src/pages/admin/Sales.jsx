import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Pencil, Search, RefreshCw, Eye, X } from "lucide-react";

import { listSales, getSale, createSale, updateSale, deleteSale } from "../../services/sales";
import { listProducts } from "../../services/products";
import { listCategories } from "../../services/categories";
import { listBrands } from "../../services/brands";
import { imgUrl } from "../../utils/image";

const emptyForm = {
  title: "",
  content: "",
  banner_url: "",
  discount: 5,
  start_date: "",
  end_date: "",
};

function toInputDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 16);
}

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [salesLoading, setSalesLoading] = useState(true);
  const [salesError, setSalesError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [products, setProducts] = useState([]);
  const [productFilters, setProductFilters] = useState({
    search: "",
    category: "all",
    brand: "all",
  });
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ ok: "", err: "" });
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState("");
  const [historySaleId, setHistorySaleId] = useState(null);
  const [historySaleDetail, setHistorySaleDetail] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [catList, brandList] = await Promise.all([
          listCategories(),
          listBrands(),
        ]);
        setCategories(catList || []);
        setBrands(brandList || []);
      } catch (e) {
        console.warn(e);
      }
    })();
  }, []);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setSalesLoading(true);
        setSalesError("");
        const data = await listSales();
        if (!cancel) setSales(data || []);
      } catch (e) {
        if (!cancel) setSalesError(e?.message || "Failed to load sales");
      } finally {
        if (!cancel) setSalesLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    if (!historySaleId) return undefined;

    let cancelled = false;
    (async () => {
      try {
        setHistoryLoading(true);
        setHistoryError("");
        const detail = await getSale(historySaleId);
        if (cancelled) return;
        setHistorySaleDetail(detail || null);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setHistorySaleDetail(null);
          setHistoryError(e?.message || "Failed to load sale details");
        }
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [historySaleId]);

  useEffect(() => {
    let cancel = false;
    const debounce = setTimeout(async () => {
      try {
        const query = {
          title: productFilters.search || undefined,
          category: productFilters.category !== "all" ? productFilters.category : undefined,
          brand: productFilters.brand !== "all" ? productFilters.brand : undefined,
          limit: 200,
          page: 1,
        };
        const res = await listProducts(query);
        if (!cancel) setProducts(res?.products || []);
      } catch (e) {
        console.warn(e);
        if (!cancel) setProducts([]);
      }
    }, 250);
    return () => {
      cancel = true;
      clearTimeout(debounce);
    };
  }, [productFilters]);

  const handleInputChange = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const toggleProduct = (productId) => {
    setSelectedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const toggleAllProducts = (checked) => {
    if (checked) {
      setSelectedProducts(new Set(products.map((p) => p.product_id)));
    } else {
      setSelectedProducts(new Set());
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setSelectedProducts(new Set());
    setMessage({ ok: "", err: "" });
    setBannerFile(null);
    setBannerPreview("");
  };

  const loadSale = async (sale_id) => {
    try {
      const sale = await getSale(sale_id);
      setEditingId(sale_id);
      setForm({
        title: sale.title || "",
        content: sale.content || "",
        banner_url: sale.banner_url || "",
        discount: sale.discount ?? 0,
        start_date: toInputDate(sale.start_date),
        end_date: toInputDate(sale.end_date),
      });
      setBannerPreview(sale.banner_url ? imgUrl(sale.banner_url) : "");
      setBannerFile(null);
      const productsSet = new Set(
        (sale.products || []).map((p) => Number(p.product_id))
      );
      setSelectedProducts(productsSet);
      setMessage({ ok: "", err: "" });
    } catch (e) {
      console.error(e);
      setMessage({ ok: "", err: e?.message || "Failed to load sale detail" });
    }
  };

  const handleBannerChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBannerFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setBannerPreview(e.target?.result || "");
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      setMessage({ ok: "", err: "Title is required" });
      return;
    }
    if (!form.start_date || !form.end_date) {
      setMessage({ ok: "", err: "Start and end date are required" });
      return;
    }
    try {
      setSaving(true);
      setMessage({ ok: "", err: "" });
      const payload = {
        ...form,
        bannerFile,
        product_ids: Array.from(selectedProducts),
      };
      if (editingId) {
        await updateSale(editingId, payload);
        setMessage({ ok: "Sale updated.", err: "" });
      } else {
        await createSale(payload);
        setMessage({ ok: "Sale created.", err: "" });
      }
      const fresh = await listSales();
      setSales(fresh || []);
      if (!editingId) {
        resetForm();
      }
    } catch (e) {
      console.error(e);
      setMessage({ ok: "", err: e?.message || "Failed to save sale" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (sale_id) => {
    if (!window.confirm("Delete this sale?")) return;
    try {
      await deleteSale(sale_id);
      setSales((prev) => prev.filter((s) => s.sale_id !== sale_id));
      if (editingId === sale_id) resetForm();
    } catch (e) {
      console.error(e);
      setMessage({ ok: "", err: e?.message || "Failed to delete sale" });
    }
  };

  const filteredProducts = useMemo(() => products, [products]);

  const openHistoryModal = (saleId) => {
    setHistorySaleId(saleId);
    setHistorySaleDetail(null);
    setHistoryError("");
  };

  const closeHistoryModal = () => {
    setHistorySaleId(null);
    setHistorySaleDetail(null);
    setHistoryError("");
    setHistoryLoading(false);
  };

  const historyProducts = historySaleDetail?.products || [];
  const formatDateRange = (sale) => {
    if (!sale) return "";
    const start = sale.start_date ? new Date(sale.start_date).toLocaleString() : "N/A";
    const end = sale.end_date ? new Date(sale.end_date).toLocaleString() : "N/A";
    return `${start} → ${end}`;
  };

  return (
    <div className="min-h-[calc(100vh-64px)] w-full bg-neutral-50">
      <div className="mx-auto max-w-7xl px-6 py-6">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">Sales</h1>
            <p className="text-sm text-neutral-500">
              Create and manage seasonal promotions.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {editingId ? (
              <button
                className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 hover:bg-neutral-100"
                onClick={resetForm}
                disabled={saving}
              >
                New Sale
              </button>
            ) : null}
            <button
              className="inline-flex items-center gap-2 rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/90 disabled:opacity-50"
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {editingId ? "Update Sale" : "Create Sale"}
            </button>
          </div>
        </header>

        {message.err ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {message.err}
          </div>
        ) : null}
        {message.ok ? (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {message.ok}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-1">
            <div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
              <div className="border-b border-neutral-200 px-5 py-3 text-sm font-medium text-neutral-900">
                {editingId ? `Edit Sale #${editingId}` : "New Sale"}
              </div>
              <div className="space-y-3 px-5 py-4">
                <div>
                  <label className="text-sm text-neutral-700">Title *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={handleInputChange("title")}
                    className="mt-1 h-10 w-full rounded-md border border-neutral-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300"
                  />
                </div>
                <div>
                  <label className="text-sm text-neutral-700">Content</label>
                  <textarea
                    value={form.content}
                    onChange={handleInputChange("content")}
                    rows={3}
                    className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300"
                  />
                </div>
                <div>
                  <label className="text-sm text-neutral-700">Banner</label>
                  <div className="mt-2 flex items-center gap-3">
                    {bannerPreview ? (
                      <img
                        src={bannerPreview}
                        alt="Banner preview"
                        className="h-16 w-24 rounded-md object-cover border"
                      />
                    ) : (
                      <div className="flex h-16 w-24 items-center justify-center rounded-md border border-dashed border-neutral-300 text-xs text-neutral-500">
                        No image
                      </div>
                    )}
                    <label className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md border border-neutral-300 bg-white px-4 text-sm text-neutral-700 hover:bg-neutral-50">
                      Upload Banner
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleBannerChange}
                      />
                    </label>
                  </div>
                  {form.banner_url && !bannerPreview ? (
                    <p className="mt-1 text-xs text-neutral-500 truncate">
                      Current: {form.banner_url}
                    </p>
                  ) : null}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-neutral-700">Discount (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={form.discount}
                      onChange={handleInputChange("discount")}
                      className="mt-1 h-10 w-full rounded-md border border-neutral-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-neutral-700">Start</label>
                    <input
                      type="datetime-local"
                      value={form.start_date}
                      onChange={handleInputChange("start_date")}
                      className="mt-1 h-10 w-full rounded-md border border-neutral-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-neutral-700">End</label>
                    <input
                      type="datetime-local"
                      value={form.end_date}
                      onChange={handleInputChange("end_date")}
                      className="mt-1 h-10 w-full rounded-md border border-neutral-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
              <div className="border-b border-neutral-200 px-5 py-3 text-sm font-medium text-neutral-900">
                Existing Sales
              </div>
              <div className="divide-y divide-neutral-200">
                {salesLoading ? (
                  <div className="px-5 py-4 text-sm text-neutral-500">Loading…</div>
                ) : salesError ? (
                  <div className="px-5 py-4 text-sm text-red-600">{salesError}</div>
                ) : !sales.length ? (
                  <div className="px-5 py-4 text-sm text-neutral-500">
                    No sales created yet.
                  </div>
                ) : (
                  sales.map((sale) => (
                    <div
                      key={sale.sale_id}
                      className="flex items-start justify-between gap-3 px-5 py-4"
                    >
                      <div>
                        <div className="text-sm font-semibold text-neutral-900">
                          {sale.title}
                        </div>
                        <div className="text-xs text-neutral-500">
                          {sale.start_date?.slice(0, 10)} → {sale.end_date?.slice(0, 10)}
                        </div>
                        <div className="text-xs text-neutral-500">
                          Products: {sale.product_count || 0} · Discount: {sale.discount}%
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-100"
                          onClick={() => openHistoryModal(sale.sale_id)}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          className="rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-100"
                          onClick={() => loadSale(sale.sale_id)}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100"
                          onClick={() => handleDelete(sale.sale_id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4 lg:col-span-2">
            <div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
              <div className="border-b border-neutral-200 px-5 py-3 text-sm font-medium text-neutral-900">
                Select Products for this Sale
              </div>
              <div className="flex flex-wrap gap-3 px-5 py-4">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={productFilters.search}
                    onChange={(e) =>
                      setProductFilters((prev) => ({ ...prev, search: e.target.value }))
                    }
                    className="h-10 w-full rounded-md border border-neutral-300 bg-neutral-50 pl-9 pr-3 text-sm placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-300"
                  />
                </div>
                <select
                  value={productFilters.category}
                  onChange={(e) =>
                    setProductFilters((prev) => ({ ...prev, category: e.target.value }))
                  }
                  className="h-10 min-w-[160px] rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-300"
                >
                  <option value="all">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.category_id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <select
                  value={productFilters.brand}
                  onChange={(e) =>
                    setProductFilters((prev) => ({ ...prev, brand: e.target.value }))
                  }
                  className="h-10 min-w-[160px] rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-300"
                >
                  <option value="all">All Brands</option>
                  {brands.map((b) => (
                    <option key={b.brand_id} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2 text-sm text-neutral-700">
                  <input
                    type="checkbox"
                    checked={
                      filteredProducts.length > 0 &&
                      selectedProducts.size === filteredProducts.length
                    }
                    onChange={(e) => toggleAllProducts(e.target.checked)}
                  />
                  <span>Select all</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-neutral-600">
                    <tr className="[&>th]:px-5 [&>th]:py-3">
                      <th></th>
                      <th>Product</th>
                      <th>Category</th>
                      <th>Brand</th>
                      <th className="text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {!filteredProducts.length ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-5 py-4 text-center text-neutral-500"
                        >
                          No products found.
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((p) => {
                        const checked = selectedProducts.has(p.product_id);
                        return (
                          <tr key={p.product_id} className="text-neutral-800">
                            <td className="px-5 py-3">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleProduct(p.product_id)}
                              />
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-3">
                                {p.thumbnail ? (
                                  <img
                                    src={imgUrl(p.thumbnail)}
                                    alt={p.title}
                                    className="h-10 w-10 rounded-md object-cover"
                                  />
                                ) : null}
                                <div>
                                  <div className="font-medium">{p.title}</div>
                                  <div className="text-xs text-neutral-500">
                                    #{p.product_id}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-neutral-600">{p.category}</td>
                            <td className="px-5 py-3 text-neutral-600">{p.brand}</td>
                            <td className="px-5 py-3 text-right">
                              {Number(p.price || 0).toLocaleString("vi-VN")} đ
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
        </div>
      </div>
    </div>

    {historySaleId ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
        <div className="w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
          <div className="flex items-start justify-between border-b border-neutral-200 px-6 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Sales History
              </p>
              <p className="text-lg font-semibold text-neutral-900">
                {historySaleDetail?.title || `Sale #${historySaleId}`}
              </p>
              <p className="text-sm text-neutral-500">
                {historyLoading ? "Đang tải…" : formatDateRange(historySaleDetail)}
              </p>
            </div>
            <button
              type="button"
              onClick={closeHistoryModal}
              className="text-neutral-500 transition hover:text-neutral-800"
              aria-label="Close history modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
            {historyLoading ? (
              <div className="py-10 text-center text-sm text-neutral-500">
                Đang tải lịch sử khuyến mãi…
              </div>
            ) : historyError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {historyError}
              </div>
            ) : (
              <>
                <div className="mb-5 rounded-2xl border border-neutral-200 bg-neutral-50 px-5 py-4 text-sm text-neutral-700">
                  <div>
                    <span className="font-semibold text-neutral-900">Thời gian:</span>{" "}
                    {formatDateRange(historySaleDetail) || "Không xác định"}
                  </div>
                  <div className="mt-1">
                    <span className="font-semibold text-neutral-900">Giảm giá:</span>{" "}
                    {historySaleDetail?.discount ?? 0}%
                  </div>
                  {historySaleDetail?.content ? (
                    <p className="mt-3 text-neutral-600">{historySaleDetail.content}</p>
                  ) : null}
                </div>
                {historyProducts.length === 0 ? (
                  <div className="py-10 text-center text-sm text-neutral-500">
                    Đợt khuyến mãi này chưa có sản phẩm đính kèm.
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {historyProducts.map((product) => (
                      <div
                        key={product.product_id || product.id}
                        className="flex items-start gap-3 rounded-2xl border border-neutral-200 bg-white p-4"
                      >
                        {product.thumbnail ? (
                          <img
                            src={imgUrl(product.thumbnail)}
                            alt={product.title || `Product #${product.product_id}`}
                            className="h-20 w-20 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-neutral-100 text-xs text-neutral-500">
                            No image
                          </div>
                        )}
                        <div className="text-sm">
                          <div className="font-semibold text-neutral-900">
                            {product.title || `Product #${product.product_id}`}
                          </div>
                          <div className="text-xs text-neutral-500">
                            #{product.product_id}
                          </div>
                          <div className="mt-1 text-xs text-neutral-600">
                            {product.category || "Không rõ"} · {product.brand || "—"}
                          </div>
                          <div className="mt-2 text-sm font-semibold text-neutral-900">
                            {Number(product.price || 0).toLocaleString("vi-VN")} đ
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    ) : null}
  </div>
);
}
