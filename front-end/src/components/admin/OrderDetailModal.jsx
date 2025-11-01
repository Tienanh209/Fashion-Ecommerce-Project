import { useCallback, useEffect, useMemo, useState } from "react";
import { getOrder as apiGetOrder, updateOrderStatus as apiUpdateStatus } from "../../services/orders";
import { getUser as apiGetUser } from "../../services/users";
import dayjs from "dayjs";
import { resolveVariantMetaBatch, getProduct } from "../../services/products";
import { imgUrl } from "../../utils/image";
import UpdateOrderModal from "./UpdateOrderModal";
import { Printer } from "lucide-react";

const PLACEHOLDER_IMG = "/placeholder.png";

const resolveCustomerName = (order) => {
  if (!order) return "-";

  const candidates = [
    order.user?.fullname,
    order.user?.email,
  ].filter(Boolean);

  if (candidates.length > 0) return candidates[0];
  if (order.user_id != null) return `User ${order.user_id}`;
  return "Unknown";
};

const getVariantId = (item) =>
  item?.variant_id ??
  null;

const getProductId = (item) =>
  item?.product_id ??
  null;

const enrichOrderItems = async (rawItems = []) => {
  if (!Array.isArray(rawItems) || rawItems.length === 0) return rawItems || [];

  const variantIds = [
    ...new Set(
      rawItems
        .map((it) => Number(getVariantId(it)) || 0)
        .filter((id) => id > 0)
    ),
  ];

  let metaMap = new Map();
  if (variantIds.length > 0) {
    try {
      metaMap = await resolveVariantMetaBatch(variantIds);
    } catch (err) {
      console.warn("[OrderDetailModal] resolveVariantMetaBatch failed", err);
      metaMap = new Map();
    }
  }

  const productIds = [
    ...new Set(
      rawItems
        .map((it) => Number(getProductId(it)) || 0)
        .filter((id) => id > 0)
    ),
  ];

  const productMap = {};
  if (productIds.length > 0) {
    await Promise.all(
      productIds.map(async (pid) => {
        if (!pid) return;
        try {
          const product = await getProduct(pid);
          if (product) productMap[pid] = product;
        } catch (err) {
          console.warn("[OrderDetailModal] getProduct failed", pid, err);
        }
      })
    );
  }

  return rawItems.map((it) => {
    const variantId = Number(getVariantId(it)) || 0;
    const meta = variantId ? metaMap.get(variantId) : null;

    const productId = Number(getProductId(it)) || 0;
    const fallbackProduct =
      (meta?.product_id ? productMap[meta.product_id] : null) ||
      (productId ? productMap[productId] : null) ||
      it.product ||
      it.product_variant?.product ||
      null;

    const thumbCandidate =
      meta?.product_thumbnail ||
      it.thumbnail;

    const resolvedThumb =
      thumbCandidate && thumbCandidate !== PLACEHOLDER_IMG
        ? imgUrl(thumbCandidate)
        : "";

    const titleCandidate =
      meta?.product_title ||
      it.title;

    return {
      ...it,
      _variantMeta: meta || undefined,
      _product: fallbackProduct || undefined,
      _thumb: resolvedThumb || PLACEHOLDER_IMG,
      _title: titleCandidate || "Product",
    };
  });
};

