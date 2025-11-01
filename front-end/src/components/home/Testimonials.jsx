import { useEffect, useState } from "react";
import { listReviews } from "../../services/reviews";
import { getUser } from "../../services/users";

function Stars({ n = 5 }) {
  return <div className="text-yellow-500 text-sm">{Array.from({ length: 5 }).map((_, i) => <span key={i}>{i < n ? "★" : "☆"}</span>)}</div>;
}

export default function Testimonials() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;

    async function load() {
      try {
        const d = await listReviews({ status: "approved", limit: 6, page: 1 });
        const reviews = d?.reviews || [];

        // Nếu backend đã trả fullname (vd. r.user_fullname) thì ưu tiên dùng.
        // Nếu KHÔNG, gọi thêm /users/:id để lấy fullname (có cache tránh gọi trùng).
        const cache = new Map();
        const withNames = await Promise.all(
          reviews.map(async (r) => {
            let name = r.user_fullname || r.fullname;
            if (!name) {
              if (!cache.has(r.user_id)) {
                try {
                  const u = await getUser(r.user_id);
                  cache.set(r.user_id, u?.user?.fullname || `User #${r.user_id}`);
                } catch {
                  cache.set(r.user_id, `User #${r.user_id}`);
                }
              }
              name = cache.get(r.user_id);
            }
            return { ...r, _fullname: name };
          })
        );

        if (!cancel) setItems(withNames);
      } finally {
        if (!cancel) setLoading(false);
      }
    }

    load();
    return () => { cancel = true; };
  }, []);

  return (
    <section className="container mx-auto px-4 py-10">
      <h3 className="text-lg md:text-xl font-extrabold tracking-tight mb-5">OUR HAPPY CUSTOMERS</h3>

      {loading ? (
        <div className="text-sm text-gray-500">Loading testimonials…</div>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          {items.map((t) => (
            <div key={t.review_id} className="rounded-2xl border p-5 bg-white">
              <Stars n={t.rating || 5} />
              <p className="mt-3 text-sm text-gray-700 whitespace-pre-line">{t.content || "—"}</p>
              <div className="mt-4 text-sm font-semibold">{t._fullname}</div>
              <div className="text-xs text-gray-400">{new Date(t.created_at).toLocaleDateString()}</div>
            </div>
          ))}
          {!items.length && <div className="col-span-full text-gray-500">No testimonials yet.</div>}
        </div>
      )}
    </section>
  );
}
