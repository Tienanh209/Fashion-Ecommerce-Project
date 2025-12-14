import { useEffect, useMemo, useState } from "react";
import { listPurchaseOrders, getPurchaseOrder } from "../../services/purchaseOrders";

const formatDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return date.toLocaleString();
};

const fmtCurrency = (value) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(Number(value)) ? Number(value) : 0);

export default function PurchaseOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const data = await listPurchaseOrders();
        if (!cancel) {
          setOrders(data || []);
        }
      } catch (err) {
        console.error(err);
        if (!cancel) setError(err?.message || "Failed to load stock imports.");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedOrderId) {
      setSelectedOrder(null);
      return;
    }
    let cancel = false;
    (async () => {
      try {
        setDetailLoading(true);
        const data = await getPurchaseOrder(selectedOrderId);
        if (!cancel) setSelectedOrder(data);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancel) setDetailLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [selectedOrderId]);

  useEffect(() => {
    if (!selectedOrderId && orders.length) {
      setSelectedOrderId(orders[0].purchase_order_id);
    }
  }, [orders, selectedOrderId]);

  useEffect(() => {
    if (
      selectedOrderId &&
      !orders.some((order) => order.purchase_order_id === selectedOrderId)
    ) {
      setSelectedOrderId(orders[0]?.purchase_order_id || null);
    }
  }, [orders, selectedOrderId]);

  const summaryTotals = useMemo(() => {
    const totalQty = orders.reduce((sum, order) => sum + Number(order.total_quantity || 0), 0);
    const totalCost = orders.reduce((sum, order) => sum + Number(order.total_cost || 0), 0);
    return { totalQty, totalCost };
  }, [orders]);

  return (
    <div className="min-h-[calc(100vh-64px)] w-full bg-neutral-50">
      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">Import Stock</h1>
            <p className="text-sm text-neutral-500">
              Track every shipment received from suppliers
            </p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-700">
            Total quantity received:{" "}
            <span className="font-semibold text-neutral-900">
              {summaryTotals.totalQty.toLocaleString()}
            </span>{" "}
            · Total cost:{" "}
            <span className="font-semibold text-neutral-900">
              {fmtCurrency(summaryTotals.totalCost)}
            </span>
          </div>
        </div>
        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-200 px-5 py-4">
              <div className="text-sm font-medium text-neutral-900">Recent Import</div>
              <div className="text-xs text-neutral-500">
                Click a row to view line items
              </div>
            </div>
            <div className="max-h-[600px] overflow-auto">
              <table className="min-w-full divide-y divide-neutral-200 text-sm">
                <thead className="bg-neutral-50 text-neutral-500">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Order</th>
                    <th className="px-4 py-2 text-left font-medium">Supplier</th>
                    <th className="px-4 py-2 text-right font-medium">Items</th>
                    <th className="px-4 py-2 text-right font-medium">Qty</th>
                    <th className="px-4 py-2 text-right font-medium">Total cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-neutral-700">
                  {loading ? (
                    <tr>
                      <td className="px-4 py-6 text-center text-sm text-neutral-500" colSpan={5}>
                        Loading...
                      </td>
                    </tr>
                  ) : orders.length ? (
                    orders.map((order) => (
                      <tr
                        key={order.purchase_order_id}
                        className={`cursor-pointer transition hover:bg-neutral-50 ${
                          selectedOrderId === order.purchase_order_id
                            ? "bg-neutral-100"
                            : ""
                        }`}
                        onClick={() => setSelectedOrderId(order.purchase_order_id)}
                      >
                        <td className="px-4 py-3 font-semibold text-neutral-900">
                          #{order.purchase_order_id}
                          <div className="text-xs font-normal text-neutral-500">
                            {formatDateTime(order.created_at)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{order.supplier_name || "—"}</div>
                          <div className="text-xs text-neutral-500">
                            {order.supplier_address || ""}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {order.total_items.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {order.total_quantity.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {fmtCurrency(order.total_cost)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-4 py-6 text-center text-sm text-neutral-500" colSpan={5}>
                        No import stocks yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-200 px-5 py-4">
              <div className="text-sm font-medium text-neutral-900">
                Import details
              </div>
              <div className="text-xs text-neutral-500">
                {selectedOrderId ? `#${selectedOrderId}` : "Select an order"}
              </div>
            </div>
            {detailLoading ? (
              <div className="p-6 text-sm text-neutral-500">Loading details…</div>
            ) : selectedOrder ? (
              <div className="p-6 space-y-4">
                <div>
                  <div className="text-xs uppercase tracking-wide text-neutral-500">
                    Supplier
                  </div>
                  <div className="text-base font-semibold text-neutral-900">
                    {selectedOrder.supplier_name}
                  </div>
                  <div className="text-sm text-neutral-500">
                    {selectedOrder.supplier_address || "No address provided"}
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg bg-neutral-50 p-3">
                    <div className="text-xs text-neutral-500">Created</div>
                    <div className="text-sm font-semibold text-neutral-900">
                      {formatDateTime(selectedOrder.created_at)}
                    </div>
                  </div>
                  <div className="rounded-lg bg-neutral-50 p-3">
                    <div className="text-xs text-neutral-500">Items</div>
                    <div className="text-sm font-semibold text-neutral-900">
                      {selectedOrder.items.length}
                    </div>
                  </div>
                  <div className="rounded-lg bg-neutral-50 p-3">
                    <div className="text-xs text-neutral-500">Total quantity</div>
                    <div className="text-sm font-semibold text-neutral-900">
                      {selectedOrder.items
                        .reduce((sum, item) => sum + Number(item.quantity || 0), 0)
                        .toLocaleString()}
                    </div>
                  </div>
                </div>
                {selectedOrder.note ? (
                  <div>
                    <div className="text-xs uppercase tracking-wide text-neutral-500">
                      Note
                    </div>
                    <p className="mt-1 rounded-lg bg-neutral-50 p-3 text-sm text-neutral-700">
                      {selectedOrder.note}
                    </p>
                  </div>
                ) : null}
                <div className="rounded-lg border border-neutral-200">
                  <table className="min-w-full divide-y divide-neutral-200 text-sm">
                    <thead className="bg-neutral-50 text-neutral-500">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium">Product</th>
                        <th className="px-4 py-2 text-right font-medium">Cost</th>
                        <th className="px-4 py-2 text-right font-medium">Selling</th>
                        <th className="px-4 py-2 text-right font-medium">Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 text-neutral-800">
                      {selectedOrder.items.map((item) => (
                        <tr key={item.import_id}>
                          <td className="px-4 py-3">
                            <div className="font-medium">{item.product_title || "Product"}</div>
                            <div className="text-xs text-neutral-500">
                              {item.sku ? `SKU ${item.sku} · ` : ""}
                              {[item.color, item.size].filter(Boolean).join(" / ")}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {fmtCurrency(item.cost_price)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {fmtCurrency(item.selling_price)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {Number(item.quantity || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="p-6 text-sm text-neutral-500">
                Select an order to view its line items.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
