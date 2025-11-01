import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Breadcrumb } from "../../components"
import { useAuth } from "../../contexts/AuthContext";
import { getCart, updateItem, removeItem, clearCart } from "../../services/carts";
import { resolveVariantMetaBatch } from "../../services/products";
import { imgUrl } from "../../utils/image";
import { checkout } from "../../services/orders";

function getUid(user) {
  return (
    user?.user_id ??
    user?.id ??
    user?.user?.user_id ??
    user?.user?.id ??
    null
  );
}

function normalizeBaseItem(it) {
  return {
    cart_item_id: it.cart_item_id,
    variant_id: it.variant_id,
    quantity: Number(it.quantity || 0),
    price_snapshot: Number(it.price_snapshot ?? it.price ?? 0),
  };
}

export default function Cart() {
  const { user, ready } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");
  const [items, setItems] = useState([]); // enriched
  const [summary, setSummary] = useState({
    subtotal: 0,
    discount: 0,
    delivery_fee: 0,
    total: 0,
  });
  const [updating, setUpdating] = useState(false);

  // Quick checkout inputs
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");

  // Broadcast helper for header badge
  const broadcastCount = (count) =>
    window.dispatchEvent(new CustomEvent("cart:count", { detail: { count } }));

  const load = async () => {
    const uid = getUid(user);
    if (!uid) {
      setLoading(false);
      broadcastCount(0);
      return;
    }
    try {
      setLoading(true);
      setErr("");
      setNotice("");

      const { items: rawItems, summary } = await getCart(uid);
      const baseItems = (rawItems || []).map(normalizeBaseItem);

      // Enrich with product meta
      const variantIds = baseItems.map((x) => x.variant_id);
      const metaMap = await resolveVariantMetaBatch(variantIds);

      const enriched = baseItems.map((x) => {
        const m = metaMap.get(Number(x.variant_id)) || {};
        return {
          ...x,
          _title: m.product_title || "Product",
          _thumb: imgUrl(m.product_thumbnail || "/images/image.png"),
          _size: m.size || "",
          _color: m.color || "",
        };
      });

      setItems(enriched);
      setSummary(summary || {});
      setAddress((prev) => prev || user?.address || "");

      // cập nhật badge ngay
      const totalQty = enriched.reduce(
        (s, it) => s + Number(it.quantity || 0),
        0
      );
      broadcastCount(totalQty);
    } catch (e) {
      console.error("[Cart] load error:", e);
      setErr(e?.message || "Failed to load cart");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!ready) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user]);

  const onInc = async (it) => {
    const uid = getUid(user);
    try {
      setUpdating(true);
      await updateItem(uid, it.cart_item_id, Number(it.quantity || 0) + 1);
      await load();
    } catch (e) {
      alert(e?.message || "Update failed");
    } finally {
      setUpdating(false);
    }
  };

  const onDec = async (it) => {
    const uid = getUid(user);
    try {
      setUpdating(true);
      const next = Math.max(1, Number(it.quantity || 0) - 1);
      await updateItem(uid, it.cart_item_id, next);
      await load();
    } catch (e) {
      alert(e?.message || "Update failed");
    } finally {
      setUpdating(false);
    }
  };

  const onRemove = async (it) => {
    const uid = getUid(user);
    if (!confirm("Remove this item?")) return;
    try {
      setUpdating(true);
      await removeItem(uid, it.cart_item_id);
      await load();
    } catch (e) {
      alert(e?.message || "Remove failed");
    } finally {
      setUpdating(false);
    }
  };

  const onClear = async () => {
    const uid = getUid(user);
    if (!confirm("Clear your cart?")) return;
    try {
      setUpdating(true);
      await clearCart(uid);
      await load(); // sẽ broadcast 0
    } catch (e) {
      alert(e?.message || "Clear failed");
    } finally {
      setUpdating(false);
    }
  };

  // Totals (fallback compute nếu BE không trả)
  const subtotal =
    summary.subtotal ||
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useMemo(
      () =>
        items.reduce(
          (s, it) =>
            s +
            Number(it.price_snapshot || 0) * Number(it.quantity || 0),
          0
        ),
      [items]
    );
  const delivery_fee = summary.delivery_fee ?? (items.length ? 15000 : 0);
  const discount = summary.discount ?? 0;
  const total = summary.total || subtotal + delivery_fee - discount;
  const totalItems = useMemo(
    () => items.reduce((s, it) => s + Number(it.quantity || 0), 0),
    [items]
  );

  async function onCheckout() {
    try {
      const uid = getUid(user);
      if (!uid) return navigate("/login");
      if (!address.trim()) return alert("Please enter shipping address.");

      setUpdating(true);
      await checkout(uid, {
        address: address.trim(),
        note: note || null,
      });

      localStorage.setItem("hasNewOrder", "1");

      // reload + badge về 0 nếu giỏ rỗng
      await load();
      setNotice(
        "Order placed! Open Orders from the account menu to view details."
      );
    } catch (e) {
      alert(e?.message || "Checkout failed");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="min-h-screen bg-white container mx-auto px-4 py-6">
        <Breadcrumb items={[{ label: "Home", to: "/" }, { label: "Cart" }]} />
        <h1 className="text-2xl md:text-3xl font-extrabold mt-1">Your cart</h1>

        {notice && (
          <div className="mt-3 rounded-xl bg-green-50 text-green-700 px-4 py-3">
            {notice}
          </div>
        )}

        {loading ? (
          <div className="py-10">Loading…</div>
        ) : err ? (
          <div className="py-10 text-red-600">{err}</div>
        ) : items.length === 0 ? (
          <div className="py-10 text-gray-500">Your cart is empty.</div>
        ) : (
          <div className="mt-6 grid md:grid-cols-3 gap-6">
            {/* Items list */}
            <section className="md:col-span-2 space-y-3">
              {items.map((it) => (
                <article
                  key={it.cart_item_id}
                  className="rounded-2xl border p-3 flex items-center gap-3"
                >
                  <div className="h-20 w-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    <img
                      src={it._thumb}
                      alt={it._title}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = imgUrl("/images/image.png");
                      }}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{it._title}</div>
                    <div className="text-xs text-gray-500">
                      Size: <b>{it._size || "-"}</b> &nbsp; Color:{" "}
                      <b>{it._color || "-"}</b>
                    </div>
                    <div className="mt-1 font-bold">
                      {Number(it.price_snapshot || 0).toLocaleString()}₫
                    </div>
                  </div>

                  {/* Qty controls */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onDec(it)}
                      disabled={updating}
                      className="h-8 w-8 rounded-full border grid place-items-center hover:bg-gray-50 disabled:opacity-50"
                      aria-label="Decrease"
                    >
                      –
                    </button>
                    <div className="w-8 text-center">{it.quantity}</div>
                    <button
                      onClick={() => onInc(it)}
                      disabled={updating}
                      className="h-8 w-8 rounded-full border grid place-items-center hover:bg-gray-50 disabled:opacity-50"
                      aria-label="Increase"
                    >
                      +
                    </button>
                  </div>

                  {/* remove */}
                  <button
                    onClick={() => onRemove(it)}
                    disabled={updating}
                    className="ml-2 h-8 w-8 rounded-full grid place-items-center text-red-600 hover:bg-red-50 disabled:opacity-50"
                    aria-label="Remove"
                    title="Remove"
                  >
                    🗑
                  </button>
                </article>
              ))}

              {!!items.length && (
                <button
                  onClick={onClear}
                  disabled={updating}
                  className="text-sm text-gray-600 underline"
                >
                  Clear cart
                </button>
              )}
            </section>

            {/* Summary + Checkout */}
            <aside className="md:col-span-1">
              <div className="rounded-2xl border p-4">
                <h2 className="font-semibold">Order Summary</h2>

                <div className="mt-4 space-y-3 text-sm">
                  <Row
                    label="Subtotal"
                    value={`${subtotal.toLocaleString()}₫`}
                  />
                  <Row
                    label="Delivery Fee"
                    value={`${delivery_fee.toLocaleString()}₫`}
                  />
                  {discount ? (
                    <Row
                      label="Discount"
                      value={`-${discount.toLocaleString()}₫`}
                      valueClass="text-red-600"
                    />
                  ) : null}
                  <div className="border-t pt-3 font-semibold flex items-center justify-between">
                    <span>Total</span>
                    <span>{total.toLocaleString()}₫</span>
                  </div>
                </div>

                {/* Shipping info (quick input) */}
                <div className="mt-4 space-y-2">
                  <label className="text-sm text-gray-600">
                    Shipping address
                  </label>
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter your address"
                    className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
                  />
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Note (optional)"
                    className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
                  />
                </div>

                <button
                  className="mt-4 w-full h-11 rounded-full bg-black text-white font-semibold hover:opacity-90 disabled:opacity-50"
                  onClick={onCheckout}
                  disabled={updating}
                >
                  Go to Checkout →
                </button>

                <p className="mt-2 text-xs text-gray-500 text-center">
                  {totalItems} item{totalItems > 1 ? "s" : ""} in cart
                </p>
              </div>
            </aside>
          </div>
        )}
    </div>
  );
}

function Row({ label, value, valueClass = "" }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-600">{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}
