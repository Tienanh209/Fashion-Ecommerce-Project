import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { useAuth } from "../../contexts/AuthContext";

import {
  listOrders as apiListOrders,
  updateOrderStatus as apiUpdateStatus,
  cancelOrder as apiCancelOrder,
} from "../../services/orders";
import { getUser as apiGetUser } from "../../services/users";

import OrderDetailModal from "../../components/admin/OrderDetailModal";
import UpdateOrderModal from "../../components/admin/UpdateOrderModal";

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-700",
  paid: "bg-blue-100 text-blue-700",
  shipped: "bg-indigo-100 text-indigo-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const ALL_STATUSES = ["pending", "paid", "shipped", "completed", "cancelled"];

const SUMMARY_CARD_CONFIG = [
  { key: "all", label: "All Orders", filterValue: "" },
  { key: "pending", label: "Pending", filterValue: "pending" },
  { key: "paid", label: "Paid", filterValue: "paid" },
  { key: "shipped", label: "Shipped", filterValue: "shipped" },
  { key: "completed", label: "Completed", filterValue: "completed" },
  { key: "cancelled", label: "Cancelled", filterValue: "cancelled" },
];

const INITIAL_SUMMARY = {
  all: 0,
  pending: 0,
  paid: 0,
  shipped: 0,
  completed: 0,
  cancelled: 0,
};

const ACTION_BTN_BASE =
  "h-8 px-3 rounded-full border text-sm font-medium transition-colors";
const DISABLED_BTN_STYLE =
  "border-gray-200 text-gray-400 bg-gray-100 cursor-not-allowed";

