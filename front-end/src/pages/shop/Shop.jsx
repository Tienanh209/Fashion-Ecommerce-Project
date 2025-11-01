import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router";
import { Breadcrumb, ProductCard, SidebarFilters, Pagination } from "../../components"
import { listProducts } from "../../services/products";


export default function Shop() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const qFromURL = params.get("q") || "";
  const categoryFromURL = params.get("category") || "";

  // server-side filters
  const [category, setCategory] = useState(categoryFromURL);
  const [brandId, setBrandId]   = useState("");
  const [gender, setGender]     = useState("");
  const [q, setQ]               = useState(qFromURL); // search text → map sang title

  // client-side filters
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(2_000_000);

  // sort & paging
  const sortFromURL = params.get("sort") || "popular";
  const [sortBy, setSortBy] = useState(sortFromURL); // popular | price-asc | price-desc | newest
  const [page, setPage]     = useState(1);
  const PAGE_SIZE           = 12;

  const [state, setState] = useState({
    items: [],
    metadata: null,
    loading: true,
    error: "",
  });

  // Refresh filters when URL changes (/shop?q=...&category=...)
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    setQ(p.get("q") || "");
    setCategory(p.get("category") || "");
    setSortBy(p.get("sort") || "popular");
    setPage(1); 
  }, [location.search]);

  // fetch from API whenever server-side filters or page change
  useEffect(() => {
    let cancel = false;
    setState((s) => ({ ...s, loading: true, error: "" }));

    listProducts({
      page,
      limit: PAGE_SIZE,
      category: category || undefined,
      brand_id: brandId || undefined,
      gender: gender || undefined,
      title: q || undefined, // ← search
    })
      .then(({ products, metadata }) => {
        if (cancel) return;
        setState({ items: products, metadata, loading: false, error: "" });
        if (metadata && page > metadata.lastPage) setPage(1);
      })
      .catch((e) => !cancel && setState({ items: [], metadata: null, loading: false, error: e.message }));

    return () => { cancel = true; };
  }, [category, brandId, gender, q, page]);

  // client-side: price filter + sort trên trang hiện tại
  const viewItems = useMemo(() => {
    let res = state.items.filter((p) => p.price >= minPrice && p.price <= maxPrice);
    switch (sortBy) {
      case "price-asc":  res = res.slice().sort((a, b) => a.price - b.price); break;
      case "price-desc": res = res.slice().sort((a, b) => b.price - a.price); break;
      case "newest":     res = res.slice().sort((a, b) => (b.product_id - a.product_id)); break;
      default: break;
    }
    return res;
  }, [state.items, minPrice, maxPrice, sortBy]);

  const totalRecords = state.metadata?.totalRecords ?? viewItems.length;
  const rangeStart = Math.min((page - 1) * PAGE_SIZE + 1, totalRecords);
  const rangeEnd   = Math.min(page * PAGE_SIZE, totalRecords);

  const applyFilter = () => setPage(1);
  const resetFilters = () => {
    setCategory(""); setBrandId(""); setGender("");
    setMinPrice(0); setMaxPrice(2_000_000);
    setSortBy("popular"); setPage(1);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="container mx-auto px-4 py-6">
        {/* breadcrumb (reusable component) */}
        <Breadcrumb items={[
          { label: "Home", to: "/" },
          { label: "Shop" } // current page
        ]} />

        <div className="mt-4 md:mt-6 grid gap-6 lg:[grid-template-columns:280px_1fr]">
          {/* Sidebar filters */}
          <SidebarFilters
            category={category} setCategory={setCategory}
            brandId={brandId}   setBrandId={setBrandId}
            gender={gender}     setGender={setGender}
            minPrice={minPrice} setMinPrice={setMinPrice}
            maxPrice={maxPrice} setMaxPrice={setMaxPrice}
            onApply={applyFilter}
            onReset={resetFilters}
          />

          {/* Content */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl md:text-2xl font-extrabold">Shop</h1>
              <div className="text-sm flex items-center gap-3">
                <span className="text-gray-500">
                  Showing {rangeStart}–{rangeEnd} of {totalRecords} Products
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="border rounded-full px-3 py-1"
                >
                  <option value="popular">Most Popular</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="newest">Newest</option>
                </select>
              </div>
            </div>

            {/* state */}
            {state.loading && <div className="py-10 text-center">Loading…</div>}
            {state.error   && <div className="py-10 text-center text-red-500">{state.error}</div>}

            {/* grid */}
            {!state.loading && !state.error && (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                  {viewItems.map((p) => <ProductCard key={p.product_id} p={p} />)}
                  {!viewItems.length && (
                    <div className="col-span-full text-center text-sm text-gray-500 py-10">
                      No products match your filters.
                    </div>
                  )}
                </div>

                <Pagination
                  page={page}
                  lastPage={state.metadata?.lastPage || 1}
                  onChange={(p) => window.scrollTo({ top: 0, behavior: "smooth" }) || setPage(p)}
                />
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
