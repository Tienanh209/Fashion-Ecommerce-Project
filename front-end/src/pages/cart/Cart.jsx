import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Breadcrumb } from "../../components";
import { useAuth } from "../../contexts/AuthContext";
import { getCart, updateItem, removeItem, clearCart } from "../../services/carts";
import { getProductByVariantId, getVariant, updateVariant } from "../../services/products";
import { imgUrl } from "../../utils/image";
import { checkout } from "../../services/orders";

function getUid(user) {
  return (
    user?.user_id ??
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

async function adjustInventoryFromOrderItems(lines = []) {
  const aggregated = new Map();

  lines.forEach((line) => {
    const variantId = Number(line?.variant_id || line?.variantId);
    const qty = Number(line?.quantity || 0);
    if (!variantId || !Number.isFinite(variantId) || qty <= 0) return;
    aggregated.set(variantId, (aggregated.get(variantId) || 0) + qty);
  });

  if (!aggregated.size) {
    return { ok: true, failures: [] };
  }

  const failures = [];

  await Promise.all(
    Array.from(aggregated.entries()).map(async ([variantId, orderedQty]) => {
      try {
        const detail = await getVariant(variantId);
        const stockCandidates = [
          detail?.stock,
          detail?.variant?.stock,
          detail?.data?.stock,
          detail?.inventory,
          detail?.quantity,
          detail?.product_variant?.stock,
        ];

        let currentStock = null;
        for (const candidate of stockCandidates) {
          const numeric = Number(candidate);
          if (Number.isFinite(numeric) && numeric >= 0) {
            currentStock = numeric;
            break;
          }
        }

        if (currentStock === null) {
          throw new Error("Variant stock is unavailable");
        }

        const nextStock = Math.max(0, currentStock - orderedQty);
        if (nextStock === currentStock) return;

        await updateVariant(variantId, { stock: nextStock });
      } catch (error) {
        console.warn("[Cart] Failed to adjust stock for variant", variantId, error);
        failures.push({ variantId, error });
      }
    })
  );

  return { ok: failures.length === 0, failures };
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

      const enriched = await Promise.all(
        baseItems.map(async (item) => {
          try {
            const detail = await getProductByVariantId(item.variant_id);
            const product = detail?.product || {};
            const variant = detail?.variant || {};
            const galleries = detail?.galleries || [];

            const rawStock = variant.stock ?? product.stock ?? null;
            const parsedStock = Number(rawStock);
            const normalizedStock =
              Number.isFinite(parsedStock) && parsedStock >= 0 ? parsedStock : null;

            const thumbCandidate =
              variant.thumbnail ||
              product.thumbnail ||
              galleries[0]?.image_url ||
              "";

            return {
              ...item,
              _title: product.title || variant.title || "Product",
              _thumb: imgUrl(thumbCandidate || "/images/image.png"),
              _size: variant.size || "",
              _color: variant.color || "",
              _stock: normalizedStock,
            };
          } catch (error) {
            console.warn("[Cart] Failed to load variant detail", item.variant_id, error);
            return {
              ...item,
              _title: "Product",
              _thumb: imgUrl("/images/image.png"),
              _size: "",
              _color: "",
              _stock: null,
            };
          }
        })
      );

      const adjustments = [];
      const sanitized = [];

      enriched.forEach((entry) => {
        const stockValue = entry._stock;
        const stock = Number(stockValue);
        const currentQty = Number(entry.quantity || 0);

        if (stockValue !== null && Number.isFinite(stock) && stock >= 0 && currentQty > stock) {
          const limited = Math.max(stock, 0);
          if (limited <= 0) {
            adjustments.push({ type: "remove", cart_item_id: entry.cart_item_id });
            return;
          }
          adjustments.push({ type: "update", cart_item_id: entry.cart_item_id, quantity: limited });
          sanitized.push({ ...entry, quantity: limited });
        } else {
          sanitized.push({ ...entry, quantity: currentQty });
        }
      });

      if (adjustments.length) {
        await Promise.allSettled(
          adjustments.map((adj) =>
            adj.type === "remove"
              ? removeItem(uid, adj.cart_item_id).catch((error) =>
                  console.warn("[Cart] Auto-remove failed", adj.cart_item_id, error)
                )
              : updateItem(uid, adj.cart_item_id, adj.quantity).catch((error) =>
                  console.warn("[Cart] Auto-adjust failed", adj.cart_item_id, error)
                )
          )
        );
        setNotice("Cart quantities were updated based on available stock.");
      }

      setItems(sanitized);
      setSummary(summary || {});
      setAddress((prev) => prev || user?.address || "");

      const totalQty = sanitized.reduce((sum, entry) => sum + Math.max(0, Number(entry.quantity || 0)), 0);
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
  }, [ready, user]);

  const onInc = async (it) => {
    const uid = getUid(user);
    try {
      const stockValue = it._stock;
      const parsedStock = Number(stockValue);
      const next = Number(it.quantity || 0) + 1;
      if (stockValue !== null && Number.isFinite(parsedStock) && parsedStock >= 0 && next > parsedStock) {
        alert("Reached available stock for this item.");
        return;
      }

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
      const stockValue = it._stock;
      const parsedStock = Number(stockValue);
      if (stockValue !== null && Number.isFinite(parsedStock) && parsedStock <= 0) {
        alert("This item is currently out of stock. Please remove it from your cart.");
        return;
      }
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
  const validatedItems = useMemo(
    () =>
      items.map((item) => {
        const stockRaw = item._stock;
        const stock = Number(stockRaw);
        const qty = Number(item.quantity || 0);
        if (stockRaw !== null && Number.isFinite(stock) && stock >= 0) {
          const limited = Math.min(qty, stock);
          return { ...item, quantity: limited };
        }
        return { ...item, quantity: qty };
      }),
    [items]
  );

  const subtotal = useMemo(
    () =>
      validatedItems.reduce(
        (s, it) => s + Number(it.price_snapshot || 0) * Number(it.quantity || 0),
        0
      ),
    [validatedItems]
  );
  const parsedDelivery = Number(summary.delivery_fee ?? NaN);
  const delivery_fee = Number.isFinite(parsedDelivery)
    ? parsedDelivery
    : (validatedItems.length ? 15000 : 0);
  const parsedDiscount = Number(summary.discount ?? NaN);
  const discount = Number.isFinite(parsedDiscount) ? parsedDiscount : 0;
  const total = Math.max(0, subtotal + delivery_fee - discount);
  const totalItems = useMemo(
    () => validatedItems.reduce((s, it) => s + Number(it.quantity || 0), 0),
    [validatedItems]
  );

  async function onCheckout() {
    try {
      const uid = getUid(user);
      if (!uid) return navigate("/login");
      if (!address.trim()) return alert("Please enter shipping address.");

      const cartLines = validatedItems
        .filter((it) => Number(it.quantity || 0) > 0)
        .map((it) => ({
          variant_id: it.variant_id,
          quantity: Number(it.quantity || 0),
        }));

      if (!cartLines.length) {
        alert("No items with available stock to checkout.");
        return;
      }

      setUpdating(true);
      await checkout(uid, {
        address: address.trim(),
        note: note || null,
      });

      const stockResult = await adjustInventoryFromOrderItems(cartLines);

      localStorage.setItem("hasNewOrder", "1");

      // reload + badge về 0 nếu giỏ rỗng
      await load();
      setNotice(
        stockResult.ok
          ? "Order placed! Open Orders from the account menu to view details."
          : "Order placed! Please review inventory levels – some items may need manual stock updates."
      );

      if (!stockResult.ok) {
        alert(
          "Order placed, but updating inventory for some items failed. Please verify product stock manually."
        );
      }
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
              {validatedItems.map((it) => {
                const stockValue = it._stock;
                const parsedStock = Number(stockValue);
                const qty = Number(it.quantity || 0);
                const hasStockLimit =
                  stockValue !== null && Number.isFinite(parsedStock) && parsedStock >= 0;
                const outOfStock = hasStockLimit && parsedStock <= 0;
                const atMax = hasStockLimit && qty >= parsedStock;
                const disableDec = updating || qty <= 1 || outOfStock;
                const disableInc = updating || outOfStock || atMax;

                return (
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
                      {hasStockLimit && parsedStock > 0 && (
                        <div className="mt-1 text-xs text-gray-500">
                          In stock: {parsedStock}
                        </div>
                      )}
                      {outOfStock && (
                        <div className="mt-1 text-xs text-red-500">
                          This item is out of stock.
                        </div>
                      )}
                    </div>

                    {/* Qty controls */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onDec(it)}
                        disabled={disableDec}
                        className="h-8 w-8 rounded-full border grid place-items-center hover:bg-gray-50 disabled:opacity-50"
                        aria-label="Decrease"
                      >
                        –
                      </button>
                      <div className="w-8 text-center">{qty}</div>
                      <button
                        onClick={() => onInc(it)}
                        disabled={disableInc}
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
                );
              })}

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
