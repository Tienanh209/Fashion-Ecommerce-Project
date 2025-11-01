import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { Breadcrumb } from "../../components"
import { getOrder, cancelOrder } from "../../services/orders";
import { imgUrl } from "../../utils/image";

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [order, setOrder] = useState(null);

  async function load() {
    try {
      setLoading(true);
      setErr("");
      const { order } = await getOrder(id);
      setOrder(order || null);
    } catch (e) {
      setErr(e?.message || "Failed to load order");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  async function onCancel() {
    if (!order) return;
    if (!confirm("Cancel this order? (only pending)")) return;
    try {
      await cancelOrder(order.order_id);
      await load();
      alert("Order cancelled");
    } catch (e) {
      alert(e?.message || "Cancel failed");
    }
  }

  return (
    <div className="min-h-screen bg-white container mx-auto px-4 py-6">
        <Breadcrumb items={[{ label: "Home", to: "/" }, { label: "Orders", to: "/orders" }, { label: `#${id}` }]} />
        <h1 className="text-2xl md:text-3xl font-extrabold mt-1">Order #{id}</h1>

        {loading ? (
          <div className="py-10">Loading…</div>
        ) : err ? (
          <div className="py-10 text-red-600">{err}</div>
        ) : !order ? (
          <div className="py-10 text-gray-500">Not found.</div>
        ) : (
          <div className="mt-6 grid md:grid-cols-3 gap-6">
            <section className="md:col-span-2 space-y-3">
              {(order.items || []).map((it) => (
                <article key={it.order_item_id} className="rounded-2xl border p-3 flex items-center gap-3">
                  <div className="h-24 w-24 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    <img
                      src={imgUrl(it.product_thumbnail || "/images/image.png")}
                      alt={it.product_title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{it.product_title}</div>
                    <div className="text-sm text-gray-500">Size: <b>{it.size || "-"}</b> • Color: <b>{it.color || "-"}</b></div>
                    <div className="text-sm">Qty: {it.quantity}</div>
                  </div>
                  <div className="font-semibold">
                    {(Number(it.price || 0) * Number(it.quantity || 0)).toLocaleString()}₫
                  </div>
                </article>
              ))}
            </section>

            <aside className="md:col-span-1">
              <div className="rounded-2xl border p-4 space-y-2">
                <div>Status: <b>{order.status}</b></div>
                <div>Address: {order.address}</div>
                <div>Note: {order.note || "-"}</div>
                <div className="border-t pt-2 flex items-center justify-between font-semibold">
                  <span>Total</span>
                  <span>{Number(order.total_price || 0).toLocaleString()}₫</span>
                </div>
                {order.status === "pending" && (
                  <button
                    onClick={onCancel}
                    className="mt-3 w-full h-10 rounded-full border border-red-500 text-red-600 hover:bg-red-50"
                  >
                    Cancel order
                  </button>
                )}
                <button
                  onClick={() => navigate("/orders")}
                  className="mt-2 w-full h-10 rounded-full border hover:bg-gray-50"
                >
                  Back to Orders
                </button>
              </div>
            </aside>
          </div>
        )}
    </div>
  );
}