const extractTotalRecords = (payload) => {
  if (!payload || typeof payload !== "object") return 0;
  const metadata =
    payload.metadata ||
    payload.data?.metadata ||
    payload.pagination ||
    payload.data?.pagination ||
    {};
  const candidates = [
    metadata.totalRecords,
    metadata.total,
    metadata.count,
    payload.total,
    payload.count,
  ];
  for (const candidate of candidates) {
    const parsed = Number(candidate);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  const orders =
    payload.orders ||
    payload.items ||
    payload.data?.orders ||
    payload.data?.items;
  if (Array.isArray(orders)) return orders.length;
  return 0;
};

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

export default function OrdersManagement() {
  const { user } = useAuth();
  const isAdmin = !!user && (user.role === "admin" || user.role_id === 1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("");

  const [summaryCounts, setSummaryCounts] = useState(INITIAL_SUMMARY);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");

  // modal controls
  const [detailId, setDetailId] = useState(null);
  const [updateId, setUpdateId] = useState(null);

  // eslint-disable-next-line no-unused-vars
  const totalPages = useMemo(() => {
    if (!total || !limit) return 1;
    return Math.max(1, Math.ceil(total / limit));
  }, [total, limit]);

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError("");

    const baseParams = { page: 1, limit: 1 };
    if (!isAdmin && user?.user_id) {
      baseParams.user_id = user.user_id;
    }

    let encounteredError = false;

    try {
      const results = await Promise.all(
        [
          { key: "all", status: null },
          { key: "pending", status: "pending" },
          { key: "paid", status: "paid" },
          { key: "shipped", status: "shipped" },
          { key: "completed", status: "completed" },
          { key: "cancelled", status: "cancelled" },
        ].map(async ({ key, status: statusFilter }) => {
          const params = { ...baseParams };
          if (statusFilter) params.status = statusFilter;
          try {
            const res = await apiListOrders(params);
            const totalRecords = extractTotalRecords(res);
            return [key, totalRecords];
          } catch (error) {
            console.warn(
              "[OrdersManagement] summary fetch failed for",
              statusFilter || "all",
              error
            );
            encounteredError = true;
            return [key, 0];
          }
        })
      );

      const next = { ...INITIAL_SUMMARY };
      results.forEach(([key, value]) => {
        const parsed = Number(value);
        next[key] = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
      });

      setSummaryCounts(next);
      setSummaryError(
        encounteredError ? "Some summary data could not be loaded." : ""
      );
    } catch (error) {
      console.error("[OrdersManagement] summary fetch error", error);
      setSummaryError(error?.message || "Failed to load order summary.");
      setSummaryCounts({ ...INITIAL_SUMMARY });
    } finally {
      setSummaryLoading(false);
    }
  }, [isAdmin, user?.user_id]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError("");

      const q = { page, limit };
      if (status) q.status = status;
      if (!isAdmin && user?.user_id) q.user_id = user.user_id;

      const res = await apiListOrders(q);
      let items = res?.items || res?.orders || res?.data?.items || res?.data?.orders || [];
      const metadata = res?.metadata || {};

      if (isAdmin && items.length > 0) {
        const uniqueIds = [
          ...new Set(items.map((ord) => ord.user_id).filter((id) => id != null)),
        ];

        if (uniqueIds.length > 0) {
          const fetchedUsers = await Promise.all(
            uniqueIds.map(async (id) => {
              try {
                const data = await apiGetUser(id);
                const userData = data?.user ?? data?.users ?? data;
                return [id, userData];
              } catch (err) {
                console.warn("Failed to fetch user", id, err);
                return [id, null];
              }
            })
          );

          const userMap = fetchedUsers.reduce((acc, [id, u]) => {
            if (id != null) acc[id] = u;
            return acc;
          }, {});

          items = items.map((ord) => {
            const fetched = userMap[ord.user_id];
            if (!fetched) return ord;

            const nameCandidates = [
              fetched?.fullname,
              fetched?.email,
            ].filter(Boolean);

            return {
              ...ord,
              user: fetched,
              customer_name:
                nameCandidates[0] ??
                (ord.user_id != null ? `User ${ord.user_id}` : ord.customer_name),
            };
          });
        }
      }

      setRows(items);
      const derivedTotal = extractTotalRecords(res);
      setTotal(derivedTotal > 0 ? derivedTotal : items.length);

      if (Number.isFinite(metadata.page) && metadata.page !== page) {
        setPage(metadata.page);
      }
      if (Number.isFinite(metadata.limit) && metadata.limit !== limit) {
        setLimit(metadata.limit);
      }
    } catch (e) {
      console.error(e);
      setError(e?.message || "Failed to load orders");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, status, isAdmin, user?.user_id]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const onCancel = async (id) => {
    if (!window.confirm("Cancel this order? (only pending orders)")) return;
    try {
      await apiCancelOrder(id);
      await fetchOrders();
      await fetchSummary();
      alert("Order cancelled");
    } catch (e) {
      alert(e?.message || "Cancel order failed");
    }
  };

  const onUpdateStatus = async (id, nextStatus) => {
    try {
      await apiUpdateStatus(id, nextStatus);
      await fetchOrders();
      await fetchSummary();
      alert("Order updated");
    } catch (e) {
      alert(e?.message || "Update status failed");
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <main className="container mx-auto px-4 py-6 flex-1">

        <header className="mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold text-neutral-900">
              Order Management
            </h1>
          </div>
          <p className="mt-1 text-sm text-neutral-500">
            Manage orders, fulfillment, and shipping
          </p>
        </header>

        {/* summary cards */}
        <section className="mb-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {SUMMARY_CARD_CONFIG.map((card) => {
              const value = summaryCounts[card.key] ?? 0;
              const isClickable = card.filterValue !== undefined;
              const activeValue = card.filterValue ?? "";
              const isActive =
                isClickable && (status || "") === (activeValue || "");
              const CardTag = isClickable ? "button" : "div";
              const classNames = [
                "flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 text-left shadow-sm transition-all duration-200 ease-out",
              ];
              if (isClickable) {
                classNames.push(
                  "cursor-pointer hover:-translate-y-0.5 hover:border-neutral-900 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-neutral-900/30"
                );
              }
              if (isActive) {
                classNames.push("border-neutral-900 shadow-md");
              }
              if (summaryLoading) {
                classNames.push("opacity-80");
              }

              return (
                <CardTag
                  key={card.key}
                  type={isClickable ? "button" : undefined}
                  className={classNames.join(" ")}
                  onClick={
                    isClickable
                      ? () => {
                          setPage(1);
                          setStatus(card.filterValue ?? "");
                        }
                      : undefined
                  }
                >
                  <div className="border-b border-neutral-100 pb-3 text-sm font-medium text-neutral-500">
                    {card.label}
                  </div>
                  <div className="pt-4 text-3xl font-semibold text-neutral-900">
                    {summaryLoading
                      ? "..."
                      : Number(value).toLocaleString("vi-VN")}
                  </div>
                </CardTag>
              );
            })}
          </div>
          {summaryError ? (
            <div className="mt-2 text-sm text-red-600">{summaryError}</div>
          ) : null}
        </section>

        {/* filters */}
        <div className="flex items-center justify-between mb-4">
          <div />
          <div className="flex items-center gap-3">
            <select
              className="border rounded-full px-3 py-1.5"
              value={status}
              onChange={(e) => {
                setPage(1);
                setStatus(e.target.value);
              }}
            >
              <option value="">All status</option>
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <select
              className="border rounded-full px-3 py-1.5"
              value={limit}
              onChange={(e) => {
                setPage(1);
                setLimit(+e.target.value || 10);
              }}
            >
              {[10, 20, 50].map((n) => (
                <option key={n} value={n}>
                  {n}/page
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* table */}
        <div className="border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="p-3">Order #</th>
                <th className="p-3">Created</th>
                {isAdmin && <th className="p-3">Customer</th>}
                <th className="p-3">Address</th>
                <th className="p-3">Total</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading && !error ? (
                <tr>
                  <td className="p-6 text-center" colSpan={isAdmin ? 7 : 6}>
                    No orders.
                  </td>
                </tr>
              ) : loading ? (
                <tr>
                  <td className="p-6 text-center" colSpan={isAdmin ? 7 : 6}>
                    Loading…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td className="p-6 text-center text-red-600" colSpan={isAdmin ? 7 : 6}>
                    {error}
                  </td>
                </tr>
              ) : (
                rows.map((o) => {
                  const canUpdate = o.status !== "cancelled" && o.status !== "completed";
                  const canCancel = o.status === "pending";
                  const viewBtnClass = `${ACTION_BTN_BASE} hover:bg-gray-50`;
                  const updateBtnClass = `${ACTION_BTN_BASE} ${
                    canUpdate ? "hover:bg-gray-50" : DISABLED_BTN_STYLE
                  }`;
                  const cancelBtnClass = `${ACTION_BTN_BASE} ${
                    canCancel
                      ? "border-red-500 text-red-600 hover:bg-red-50"
                      : DISABLED_BTN_STYLE
                  }`;

                  return (
                    <tr key={o.order_id} className="border-t">
                      <td className="p-3 font-medium">#{o.order_id}</td>
                      <td className="p-3">{dayjs(o.created_at).format("YYYY-MM-DD HH:mm")}</td>
                      {isAdmin && <td className="p-3">{resolveCustomerName(o)}</td>}
                      <td className="p-3">{o.address || "-"}</td>
                      <td className="p-3">{(o.total_price ?? 0).toLocaleString()}₫</td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            STATUS_COLORS[o.status] || "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {o.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            className={viewBtnClass}
                            onClick={() => setDetailId(o.order_id)}
                          >
                            View
                          </button>
                          <button
                            className={updateBtnClass}
                            disabled={!canUpdate}
                            onClick={() => canUpdate && setUpdateId(o.order_id)}
                          >
                            Update
                          </button>
                          <button
                            className={cancelBtnClass}
                            disabled={!canCancel}
                            onClick={() => canCancel && onCancel(o.order_id)}
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* pagination */}
        <div className="mt-4 flex items-center justify-between text-sm">
          <div>
            Page <b>{page}</b> / <b>{Math.max(1, Math.ceil(total / limit))}</b> — {total} orders
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 px-3 rounded-full border disabled:opacity-50"
            >
              Prev
            </button>
            <button
              disabled={page >= Math.max(1, Math.ceil(total / limit))}
              onClick={() => setPage((p) => p + 1)}
              className="h-8 px-3 rounded-full border disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </main>


      {/* Modals */}
      {detailId != null && (
        <OrderDetailModal orderId={detailId} onClose={() => setDetailId(null)} />
      )}
      {updateId != null && (
        <UpdateOrderModal
          orderId={updateId}
          onClose={() => setUpdateId(null)}
          onSubmit={onUpdateStatus}
        />
      )}
    </div>
  );
}
