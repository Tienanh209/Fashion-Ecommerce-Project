import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import {ProductCard} from "..";
import { listProducts } from "../../services/products";

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export default function BestSelling() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [idx, setIdx] = useState(0);

  // Swipe + Drag
  const touchX = useRef(null);
  const drag = useRef({ down: false, x: 0 });
  const onTouchStart = (e) => (touchX.current = e.touches[0].clientX);
  const onTouchEnd = (e) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    const THRESHOLD = 40;
    if (dx < -THRESHOLD) next();
    else if (dx > THRESHOLD) prev();
  };
  const onPointerDown = (e) => { drag.current = { down: true, x: e.clientX }; };
  const onPointerUp   = (e) => {
    if (!drag.current.down) return;
    const dx = e.clientX - drag.current.x;
    drag.current.down = false;
    const THRESHOLD = 40;
    if (dx < -THRESHOLD) next();
    else if (dx > THRESHOLD) prev();
  };

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    listProducts({ limit: 24 })
      .then(({ products }) => {
        if (cancel) return;
        const discounted = products.filter((p) => (p.discount || 0) > 0);
        const data = (discounted.length ? discounted : products).slice(0, 24);
        setItems(data);
        setLoading(false);
      })
      .catch((e) => !cancel && (setError(e.message), setLoading(false)));
    return () => { cancel = true; };
  }, []);

  const groups = useMemo(() => chunk(items, 3), [items]);
  const last = groups.length ? groups.length - 1 : 0;
  const next = () => setIdx((i) => (i >= last ? 0 : i + 1));
  const prev = () => setIdx((i) => (i <= 0 ? last : i - 1));

  return (
    <section
      className="relative py-16 sm:py-24 bg-white"
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
      onPointerDown={onPointerDown} onPointerUp={onPointerUp}
    >
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-[#1E392A]">Best selling</h2>
          <p className="text-gray-500 mt-4 max-w-2xl mx-auto">
            Get in on the trend with our curated selection of best-selling styles.
          </p>
        </div>

        {loading && <div className="text-center">Loading…</div>}
        {error && <div className="text-center text-red-500">{error}</div>}

        {!loading && !error && (
          <>
    {/* GRID */}
    <div className="relative overflow-visible">
      {/* overlay arrows — đặt ra ngoài grid, không đè lên card */}
      <button
        aria-label="Previous"
        onClick={prev}
        className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full -ml-3
                   h-12 w-12 rounded-full border bg-white/95 shadow z-20
                   items-center justify-center hover:bg-white transition"
      >
        ‹
      </button>
      <button
        aria-label="Next"
        onClick={next}
        className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-full -mr-3
                   h-12 w-12 rounded-full border bg-white/95 shadow z-20
                   items-center justify-center hover:bg-white transition"
      >
        ›
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {(groups[idx] || []).map((p) => <ProductCard key={p.product_id} p={p} />)}
      </div>
    </div>

    {/* dots */}
    <div className="mt-6 flex items-center justify-center gap-2">
      {groups.map((_, i) => (
        <button
          key={i}
          aria-label={`Go to slide ${i + 1}`}
          onClick={() => setIdx(i)}
          className={`h-2.5 w-2.5 rounded-full ${i === idx ? "bg-black" : "bg-gray-300 hover:bg-gray-400"}`}
        />
      ))}
    </div>

    {/* see all -> Shop (sort=price-desc) */}
    <div className="text-center mt-12">
      <Link
        to="/shop?sort=price-desc"
        className="inline-block px-8 py-3 rounded-md border border-[#1E392A] text-[#1E392A] font-semibold hover:bg-[#1E392A] hover:text-white transition-colors duration-300"
      >
        See all →
      </Link>
    </div>
  </>
        )}
      </div>
    </section>
  );
}