export default function OrderDetailModal({ orderId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [showUpdate, setShowUpdate] = useState(false);

  const loadOrder = useCallback(async () => {
    const res = await apiGetOrder(orderId);
    const data = res?.data || res;
    const ord = data?.order || data;

    if (!ord) return { order: null, items: [] };

    const rawItems = Array.isArray(data?.items) ? data.items : Array.isArray(ord?.items) ? ord.items : [];
    let enrichedOrder = { ...ord };
    let userData = ord?.user || ord?.customer || null;

    if (!userData && ord?.user_id != null) {
      try {
        const fetched = await apiGetUser(ord.user_id);
        userData =
          fetched?.user;
      } catch (err) {
        console.warn("[OrderDetailModal] fetch user failed", ord.user_id, err);
      }
    }

    if (userData) {
      enrichedOrder = {
        ...enrichedOrder,
        user: { ...(enrichedOrder.user || {}), ...(userData || {}) },
        customer: enrichedOrder.customer
          ? { ...(enrichedOrder.customer || {}), ...(userData || {}) }
          : userData,
      };
    }

    const displayName = resolveCustomerName(enrichedOrder);
    enrichedOrder = {
      ...enrichedOrder,
      customer_name: displayName,
    };

    const enrichedItems = await enrichOrderItems(rawItems);
    return { order: enrichedOrder, items: enrichedItems };
  }, [orderId]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        const { order: loadedOrder, items: loadedItems } = await loadOrder();
        if (!cancel) {
          setOrder(loadedOrder);
          setItems(loadedItems);
        }
      } catch (e) {
        console.error(e);
        if (!cancel) {
          alert(e?.message || "Failed to fetch order");
          onClose?.();
        }
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [loadOrder, onClose]);

  const customerName = useMemo(() => resolveCustomerName(order), [order]);
  const canUpdate = !!order && order.status !== "cancelled" && order.status !== "completed";
  const printButtonClass =
    "inline-flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-3.5 py-2 text-sm text-neutral-800 hover:bg-neutral-50";
  const updateButtonClass = canUpdate
    ? "inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-black/90"
    : "inline-flex items-center justify-center rounded-md bg-gray-200 px-4 py-2 text-sm text-gray-500 cursor-not-allowed";

  const handlePrint = () => {
    window.print();
  };

  const handleUpdateStatus = async (id, nextStatus) => {
    try {
      setLoading(true);
      await apiUpdateStatus(id, nextStatus);
      const { order: refreshedOrder, items: refreshedItems } = await loadOrder();
      setOrder(refreshedOrder);
      setItems(refreshedItems);
      alert("Order updated");
    } catch (e) {
      console.error(e);
      alert(e?.message || "Failed to update order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center">
        <div className="bg-white rounded-2xl w-full max-w-2xl p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">Order #{orderId}</h3>
            <button className="h-8 px-3 rounded-full border" onClick={onClose}>
              Close
            </button>
          </div>

          {loading ? (
            <div className="py-10 text-center">Loading…</div>
          ) : !order ? (
            <div className="py-10 text-center text-red-600">Order not found</div>
          ) : (
            <>
              <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <div>Created: <b>{dayjs(order.created_at).format("YYYY-MM-DD HH:mm")}</b></div>
                <div>Status: <b className="uppercase">{order.status}</b></div>
                <div>Customer: <b>{customerName}</b></div>
                <div>Phone: <b>{order.phone_number || "-"}</b></div>
                <div className="sm:col-span-2">Address: <b>{order.address || "-"}</b></div>
              </div>

              <div className="mt-4 border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left">
                    <tr>
                      <th className="p-3">Item</th>
                      <th className="p-3">Variant</th>
                      <th className="p-3">Qty</th>
                      <th className="p-3">Price</th>
                      <th className="p-3">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td className="p-6 text-center" colSpan={5}>
                          No items.
                        </td>
                      </tr>
                    ) : (
                      items.map((it) => (
                        <tr key={it.order_item_id} className="border-t">
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <img
                                src={it._thumb || imgUrl(it.thumbnail) || PLACEHOLDER_IMG}
                                alt=""
                                className="w-12 h-12 rounded-md object-cover bg-gray-100"
                              />
                              <div className="font-medium">{it._title || it.title || it.product_title}</div>
                            </div>
                          </td>
                          <td className="p-3 text-gray-600">
                            {it.size ? `Size: ${it.size}` : ""} {it.color ? `• Color: ${it.color}` : ""}
                          </td>
                          <td className="p-3">{it.quantity}</td>
                          <td className="p-3">{(it.price ?? 0).toLocaleString()}₫</td>
                          <td className="p-3">
                            {((it.price ?? 0) * (it.quantity ?? 0)).toLocaleString()}₫
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 text-right text-base">
                <span className="mr-2 text-gray-600">Total:</span>
                <b>{(order.total_price ?? 0).toLocaleString()}₫</b>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrint}
                    className={printButtonClass}
                    type="button"
                  >
                    <Printer className="h-4 w-4" /> Print
                  </button>
                </div>
                <button
                  type="button"
                  className={updateButtonClass}
                  onClick={() => canUpdate && setShowUpdate(true)}
                  disabled={!canUpdate}
                >
                  Update Order
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      {showUpdate && (
        <UpdateOrderModal
          orderId={order?.order_id ?? orderId}
          onClose={() => setShowUpdate(false)}
          onSubmit={handleUpdateStatus}
        />
      )}
    </>
  );
}
