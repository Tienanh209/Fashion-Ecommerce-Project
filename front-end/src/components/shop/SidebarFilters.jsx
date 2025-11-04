import { useEffect, useMemo, useState } from "react";
import { listCategories } from "../../services/categories";
import { listBrands } from "../../services/brands";

const fmtVND = (n) => {
  const value = Number(n);
  return (Number.isFinite(value) ? value : 0).toLocaleString("vi-VN") + "₫";
};
const normalize = (value) => (value ?? "").toString().trim().toLowerCase();
const slugify = (value) =>
  normalize(value).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

function matchCategory(input, categories = []) {
  if (!input) return null;
  const raw = (input ?? "").toString();
  const normalized = normalize(raw);

  const byId =
    categories.find(
      (category) =>
        category?.category_id !== undefined &&
        String(category.category_id) === raw
    ) ?? null;
  if (byId) return byId;

  const byNumber =
    !Number.isNaN(Number(raw)) && raw !== ""
      ? categories.find(
          (category) =>
            category?.category_id !== undefined &&
            String(category.category_id) === String(Number(raw))
        ) ?? null
      : null;
  if (byNumber) return byNumber;

  const byName =
    categories.find(
      (category) => normalize(category?.name) === normalized
    ) ?? null;
  if (byName) return byName;

  const bySlug =
    categories.find(
      (category) => slugify(category?.name) === normalized
    ) ?? null;
  if (bySlug) return bySlug;

  return null;
}

function SidebarFilters({
  category, setCategory,
  brandId, setBrandId,
  gender, setGender,
  minPrice, setMinPrice,
  maxPrice, setMaxPrice,
  onApply, onReset
}) {
  const [cats, setCats] = useState([]);
  const [brands, setBrands] = useState([]);
  const MIN_GAP = 10_000;

  useEffect(() => {
    let cancel = false;
    Promise.all([listCategories(), listBrands()])
      .then(([cs, bs]) => { if (!cancel) { setCats(cs); setBrands(bs); } })
      .catch(() => {});
    return () => { cancel = true; };
  }, []);

  useEffect(() => {
    if (!category || !cats.length) return;
    const resolved = matchCategory(category, cats);
    if (resolved?.name && resolved.name !== category) {
      setCategory(resolved.name);
    }
  }, [category, cats, setCategory]);

  const onMinChange = (v) => setMinPrice(Math.min(+v, maxPrice - MIN_GAP));
  const onMaxChange = (v) => setMaxPrice(Math.max(+v, minPrice + MIN_GAP));

  const activeCategoryName = useMemo(() => {
    const resolved = matchCategory(category, cats);
    return resolved?.name || "";
  }, [category, cats]);

  const isCategoryActive = (item) =>
    !!item?.name && normalize(item.name) === normalize(activeCategoryName);

  return (
    <aside className="hidden md:block">
      <div className="sticky top-24 rounded-2xl border border-gray-200 bg-white p-4 space-y-6">
        {/* header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Filters</h3>
          <button onClick={onReset} className="text-xs text-gray-500 hover:text-gray-700 underline">Reset</button>
        </div>

        {/* categories */}
        <section>
          <h4 className="text-sm font-medium mb-2">Category</h4>
          <div className="rounded-xl border border-gray-100 divide-y">
            {cats.map((c) => (
              <button
                key={c.category_id}
                type="button"
                className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 ${
                  isCategoryActive(c) ? "bg-gray-50" : ""
                }`}
                onClick={() => setCategory(isCategoryActive(c) ? "" : c.name)}
              >
                <span className="text-gray-700">{c.name}</span>
                <span className="text-gray-400">›</span>
              </button>
            ))}
          </div>
        </section>

        {/* brands */}
        <section>
          <h4 className="text-sm font-medium mb-2">Brand</h4>
          <select
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={brandId || ""}
            onChange={(e) => setBrandId(e.target.value || "")}
          >
            <option value="">All brands</option>
            {brands.map((b) => (
              <option key={b.brand_id} value={b.brand_id}>{b.name}</option>
            ))}
          </select>
        </section>

        {/* gender */}
        <section>
          <h4 className="text-sm font-medium mb-2">Gender</h4>
          <div className="flex flex-wrap gap-2">
            {["", "male", "female", "unisex"].map((g) => (
              <button
                key={g || "all"}
                onClick={() => setGender(g)}
                className={`px-3 py-1 rounded-full border text-xs transition ${gender === g ? "bg-black text-white border-black" : "hover:bg-gray-50"}`}
              >
                {g ? g[0].toUpperCase() + g.slice(1) : "All"}
              </button>
            ))}
          </div>
        </section>

        {/* price */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium">Price</h4>
            <span className="text-[11px] text-gray-500">{fmtVND(minPrice)} – {fmtVND(maxPrice)}</span>
          </div>
          <input type="range" min="0" max="2000000" step="10000" value={minPrice} onChange={e=>onMinChange(e.target.value)} className="w-full accent-black"/>
          <input type="range" min="0" max="2000000" step="10000" value={maxPrice} onChange={e=>onMaxChange(e.target.value)} className="w-full -mt-2 accent-black"/>
          <div className="flex justify-between text-[11px] text-gray-400 mt-1">
            <span>0₫</span><span>2,000,000₫</span>
          </div>
        </section>

        <button onClick={onApply} className="w-full h-10 rounded-full bg-black text-white text-sm font-medium hover:opacity-90">
          Apply Filter
        </button>
      </div>
    </aside>
  );
}

export default SidebarFilters
