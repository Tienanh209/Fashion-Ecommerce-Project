import { useEffect, useMemo, useState } from "react";
import { Check, X, Search, Filter } from "lucide-react";
import { listAdminReviews, updateReviewStatus } from "../../services/reviews";

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export default function Reviews() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState({ ok: "", err: "" });

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const params = {
          status: statusFilter !== "all" ? statusFilter : undefined,
          limit: 200,
          page: 1,
        };
        const res = await listAdminReviews(params);
        if (!cancel) setItems(res?.reviews || res?.data?.reviews || []);
      } catch (e) {
        console.error(e);
        if (!cancel) setError(e?.message || "Failed to load reviews");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [statusFilter]);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const keyword = search.trim().toLowerCase();
    return items.filter((r) =>
      [r.product_title, r.title, r.user_fullname]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(keyword))
    );
  }, [items, search]);

  const handleModerate = async (review_id, status) => {
    try {
      await updateReviewStatus(review_id, status);
      setItems((prev) =>
        prev.map((r) => (r.review_id === review_id ? { ...r, status } : r))
      );
      setMessage({ ok: `Updated review #${review_id} to ${status}.`, err: "" });
    } catch (e) {
      console.error(e);
      setMessage({ ok: "", err: e?.message || "Failed to update status" });
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] w-full bg-neutral-50">
      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">Reviews</h1>
            <p className="text-sm text-neutral-500">Moderate user feedback for products.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-md border border-neutral-300 bg-white px-2">
              <Search className="h-4 w-4 text-neutral-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by product/user/title"
                className="h-9 bg-transparent px-2 text-sm focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-700">
              <Filter className="h-4 w-4" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent focus:outline-none"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {message.err ? (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {message.err}
          </div>
        ) : null}
        {message.ok ? (
          <div className="mb-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {message.ok}
          </div>
        ) : null}

        <div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-neutral-600">
                <tr className="[&>th]:px-5 [&>th]:py-3">
                  <th>ID</th>
                  <th>User</th>
                  <th>Product</th>
                  <th>Rating</th>
                  <th>Title</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-6 text-center text-neutral-500">
                      Loading…
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-6 text-center text-red-600">
                      {error}
                    </td>
                  </tr>
                ) : !filtered.length ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-6 text-center text-neutral-500">
                      No reviews found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={r.review_id} className="text-neutral-800">
                      <td className="px-5 py-3">#{r.review_id}</td>
                      <td className="px-5 py-3">
                        <div className="font-medium">{r.user_fullname}</div>
                        <div className="text-xs text-neutral-500">{r.user_email}</div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="font-medium line-clamp-1">{r.product_title}</div>
                        <div className="text-xs text-neutral-500">Product #{r.product_id}</div>
                      </td>
                      <td className="px-5 py-3">{r.rating}★</td>
                      <td className="px-5 py-3 max-w-[220px] line-clamp-2">{r.title || "(No title)"}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            r.status === "approved"
                              ? "bg-green-100 text-green-700"
                              : r.status === "rejected"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right space-x-2">
                        {r.status === "pending" ? (
                          <>
                            <button
                              className="inline-flex items-center gap-1 rounded-md border border-green-200 bg-green-50 px-2 py-1 text-xs font-semibold text-green-700 hover:bg-green-100"
                              onClick={() => handleModerate(r.review_id, "approved")}
                            >
                              <Check className="h-4 w-4" /> Approve
                            </button>
                            <button
                              className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                              onClick={() => handleModerate(r.review_id, "rejected")}
                            >
                              <X className="h-4 w-4" /> Reject
                            </button>
                          </>
                        ) : (
                          <button
                            className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                            onClick={() => handleModerate(r.review_id, "rejected")}
                            title="Delete review"
                          >
                            <X className="h-4 w-4" /> Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
