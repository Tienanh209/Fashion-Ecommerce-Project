import { useEffect, useState } from "react";
import { Breadcrumb } from "../../components"
import { useAuth } from "../../contexts/AuthContext";
import { listMyOrders } from "../../services/orders";
import { Link } from "react-router";
import dayjs from "dayjs";

export default function Orders() {
  const { user, ready } = useAuth();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (!ready) return;
    if (!user) return setLoading(false);
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const { orders = [] } = await listMyOrders(user.user_id || user.id);
        setOrders(orders);
      } catch (e) {
        setErr(e?.message || "Failed to load orders");
      } finally {
        setLoading(false);
      }
    })();
  }, [ready, user]);

  return (
    <div className="min-h-screen bg-white container mx-auto px-4 py-6">
        <Breadcrumb items={[{ label: "Home", to: "/" }, { label: "Orders" }]} />
        <h1 className="text-2xl md:text-3xl font-extrabold mt-1">My Orders</h1>

        {loading ? (
          <div className="py-10">Loading…</div>
        ) : err ? (
          <div className="py-10 text-red-600">{err}</div>
        ) : orders.length === 0 ? (
          <div className="py-10 text-gray-500">No orders yet.</div>
        ) : (
          <div className="mt-6 space-y-3">
            {orders.map((o) => (
              <Link
                key={o.order_id}
                to={`/orders/${o.order_id}`}
                className="block rounded-2xl border p-4 hover:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">#{o.order_id} • {o.status}</div>
                    <div className="text-sm text-gray-500">
                      {dayjs(o.created_at).format("YYYY-MM-DD HH:mm")} • {o.address}
                    </div>
                  </div>
                  <div className="font-semibold">{Number(o.total_price || 0).toLocaleString()}₫</div>
                </div>
              </Link>
            ))}
          </div>
        )}
    </div>
  );
}
