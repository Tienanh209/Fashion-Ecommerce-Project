import { useEffect, useState } from "react";
import { Link } from "react-router";
import { listCategories } from "../../services/categories";

const catImageMap = {
  "T-shirts": "t-shirt.png",
  "Shirts":   "shirt.png",
  "Jeans":    "jean.png",
  "Shorts":   "short.png",
  "Jackets":  "jacket.png",
};

export default function CategoryTiles() {
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    listCategories()
      .then((data) => !cancel && (setCats(data), setLoading(false)))
      .catch(() => !cancel && setLoading(false));
    return () => { cancel = true; };
  }, []);

  return (
    <section className="container mx-auto px-4 py-10">
      <div className="rounded-3xl bg-gray-50 p-5 md:p-8">
        <h3 className="text-xl font-extrabold tracking-tight mb-5">
          BROWSE BY CATEGORY
        </h3>

        {loading ? (
          <div className="text-sm text-gray-500">Loading categories…</div>
        ) : (
          <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-px-4 pb-2">
            {cats.map((c) => {
              const img = `/images/${catImageMap[c.name] || "image.png"}`;
              return (
                <Link
                  key={c.category_id}
                  to={`/shop?category=${encodeURIComponent(c.name)}`}
                  className="
                    snap-start flex-none md:w-70 place-items-center
                  "
                >
                      <img
                        src={img}
                        alt={c.name}
                        loading="lazy"
                        className="
                          h-[85%] w-[80%] rounded-4xl border
                        "
                      />
                    <div className="mt-3 text-center text-xl font-semibold">
                      {c.name}
                    </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
